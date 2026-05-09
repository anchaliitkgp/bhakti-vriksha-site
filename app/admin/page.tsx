import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin · Bhakti Vriksha Radha Madan Mohan",
  description:
    "Organiser and manager tools for the Bhakti Vriksha Radha Madan Mohan Sunday program.",
  robots: { index: false, follow: false },
};

type Role = "guest" | "member" | "organiser" | "manager";

export default async function AdminPage() {
  // Defensive: middleware already blocks non-organiser/manager, but double-check.
  const session = await getServerSession(authOptions);
  const role = (session?.user?.role as Role | undefined) ?? "guest";

  if (!session?.user?.email) {
    redirect("/signin?callbackUrl=%2Fadmin");
  }
  if (role !== "organiser" && role !== "manager") {
    redirect("/member");
  }

  const roleLabel = role === "manager" ? "Website Manager" : "Organiser";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-12">
      {/* Header strip — same visual family as /member */}
      <section className="bg-gradient-to-br from-krishna-700 to-krishna-800 text-white rounded-2xl px-6 py-6 md:px-8 md:py-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-saffron-200 uppercase tracking-widest text-xs">
              Admin
            </div>
            <h1 className="font-serif text-2xl md:text-3xl mt-1">
              Admin tools coming soon
            </h1>
          </div>
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-krishna-600 text-white">
            {roleLabel}
          </span>
        </div>
      </section>

      {/* Intro */}
      <section className="mt-8">
        <p className="text-gray-700 max-w-2xl leading-relaxed">
          This is the Organiser &amp; Manager console. Today it&rsquo;s a
          placeholder — the tools below are scheduled for the next build weekend.
          The auth and role gating are already live, so adding each tool is a
          UI-only step from here.
        </p>
      </section>

      {/* Tools list */}
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-krishna-800">
          What will live here
        </h2>
        <div className="om-divider mt-2 mb-4" />
        <div className="grid sm:grid-cols-2 gap-4">
          <ToolCard
            emoji="📖"
            title="Curriculum editor"
            body="Organisers can edit any of the 32 sessions — topic, date, category, suggested speaker, and notes. Changes reflect on the public curriculum page."
          />
          <ToolCard
            emoji="📣"
            title="Announcement banner"
            body="Post a short announcement (max 280 chars) with a start and end date. Shows as a banner on the public home page during that window."
          />
          <ToolCard
            emoji="👥"
            title="Member roster + CSV export"
            body="View every signed-in family with their attendance count, first-seen and last-seen dates. Download as CSV for planning."
          />
          <ToolCard
            emoji="✅"
            title="Attendance view + mark-on-behalf"
            body="See who attended each Sunday. Mark attendance on behalf of a member up to 7 days after the session."
          />
        </div>
      </section>

      {/* Fallback note */}
      <section className="mt-10 bg-saffron-50 border border-saffron-200 rounded-2xl p-6">
        <div className="font-serif text-lg text-krishna-800">
          Need a change in the meantime?
        </div>
        <p className="mt-2 text-sm text-gray-700 leading-relaxed">
          For now, please ask <b>Anchal</b> for any curriculum edits,
          announcements, or roster questions. You can reach Anchal via the{" "}
          <Link
            href="/contact"
            className="text-krishna-700 underline underline-offset-4 hover:text-krishna-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
          >
            Contact page
          </Link>
          .
        </p>
      </section>

      {/* Quick links back */}
      <section className="mt-10 pt-6 border-t border-saffron-100">
        <div className="text-xs uppercase tracking-widest text-saffron-700 mb-2">
          Quick links
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link
            href="/member"
            className="text-krishna-700 underline underline-offset-4 hover:text-krishna-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
          >
            Member dashboard
          </Link>
          <span className="text-gray-300" aria-hidden>
            ·
          </span>
          <Link
            href="/curriculum"
            className="text-krishna-700 underline underline-offset-4 hover:text-krishna-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
          >
            Full curriculum
          </Link>
          <span className="text-gray-300" aria-hidden>
            ·
          </span>
          <Link
            href="/contact"
            className="text-krishna-700 underline underline-offset-4 hover:text-krishna-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
          >
            Contact
          </Link>
        </div>
      </section>
    </div>
  );
}

function ToolCard({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-white border border-saffron-100 rounded-2xl p-5 shadow-sm">
      <div className="text-2xl mb-2" aria-hidden>
        {emoji}
      </div>
      <div className="font-serif text-lg text-krishna-800">{title}</div>
      <p className="mt-2 text-sm text-gray-700 leading-relaxed">{body}</p>
    </div>
  );
}
