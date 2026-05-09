import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Registration pending · Bhakti Vriksha Radha Madan Mohan",
  description:
    "Your family registration is awaiting approval from the programme coordinator.",
};

export default function SignInPending() {
  return (
    <section className="min-h-[70vh] bg-gradient-to-b from-saffron-50 to-white">
      <div className="max-w-md mx-auto px-4 py-12 md:py-20">
        <div className="bg-white border border-saffron-200 rounded-2xl shadow-sm p-8 md:p-10 text-center">
          <div className="text-4xl" aria-hidden>
            🪔
          </div>
          <h1 className="mt-4 font-serif text-2xl md:text-3xl text-krishna-700">
            Your registration is pending
          </h1>
          <p className="mt-4 text-gray-700 leading-relaxed">
            Hare Krishna! Your family&apos;s registration is in the queue for
            review. An organiser will approve it shortly, and you&apos;ll be
            able to sign in right after.
          </p>

          <div className="mt-6 p-4 bg-krishna-50 border border-krishna-100 rounded-lg text-sm text-gray-700 text-left">
            <div className="font-semibold text-krishna-800 mb-1">
              Need this approved sooner?
            </div>
            <div>
              Contact the programme coordinator:
              <br />
              <span className="font-medium">HG Mahaprema Krishna Das</span>
              <br />
              <a
                href="mailto:mahendra.prajapat@gmail.com"
                className="text-krishna-700 underline hover:text-krishna-900"
              >
                mahendra.prajapat@gmail.com
              </a>
              <br />
              <a
                href="tel:+919900170338"
                className="text-krishna-700 underline hover:text-krishna-900"
              >
                +91 99001 70338
              </a>
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/"
              className="text-sm text-krishna-700 underline underline-offset-2 hover:text-krishna-900"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
