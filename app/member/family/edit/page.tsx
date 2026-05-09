import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { roleFor } from "@/lib/auth/roles";
import { supabaseServer } from "@/lib/supabase";
import FamilyRegistrationForm from "@/components/FamilyRegistrationForm";
import type { MemberFormState } from "@/components/FamilyMemberBlock";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit your family · Bhakti Vriksha",
  robots: { index: false, follow: false },
};

export default async function EditFamilyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/signin?callbackUrl=/member/family/edit");

  const email = session.user.email.toLowerCase();
  const role = await roleFor(email);

  const supabase = supabaseServer();

  const { data: family } = await supabase
    .from("families")
    .select("id, version, primary_email, status")
    .eq("primary_email", email)
    .maybeSingle();

  if (!family) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-serif text-2xl text-krishna-800">
          No family found
        </h1>
        <p className="mt-3 text-gray-700">
          Editing a family is available to the Primary member of a registered
          family. Please{" "}
          <Link
            href="/register"
            className="text-krishna-700 underline underline-offset-2"
          >
            register here
          </Link>{" "}
          if you haven&apos;t already.
        </p>
      </section>
    );
  }

  // Extra guard — only the Primary can edit in Phase 1 (organiser/manager
  // can also reach here, but we give primaries the normal edit path). The
  // PUT endpoint enforces the stricter rule.
  const isPrimary = family.primary_email.toLowerCase() === email;
  if (!isPrimary && role !== "organiser" && role !== "manager") {
    redirect("/member");
  }

  const { data: members } = await supabase
    .from("family_members")
    .select(
      "id, kind, given_name, initiated, initiated_name, relationship, relationship_other, age, gender, marital_status, email, phone"
    )
    .eq("family_id", family.id);

  const { data: events } = await supabase
    .from("family_events")
    .select("family_member_id, kind, event_date")
    .in("family_member_id", (members ?? []).map((m: any) => m.id));

  const eventByMember = new Map<
    string,
    { dob: string; ann: string }
  >();
  for (const m of members ?? []) {
    eventByMember.set(m.id, { dob: "", ann: "" });
  }
  for (const e of events ?? []) {
    const slot = eventByMember.get(e.family_member_id);
    if (!slot) continue;
    if (e.kind === "DateOfBirth") slot.dob = e.event_date;
    if (e.kind === "WeddingAnniversary") slot.ann = e.event_date;
  }

  const toForm = (m: any): MemberFormState & { id: string } => ({
    id: m.id,
    given_name: m.given_name,
    initiated: !!m.initiated,
    initiated_name: m.initiated_name ?? "",
    age: String(m.age),
    gender: m.gender,
    marital_status: m.marital_status,
    relationship: m.relationship,
    relationship_other: m.relationship_other ?? "",
    email: m.email ?? "",
    phone: m.phone ?? "",
    date_of_birth: eventByMember.get(m.id)?.dob ?? "",
    wedding_anniversary: eventByMember.get(m.id)?.ann ?? "",
    same_email_as_primary: false,
    same_phone_as_primary: false,
  });

  const primary = (members ?? []).find((m: any) => m.kind === "Primary");
  if (!primary) redirect("/member"); // shouldn't happen

  const initialData = {
    familyId: family.id,
    version: family.version,
    primary: toForm(primary),
    secondaries: (members ?? [])
      .filter((m: any) => m.kind === "Secondary")
      .map(toForm),
  };

  return (
    <section className="bg-gradient-to-b from-saffron-50 to-white min-h-[80vh]">
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-serif text-3xl md:text-4xl text-krishna-800">
            Edit your family
          </h1>
          <Link
            href="/member"
            className="text-xs text-krishna-700 underline underline-offset-2 hover:text-krishna-900"
          >
            ← Back to dashboard
          </Link>
        </div>
        <div className="om-divider mt-3 mb-5" />

        {family.status !== "Approved" && (
          <div className="mb-6 p-4 border-l-4 border-saffron-500 bg-saffron-50 rounded text-sm text-gray-800">
            Your family&rsquo;s current status is{" "}
            <b>{family.status}</b>. Edits are saved but will still require
            organiser approval to take effect.
          </div>
        )}

        <FamilyRegistrationForm mode="edit" initialData={initialData} />
      </div>
    </section>
  );
}
