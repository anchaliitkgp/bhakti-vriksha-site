import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not registered yet · Bhakti Vriksha Radha Madan Mohan",
  description:
    "Register your family to join the Bhakti Vriksha Radha Madan Mohan programme and unlock member features.",
};

export default function SignInUnregistered() {
  return (
    <section className="min-h-[70vh] bg-gradient-to-b from-saffron-50 to-white">
      <div className="max-w-md mx-auto px-4 py-12 md:py-20">
        <div className="bg-white border border-saffron-200 rounded-2xl shadow-sm p-8 md:p-10 text-center">
          <div className="text-4xl" aria-hidden>
            🌱
          </div>
          <h1 className="mt-4 font-serif text-2xl md:text-3xl text-krishna-700">
            Looks like you haven&apos;t registered yet
          </h1>
          <p className="mt-4 text-gray-700 leading-relaxed">
            Hare Krishna! Access to members-only features — like marking
            attendance, the curriculum archive, and announcements — is for
            families who have registered for the Bhakti Vriksha programme.
            It takes a couple of minutes.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-saffron-600 hover:bg-saffron-700 text-white font-medium rounded-lg px-5 py-3 shadow-sm transition"
            >
              Register your family
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center border border-krishna-200 text-krishna-700 hover:bg-krishna-50 font-medium rounded-lg px-5 py-3 transition"
            >
              Learn about the programme
            </Link>
          </div>

          <div className="mt-6 p-4 bg-krishna-50 border border-krishna-100 rounded-lg text-sm text-gray-700 text-left">
            <div className="font-semibold text-krishna-800 mb-1">
              Questions?
            </div>
            <div>
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
