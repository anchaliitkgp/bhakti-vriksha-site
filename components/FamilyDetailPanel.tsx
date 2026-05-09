// Read-only rendering of a family + recent audit log rows. Used in the
// /admin/registrations detail expansion. Server component — no client
// interactivity needed.

import type { ReactNode } from "react";

export type FamilyDetail = {
  id: string;
  status: "Pending" | "Approved" | "Rejected";
  primary_email: string;
  submitted_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  version: number;
  members: Array<{
    id: string;
    kind: "Primary" | "Secondary";
    given_name: string;
    initiated: boolean;
    initiated_name: string | null;
    relationship: string;
    relationship_other: string | null;
    age: number;
    gender: string;
    marital_status: string;
    email: string | null;
    phone: string | null;
  }>;
  events: Array<{
    family_member_id: string;
    kind: "DateOfBirth" | "WeddingAnniversary";
    event_date: string;
  }>;
  audit: Array<{
    actor_email: string;
    actor_role: string;
    action: string;
    diff: unknown;
    note: string | null;
    occurred_at: string;
  }>;
};

export default function FamilyDetailPanel({
  family,
}: {
  family: FamilyDetail;
}) {
  const primary = family.members.find((m) => m.kind === "Primary");
  const secondaries = family.members.filter((m) => m.kind === "Secondary");
  const eventsByMember = new Map<string, { dob?: string; ann?: string }>();
  for (const e of family.events) {
    const slot = eventsByMember.get(e.family_member_id) ?? {};
    if (e.kind === "DateOfBirth") slot.dob = e.event_date;
    if (e.kind === "WeddingAnniversary") slot.ann = e.event_date;
    eventsByMember.set(e.family_member_id, slot);
  }

  return (
    <div className="p-4 border-t border-saffron-100 bg-saffron-50/40 space-y-6">
      {/* Members */}
      <section>
        <h3 className="text-sm font-semibold text-krishna-800 mb-2">
          Members
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {primary && (
            <MemberCard
              badge="Primary"
              m={primary}
              events={eventsByMember.get(primary.id)}
            />
          )}
          {secondaries.map((m) => (
            <MemberCard
              key={m.id}
              badge={m.relationship}
              m={m}
              events={eventsByMember.get(m.id)}
            />
          ))}
        </div>
      </section>

      {/* Audit log */}
      <section>
        <h3 className="text-sm font-semibold text-krishna-800 mb-2">
          History
        </h3>
        {family.audit.length === 0 ? (
          <p className="text-xs text-gray-500">No audit entries yet.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {family.audit.map((a, i) => (
              <li
                key={i}
                className="p-2 bg-white rounded border border-gray-200"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-krishna-800">
                    {formatAction(a.action)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(a.occurred_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  by {a.actor_email} ({a.actor_role})
                </div>
                {a.note && (
                  <div className="mt-1 text-xs text-gray-700">
                    <em>Note:</em> {a.note}
                  </div>
                )}
                <DiffSummary diff={a.diff} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function MemberCard({
  badge,
  m,
  events,
}: {
  badge: string;
  m: FamilyDetail["members"][number];
  events?: { dob?: string; ann?: string };
}) {
  const display =
    m.initiated && m.initiated_name ? m.initiated_name : m.given_name;
  return (
    <div className="p-3 bg-white rounded border border-gray-200">
      <div className="flex items-center gap-2">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
          {badge === "Other" && m.relationship_other
            ? m.relationship_other
            : badge}
        </span>
      </div>
      <div className="font-medium text-gray-900 mt-1">
        {display}
        {m.initiated && m.initiated_name && (
          <span className="text-xs text-gray-500 ml-2">
            (civil: {m.given_name})
          </span>
        )}
      </div>
      <div className="text-xs text-gray-600 mt-0.5">
        {m.gender} · age {m.age} · {m.marital_status}
      </div>
      {(m.email || m.phone) && (
        <div className="text-xs text-gray-600 mt-1 break-all">
          {m.email && <span>📧 {m.email} </span>}
          {m.phone && <span>📞 {m.phone}</span>}
        </div>
      )}
      {(events?.dob || events?.ann) && (
        <div className="text-xs text-gray-500 mt-1">
          {events.dob && <span>DOB {events.dob} </span>}
          {events.ann && <span>· Anniv {events.ann}</span>}
        </div>
      )}
    </div>
  );
}

function formatAction(a: string): string {
  switch (a) {
    case "Create":
      return "Registered";
    case "Approve":
      return "Approved";
    case "Reject":
      return "Rejected";
    case "Reopen":
      return "Reopened";
    case "Edit":
      return "Edited";
    case "Delete":
      return "Deleted";
    default:
      return a;
  }
}

function DiffSummary({ diff }: { diff: unknown }): ReactNode {
  if (!diff || typeof diff !== "object") return null;
  const d = diff as any;

  const parts: string[] = [];
  if (d.status?.from && d.status?.to) {
    parts.push(`${d.status.from} → ${d.status.to}`);
  }
  if (Array.isArray(d.added) && d.added.length > 0) {
    parts.push(`added ${d.added.length} member${d.added.length === 1 ? "" : "s"}`);
  }
  if (Array.isArray(d.removed) && d.removed.length > 0) {
    parts.push(
      `removed ${d.removed.length} member${d.removed.length === 1 ? "" : "s"}`
    );
  }
  if (Array.isArray(d.changed) && d.changed.length > 0) {
    parts.push(`changed ${d.changed.length} field${d.changed.length === 1 ? "" : "s"}`);
  }

  if (parts.length === 0) return null;
  return (
    <div className="mt-1 text-xs text-gray-700">
      {parts.join(" · ")}
    </div>
  );
}
