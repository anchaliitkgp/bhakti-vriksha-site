import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Actual Schedule · Bhakti Vriksha Radha Madan Mohan",
  description:
    "The official schedule for Bhakti Vriksha Radha Madan Mohan. Released by HG Mahaprema Krishna Das. Updated weekly.",
};

// Placeholder: replaced with the real table once HG Mahaprema Prabhu
// publishes the official schedule. Intentionally minimal until then.
export default function ActualSchedule() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-krishna-800">Actual Schedule</h1>
      <div className="om-divider mt-3 mb-6" />

      <div className="p-6 border-l-4 border-krishna-500 bg-krishna-50 rounded">
        <p className="text-gray-800 leading-relaxed">
          The official Bhakti Vriksha schedule — speakers, topics, and Sunday
          dates — will be released by{" "}
          <strong className="font-semibold text-krishna-800">
            HG Mahaprema Krishna Das
          </strong>{" "}
          shortly. Once published, it will appear here and be updated each
          week as sessions progress.
        </p>
        <p className="text-gray-700 mt-3 text-sm">
          In the meantime, you can review the draft proposal on the{" "}
          <Link
            href="/curriculum"
            className="text-krishna-700 underline hover:text-krishna-900"
          >
            Proposed Curriculum
          </Link>{" "}
          page.
        </p>
      </div>

      <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg">
        <h2 className="font-serif text-xl text-krishna-800 mb-2">
          Stay connected
        </h2>
        <p className="text-sm text-gray-700">
          Join the WhatsApp group or reach out to the program coordinator for
          the latest updates — see the{" "}
          <Link
            href="/contact"
            className="text-krishna-700 underline hover:text-krishna-900"
          >
            Contact
          </Link>{" "}
          page.
        </p>
      </div>
    </div>
  );
}
