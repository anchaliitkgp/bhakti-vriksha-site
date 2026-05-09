"use client";

// One member block — used twice on the form:
//   - kind="primary"   → collapsible-open by default; no relationship select
//   - kind="secondary" → collapsible (closed by default for 2..n); relationship
//                        select with free-text Other override, and the two
//                        "Same as primary" checkboxes for email + phone.
//
// All of the FR-02 / FR-03 field-level rules live here so both the /register
// and /member/family/edit flows share the same UX.

import { useEffect, useId, useRef, useState } from "react";
import {
  RELATIONSHIP,
  GENDER,
  MARITAL_STATUS,
} from "@/lib/family/validation";

export type MemberFormState = {
  given_name: string;
  initiated: boolean;
  initiated_name: string;
  age: string; // kept as string in form state; coerced at submit
  gender: "Male" | "Female" | "Other";
  marital_status: "Married" | "Single";
  relationship: (typeof RELATIONSHIP)[number];
  relationship_other: string;
  email: string;
  phone: string;
  date_of_birth: string;
  wedding_anniversary: string;
  /** Secondary only: mirror primary's email value when checked. */
  same_email_as_primary: boolean;
  /** Secondary only: mirror primary's phone value when checked. */
  same_phone_as_primary: boolean;
};

export function emptyMember(kind: "primary" | "secondary"): MemberFormState {
  return {
    given_name: "",
    initiated: false,
    initiated_name: "",
    age: "",
    gender: "Male",
    marital_status: "Single",
    relationship: kind === "primary" ? "Self" : "Spouse",
    relationship_other: "",
    email: "",
    phone: "",
    date_of_birth: "",
    wedding_anniversary: "",
    same_email_as_primary: false,
    same_phone_as_primary: false,
  };
}

export interface FamilyMemberBlockProps {
  kind: "primary" | "secondary";
  value: MemberFormState;
  onChange: (next: MemberFormState) => void;
  onRemove?: () => void; // secondary only
  primaryEmail?: string; // secondary only — shown when "Same as primary" is ticked
  primaryPhone?: string; // secondary only
  /** When mode="edit" and this member is the signed-in primary, email is read-only per FR-10.3 */
  emailLocked?: boolean;
  defaultOpen?: boolean;
  error?: string;
}

