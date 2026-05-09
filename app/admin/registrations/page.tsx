import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { roleFor } from "@/lib/auth/roles";
import { supabaseServer } from "@/lib/supabase";
import FamilyQueueList, {
  type QueueFamily,
} from "@/components/FamilyQueueList";
import RegistrationTabs from "@/components/RegistrationTabs";

// `force-dynamic` + no-cache fetches mean every navigation, router.refresh(),
// and tab click produces a fresh DB read. Without it, sibling tabs can go
// stale after approve/reject/reopen actions (2026-05-09 bug fix).
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Family registrations · Bhakti Vriksha",
  description:
    "Organiser view of family registrations — approve, reject, and reopen.",
};

type Tab = "Pending" | "Approved" | "Rejected";

const VALID_TABS: Tab[] = ["Pending", "Approved", "Rejected"];

export default async function AdminRegistrations({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/signin?callbackUrl=/admin/registrations");

  const role = await roleFor(session.user.email);
  if (role !== "organiser" && role !== "manager") {
    redirect("/signin?callbackUrl=/admin/registrations");
  }

  const tabParam = (searchParams.tab ?? "").replace(/^./, (c) => c.toUpperCase());
  const tab: Tab = (VALID_TABS.includes(tabParam as Tab)
    ? tabParam
    : "Pending") as Tab;

  const supabase = supabaseServer();

  // Counts per tab (for tab labels)
  const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
    supabase.from("families").select("*", { count: "exact", head: true }).eq("status", "Pending"),
    supabase.from("families").select("*", { count: "exact", head: true }).eq("status", "Approved"),
    supabase.from("families").select("*", { count: "exact", head: true }).eq("status", "Rejected"),
  ]);

  // Fetch rows for the active tab
  const { data: families } = await supabase
    .from("families")
    .select("id, status, primary_email, submitted_at, version, rejection_reason")
    .eq("status", tab)
    .order("submitted_at", { ascending: false })
    .limit(50);

  // Augment with primary_given_name + member_count in batch
  const ids = (families ?? []).map((f) => f.id);
  const { data: members } =
    ids.length > 0
      ? await supabase
          .from("family_members")
          .select("family_id, kind, given_name")
          .in("family_id", ids)
      : { data: [] as any[] };

  const queue: QueueFamily[] = (families ?? []).map((f) => {
    const fms = (members ?? []).filter((m: any) => m.family_id === f.id);
    const primary = fms.find((m: any) => m.kind === "Primary");
    return {
      id: f.id,
      status: f.status as Tab,
      primary_email: f.primary_email,
      submitted_at: f.submitted_at,
      version: f.version,
      member_count: fms.length,
      primary_given_name: primary?.given_name ?? null,
      rejection_reason: f.rejection_reason ?? null,
    };
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-3xl text-krishna-800">
          Family registrations
        </h1>
        <Link
          href="/admin"
          className="text-xs text-krishna-700 underline underline-offset-2 hover:text-krishna-900"
        >
          ← Back to admin
        </Link>
      </div>
      <div className="om-divider mt-2 mb-5" />

      <RegistrationTabs
        active={tab}
        pending={pendingCount.count ?? 0}
        approved={approvedCount.count ?? 0}
        rejected={rejectedCount.count ?? 0}
      />

      <FamilyQueueList tab={tab} families={queue} />
    </div>
  );
}
