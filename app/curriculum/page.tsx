import type { Metadata } from "next";
import { getAllSessions } from "@/lib/sessions";

// Revalidate at most once per minute. Pages stay fast (edge-cached HTML);
// Organiser edits in Supabase (future) show up within 60s of saving.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Curriculum · Bhakti Vriksha Radha Madan Mohan",
  description:
    "The full 32-week curriculum — Bhagavad-gita chapter by chapter, plus practical sessions from HG Radheshyam Prabhu. Starts Sunday 31 May 2026.",
};

export default async function Curriculum() {
  const schedule = await getAllSessions();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-krishna-800">32-Week Curriculum</h1>
      <div className="om-divider mt-3 mb-6" />
      <p className="text-gray-700 mb-8 max-w-3xl">
        Every Sunday, 90 minutes together. Gita chapters are the backbone;
        every 4th Sunday is a practical session drawn from HG Radheshyam
        Prabhu&apos;s courses. Schedule starts Sunday 31 May 2026.
      </p>

      <div className="flex flex-wrap gap-3 mb-6 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-krishna-100 border border-krishna-300 inline-block" />
          Gita / Core
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-saffron-100 border border-saffron-400 inline-block" />
          Practical (HG Radheshyam Prabhu)
        </span>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-krishna-700 text-white">
            <tr>
              <th className="p-3 text-left">Week</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Topic</th>
              <th className="p-3 text-left">Suggested Speaker</th>
              <th className="p-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((s) => {
              const isPractical = s.category.startsWith("Practical");
              return (
                <tr
                  key={s.week}
                  className={isPractical ? "bg-saffron-50" : "bg-white"}
                >
                  <td className="p-3 font-semibold text-gray-700 border-t">
                    {s.week}
                  </td>
                  <td className="p-3 border-t whitespace-nowrap">
                    {new Date(s.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-3 border-t">
                    <div className="font-medium text-krishna-800">{s.title}</div>
                    {isPractical && (
                      <div className="text-xs uppercase tracking-wider text-saffron-700 mt-0.5">
                        Practical
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-t text-gray-700">
                    {s.suggestedSpeaker}
                    <div className="text-xs text-gray-500">
                      Level: {s.suggestedLevel}
                    </div>
                  </td>
                  <td className="p-3 border-t text-gray-600 text-xs">
                    {s.notes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
