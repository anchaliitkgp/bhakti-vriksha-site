"use client";

// FamilyRegistrationForm — the single form used for both
//   - /register                (mode="create"):  anon POST → /api/family/register
//   - /member/family/edit      (mode="edit"):    PUT /api/family/[id]
//
// One component for one UX (design D15). The edit variant re-hydrates from
// `initialData`, locks the primary email (FR-10.3), and gates re-submit on
// a fresh consent tick only when the server flags the change as material
// (FR-10.8) — the client mirrors the check heuristically; the server remains
// authoritative.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import FamilyMemberBlock, {
  emptyMember,
  type MemberFormState,
} from "@/components/FamilyMemberBlock";
import ConsentGate from "@/components/ConsentGate";

const DRAFT_KEY = "bhakti.family.register.draft";
const DRAFT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface FamilyRegistrationFormProps {
  mode: "create" | "edit";
  /** Existing family snapshot for mode="edit". */
  initialData?: {
    familyId: string;
    version: number;
    primary: MemberFormState & { id: string };
    secondaries: (MemberFormState & { id: string })[];
  };
}

export default function FamilyRegistrationForm({
  mode,
  initialData,
}: FamilyRegistrationFormProps) {
  const [primary, setPrimary] = useState<MemberFormState>(
    initialData?.primary ?? emptyMember("primary")
  );
  // For edit mode we need to track the original member ids for PUT body shape.
  const [primaryId] = useState<string | undefined>(initialData?.primary.id);
  const [secondaries, setSecondaries] = useState<
    Array<MemberFormState & { id?: string; _op?: "keep" | "create" | "delete" }>
  >(
    (initialData?.secondaries ?? []).map((s) => ({
      ...s,
      _op: "keep",
    }))
  );
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const firstRender = useRef(true);

  // ─── Draft restore on mount (mode=create only) ─────────────────────────
  useEffect(() => {
    if (mode !== "create") return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        savedAt: number;
        primary: MemberFormState;
        secondaries: MemberFormState[];
      };
      if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        sessionStorage.removeItem(DRAFT_KEY);
        return;
      }
      setPrimary(parsed.primary);
      setSecondaries(parsed.secondaries.map((s) => ({ ...s })));
      setDraftRestored(true);
    } catch {
      // ignore; a bad draft shouldn't break the page
    }
  }, [mode]);

  // ─── Draft persist on every change (mode=create only) ──────────────────
  useEffect(() => {
    if (mode !== "create") return;
    // Skip the very first render after hydration if we just restored.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          primary,
          secondaries: secondaries.filter((s) => s._op !== "delete"),
        })
      );
    } catch {
      // quota full or private mode — silently ignore
    }
  }, [mode, primary, secondaries]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const addSecondary = useCallback(() => {
    setSecondaries((prev) => {
      // FR-02.7: max 15 live (non-deleted) secondaries
      const live = prev.filter((s) => s._op !== "delete");
      if (live.length >= 15) return prev;
      return [...prev, { ...emptyMember("secondary"), _op: "create" }];
    });
  }, []);

  const updateSecondary = useCallback(
    (idx: number, next: MemberFormState) =>
      setSecondaries((prev) =>
        prev.map((s, i) =>
          i === idx ? { ...next, id: s.id, _op: s._op ?? "keep" } : s
        )
      ),
    []
  );

  const removeSecondary = useCallback(
    (idx: number) =>
      setSecondaries((prev) =>
        prev.map((s, i) => {
          if (i !== idx) return s;
          // If it was just created locally, drop it entirely.
          if (s._op === "create" || !s.id) return null as any;
          // Otherwise mark it deleted so the edit-PUT picks it up.
          return { ...s, _op: "delete" };
        })
          .filter(Boolean)
      ),
    []
  );

  const liveSecondaries = useMemo(
    () => secondaries.filter((s) => s._op !== "delete"),
    [secondaries]
  );

  const canSubmit =
    consent &&
    !submitting &&
    !!primary.given_name &&
    !!primary.email &&
    !!primary.phone &&
    !!primary.age;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === "create") {
        const body = {
          primary: toApiMember(primary, "primary"),
          secondaries: liveSecondaries.map((s) => toApiMember(s, "secondary")),
          consent: true,
        };
        const res = await fetch("/api/family/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Registration failed (HTTP ${res.status})`);
        }
        const j = (await res.json()) as { familyId: string };
        sessionStorage.removeItem(DRAFT_KEY);
        setSubmitted(j.familyId);
        return;
      }

      // mode === "edit"
      if (!initialData) throw new Error("Edit mode requires initialData");
      const body = {
        expectedVersion: initialData.version,
        primary: { id: primaryId, ...toApiMember(primary, "primary") },
        secondaries: secondaries.map((s) => ({
          ...toApiMember(s, "secondary"),
          id: s.id,
          _op: s._op ?? (s.id ? "keep" : "create"),
        })),
        consent_if_material: consent,
      };
      const res = await fetch(`/api/family/${initialData.familyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (HTTP ${res.status})`);
      }
      setSubmitted(initialData.familyId);
    } catch (err: any) {
      setApiError(err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Confirmation screen ───────────────────────────────────────────────
  if (submitted && mode === "create") {
    return (
      <div className="bg-white border border-saffron-200 rounded-2xl shadow-sm p-8 md:p-10 text-center">
        <div className="text-4xl" aria-hidden>
          🌸
        </div>
        <h2 className="mt-3 font-serif text-2xl text-krishna-700">
          Hare Krishna! Your family is registered.
        </h2>
        <p className="mt-3 text-gray-700 leading-relaxed">
          An organiser will review and approve your registration shortly. Once
          approved, you&apos;ll be able to sign in and mark attendance for the
          Sunday sessions.
        </p>
        <div className="mt-6 p-4 bg-krishna-50 border border-krishna-100 rounded-lg text-sm text-gray-700 text-left">
          <div className="font-semibold text-krishna-800 mb-1">
            Programme coordinator
          </div>
          <div>
            <span className="font-medium">HG Mahaprema Krishna Das</span>
            <br />
            <a
              href="mailto:mahendra.prajapat@gmail.com"
              className="text-krishna-700 underline hover:text-krishna-900"
            >
              mahendra.prajapat@gmail.com
            </a>{" "}
            ·{" "}
            <a
              href="tel:+919900170338"
              className="text-krishna-700 underline hover:text-krishna-900"
            >
              +91 99001 70338
            </a>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="text-sm text-krishna-700 underline underline-offset-2 hover:text-krishna-900"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (submitted && mode === "edit") {
    return (
      <div className="bg-white border border-saffron-200 rounded-2xl shadow-sm p-8 md:p-10 text-center">
        <div className="text-4xl" aria-hidden>
          🙏
        </div>
        <h2 className="mt-3 font-serif text-2xl text-krishna-700">
          Family details saved.
        </h2>
        <p className="mt-3 text-gray-700">
          Your changes have been recorded.
        </p>
        <div className="mt-6">
          <Link
            href="/member"
            className="text-sm text-krishna-700 underline underline-offset-2"
          >
            ← Back to member dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ─── Form ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {draftRestored && (
        <div className="p-3 bg-saffron-50 border border-saffron-200 rounded-lg text-sm text-gray-700 flex items-center justify-between">
          <span>
            Draft restored from your last session. You can continue where you
            left off.
          </span>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(DRAFT_KEY);
              setPrimary(emptyMember("primary"));
              setSecondaries([]);
              setConsent(false);
              setDraftRestored(false);
            }}
            className="text-krishna-700 underline underline-offset-2 hover:text-krishna-900"
          >
            Clear draft
          </button>
        </div>
      )}

      <FamilyMemberBlock
        kind="primary"
        value={primary}
        onChange={setPrimary}
        emailLocked={mode === "edit"}
      />

      {liveSecondaries.map((s, i) => {
        // find the real index in `secondaries` (since deleted rows are kept)
        const realIdx = secondaries.findIndex(
          (item) => item === s
        );
        return (
          <FamilyMemberBlock
            key={realIdx}
            kind="secondary"
            value={s}
            onChange={(next) => updateSecondary(realIdx, next)}
            onRemove={() => removeSecondary(realIdx)}
            primaryEmail={primary.email}
            primaryPhone={primary.phone}
          />
        );
      })}

      <div className="pt-2">
        <button
          type="button"
          onClick={addSecondary}
          disabled={liveSecondaries.length >= 15}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-saffron-400 text-krishna-700 hover:bg-saffron-50 disabled:opacity-40"
        >
          <span aria-hidden>+</span> Add family member
        </button>
        {liveSecondaries.length >= 15 && (
          <p className="mt-2 text-xs text-gray-600">
            A family can include up to 15 additional members.
          </p>
        )}
      </div>

      <ConsentGate
        checked={consent}
        onChange={setConsent}
        label={
          mode === "edit"
            ? undefined // default copy; server will check material change
            : undefined
        }
      />

      {apiError && (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800"
        >
          {apiError}
        </div>
      )}

      <div className="pt-4 flex flex-wrap gap-3 items-center">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center bg-saffron-600 hover:bg-saffron-700 text-white font-medium rounded-lg px-6 py-3 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Submitting…"
            : mode === "create"
            ? "Submit registration"
            : "Save changes"}
        </button>
        {!consent && (
          <span className="text-xs text-gray-500">
            Tick the consent box above to enable submit.
          </span>
        )}
      </div>
    </form>
  );
}

// Convert form state → API shape. Applies the "same-as-primary" copy rule.
function toApiMember(
  s: MemberFormState,
  kind: "primary" | "secondary"
): any {
  const obj: Record<string, unknown> = {
    given_name: s.given_name.trim(),
    initiated: s.initiated,
    initiated_name: s.initiated ? s.initiated_name.trim() : null,
    age: Number(s.age),
    gender: s.gender,
    marital_status:
      Number(s.age) < 18 ? "Single" : s.marital_status,
    date_of_birth: s.date_of_birth || null,
    wedding_anniversary:
      s.marital_status === "Married" ? s.wedding_anniversary || null : null,
  };
  if (kind === "primary") {
    obj.email = s.email.trim().toLowerCase();
    obj.phone = s.phone.trim();
  } else {
    obj.relationship = s.relationship;
    obj.relationship_other =
      s.relationship === "Other" ? s.relationship_other.trim() : null;
    obj.email = s.same_email_as_primary ? null : s.email.trim().toLowerCase() || null;
    obj.phone = s.same_phone_as_primary ? null : s.phone.trim() || null;
  }
  return obj;
}
