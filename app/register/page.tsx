import type { Metadata } from "next";
import Link from "next/link";
import FamilyRegistrationForm from "@/components/FamilyRegistrationForm";

export const metadata: Metadata = {
  title: "Register your family · Bhakti Vriksha Radha Madan Mohan",
  description:
    "Register your family for the Sunday Bhakti Vriksha Radha Madan Mohan programme. One form per family — primary member details, optional secondary members, and important life events.",
};

export default function Register() {
  return (
    <section className="bg-gradient-to-b from-saffron-50 to-white min-h-[80vh]">
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <h1 className="font-serif text-3xl md:text-4xl text-krishna-800">
          Register your family
        </h1>
        <div className="om-divider mt-3 mb-5" />
        <p className="text-gray-700 leading-relaxed max-w-2xl">
          One form per family. Fill in your own details as the primary member,
          then add your spouse, children, or anyone else who joins you on
          Sundays. Once an organiser approves, you&rsquo;ll be able to sign in
          and mark attendance together.
        </p>

        <div className="mt-6">
          <FamilyRegistrationForm mode="create" />
        </div>

        <p className="text-xs text-gray-500 mt-8">
          Already registered? Head to the{" "}
          <Link
            href="/signin"
            className="text-krishna-700 underline underline-offset-2"
          >
            Sign in
          </Link>{" "}
          page. Need help? See the{" "}
          <Link
            href="/contact"
            className="text-krishna-700 underline underline-offset-2"
          >
            Contact
          </Link>{" "}
          page.
        </p>
      </div>
    </section>
  );
}
