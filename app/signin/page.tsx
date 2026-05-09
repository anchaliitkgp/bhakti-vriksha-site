import type { Metadata } from "next";
import { Suspense } from "react";
import SignInCard from "./SignInCard";

export const metadata: Metadata = {
  title: "Sign in · Bhakti Vriksha Radha Madan Mohan",
  description:
    "Sign in with Google to mark attendance and access members-only features of the Bhakti Vriksha Radha Madan Mohan program.",
};

export default function SignInPage() {
  return (
    <section className="min-h-[70vh] bg-gradient-to-b from-saffron-50 to-white">
      <div className="max-w-md mx-auto px-4 py-12 md:py-20">
        <Suspense
          fallback={
            <div className="bg-white border border-saffron-200 rounded-2xl p-8 text-center text-gray-500">
              Loading…
            </div>
          }
        >
          <SignInCard />
        </Suspense>
      </div>
    </section>
  );
}