export default function FamilyMemberBlock({
  kind,
  value,
  onChange,
  onRemove,
  primaryEmail,
  primaryPhone,
  emailLocked,
  defaultOpen,
  error,
}: FamilyMemberBlockProps) {
  const blockId = useId();
  const [open, setOpen] = useState(
    defaultOpen ?? (kind === "primary" ? true : false)
  );
  const initiatedInputRef = useRef<HTMLInputElement | null>(null);

  // Age → marital_status lock (FR-02.5, FR-12.3)
  const ageNum = Number(value.age);
  const isMinor = Number.isFinite(ageNum) && ageNum < 18;
  useEffect(() => {
    if (isMinor && value.marital_status !== "Single") {
      onChange({ ...value, marital_status: "Single" });
    }
  }, [isMinor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initiated reveal → focus the initiated_name field
  useEffect(() => {
    if (value.initiated && initiatedInputRef.current) {
      initiatedInputRef.current.focus();
    }
  }, [value.initiated]);

  // DOB / age mismatch warning (FR-03.6)
  const dobWarning = (() => {
    if (!value.date_of_birth || !Number.isFinite(ageNum)) return null;
    const y = Number(value.date_of_birth.slice(0, 4));
    if (!Number.isFinite(y)) return null;
    const approxAge = new Date().getFullYear() - y;
    if (Math.abs(approxAge - ageNum) > 1) {
      return `The age (${ageNum}) and date of birth (${value.date_of_birth}) don't look consistent. Please double-check.`;
    }
    return null;
  })();

  const relOther = value.relationship === "Other";
  const isMarried = value.marital_status === "Married";

  const set = <K extends keyof MemberFormState>(
    key: K,
    next: MemberFormState[K]
  ) => onChange({ ...value, [key]: next });

  // Summary line for collapsed secondaries: "Spouse · Priya · age 38"
  const summary =
    kind === "primary"
      ? `Your details${value.given_name ? ` — ${value.given_name}` : ""}`
      : `${relOther && value.relationship_other ? value.relationship_other : value.relationship}${
          value.given_name ? ` · ${value.given_name}` : ""
        }${value.age ? ` · age ${value.age}` : ""}`;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className={`border rounded-xl mt-4 ${
        error ? "border-rose-300 bg-rose-50/30" : "border-saffron-200 bg-white"
      }`}
    >
      <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${
              kind === "primary"
                ? "bg-krishna-50 border-krishna-300 text-krishna-800"
                : "bg-saffron-50 border-saffron-300 text-saffron-800"
            }`}
          >
            {kind === "primary" ? "Primary" : "Family member"}
          </span>
          <span className="text-gray-800 font-medium">{summary}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {kind === "secondary" && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm("Remove this family member from the form?")) {
                  onRemove();
                }
              }}
              className="text-rose-700 hover:text-rose-900 underline underline-offset-2"
              aria-label="Remove this family member"
            >
              Remove
            </button>
          )}
          <span aria-hidden>{open ? "▴" : "▾"}</span>
        </div>
      </summary>

      <div className="px-4 pb-5 pt-1 border-t border-saffron-100 space-y-4">
        {/* Name + initiated */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-800">Name</span>
            <input
              type="text"
              required
              value={value.given_name}
              onChange={(e) => set("given_name", e.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500"
              placeholder="As you'd like it printed"
              maxLength={120}
            />
          </label>

          <div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-800 mt-6">
              <input
                type="checkbox"
                checked={value.initiated}
                onChange={(e) => set("initiated", e.target.checked)}
                className="w-4 h-4 text-krishna-600 rounded"
                aria-expanded={value.initiated}
                aria-controls={`${blockId}-initiated-name`}
              />
              Initiated devotee
            </label>

            {value.initiated && (
              <label
                id={`${blockId}-initiated-name`}
                className="block mt-2"
              >
                <span className="text-sm font-medium text-gray-800">
                  Initiated name
                </span>
                <input
                  ref={initiatedInputRef}
                  type="text"
                  required
                  value={value.initiated_name}
                  onChange={(e) => set("initiated_name", e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500"
                  maxLength={120}
                  placeholder="e.g. Rasaraj Das"
                />
              </label>
            )}
          </div>
        </div>

        {/* Relationship (secondary only) */}
        {kind === "secondary" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-800">
                Relationship to Primary
              </span>
              <select
                value={value.relationship}
                onChange={(e) =>
                  set(
                    "relationship",
                    e.target.value as MemberFormState["relationship"]
                  )
                }
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500"
              >
                {RELATIONSHIP.filter((r) => r !== "Self").map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            {relOther && (
              <label className="block">
                <span className="text-sm font-medium text-gray-800">
                  Please specify
                </span>
                <input
                  type="text"
                  required
                  value={value.relationship_other}
                  onChange={(e) =>
                    set("relationship_other", e.target.value)
                  }
                  maxLength={40}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500"
                  placeholder="e.g. Uncle, Nephew, Aunt"
                />
              </label>
            )}
          </div>
        )}

        {/* Age, gender, marital */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-800">Age</span>
            <input
              type="number"
              required
              min={0}
              max={120}
              value={value.age}
              onChange={(e) => set("age", e.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-800">Gender</span>
            <select
              value={value.gender}
              onChange={(e) =>
                set("gender", e.target.value as MemberFormState["gender"])
              }
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500"
            >
              {GENDER.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-800">
              Marital status
            </span>
            <select
              value={value.marital_status}
              onChange={(e) =>
                set(
                  "marital_status",
                  e.target.value as MemberFormState["marital_status"]
                )
              }
              disabled={isMinor}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 disabled:bg-gray-100"
              aria-describedby={isMinor ? `${blockId}-minor-note` : undefined}
            >
              {MARITAL_STATUS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            {isMinor && (
              <p
                id={`${blockId}-minor-note`}
                className="mt-1 text-xs text-gray-500"
                aria-live="polite"
              >
                Marital status is set to Single for members under 18.
              </p>
            )}
          </label>
        </div>

        {/* Email + phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block">
              <span className="text-sm font-medium text-gray-800">
                Email {kind === "primary" && <span className="text-rose-600">*</span>}
                {kind === "secondary" && (
                  <span className="text-gray-500"> (optional)</span>
                )}
              </span>
              <input
                type="email"
                required={kind === "primary"}
                value={
                  kind === "secondary" && value.same_email_as_primary
                    ? primaryEmail ?? ""
                    : value.email
                }
                onChange={(e) => set("email", e.target.value)}
                disabled={
                  (kind === "secondary" && value.same_email_as_primary) ||
                  emailLocked
                }
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 disabled:bg-gray-100"
                placeholder="you@gmail.com"
              />
            </label>
            {emailLocked && kind === "primary" && (
              <p className="mt-1 text-xs text-gray-500">
                The primary email cannot be changed after registration.
              </p>
            )}
            {kind === "secondary" && (
              <label className="inline-flex items-center gap-2 mt-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={value.same_email_as_primary}
                  onChange={(e) =>
                    set("same_email_as_primary", e.target.checked)
                  }
                  className="w-4 h-4 text-krishna-600 rounded"
                />
                Same email as Primary
              </label>
            )}
          </div>

          <div>
            <label className="block">
              <span className="text-sm font-medium text-gray-800">
                Phone {kind === "primary" && <span className="text-rose-600">*</span>}
                {kind === "secondary" && (
                  <span className="text-gray-500"> (optional)</span>
                )}
              </span>
              <input
                type="tel"
                required={kind === "primary"}
                value={
                  kind === "secondary" && value.same_phone_as_primary
                    ? primaryPhone ?? ""
                    : value.phone
                }
                onChange={(e) => set("phone", e.target.value)}
                disabled={kind === "secondary" && value.same_phone_as_primary}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 disabled:bg-gray-100"
                placeholder="+91 …"
                maxLength={40}
              />
            </label>
            {kind === "secondary" && (
              <label className="inline-flex items-center gap-2 mt-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={value.same_phone_as_primary}
                  onChange={(e) =>
                    set("same_phone_as_primary", e.target.checked)
                  }
                  className="w-4 h-4 text-krishna-600 rounded"
                />
                Same phone as Primary
              </label>
            )}
          </div>
        </div>

        {/* Life events — DOB + anniversary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-800">
              Date of birth <span className="text-gray-500">(optional)</span>
            </span>
            <input
              type="date"
              value={value.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500"
            />
            {dobWarning && (
              <p className="mt-1 text-xs text-amber-700" role="status">
                {dobWarning}
              </p>
            )}
          </label>
          {isMarried && (
            <label className="block">
              <span className="text-sm font-medium text-gray-800">
                Wedding anniversary{" "}
                <span className="text-gray-500">(optional)</span>
              </span>
              <input
                type="date"
                value={value.wedding_anniversary}
                onChange={(e) => set("wedding_anniversary", e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500"
              />
            </label>
          )}
        </div>

        {error && (
          <p className="text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
