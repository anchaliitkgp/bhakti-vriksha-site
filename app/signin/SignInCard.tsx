"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignInCard() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/member";

  return (
    <div className="bg-white border border-saffron-200 rounded-2xl shadow-sm p-8 md:p-10">
      <h1 className="font-serif text-2xl md:text-3xl text-krishna-700 text-center">
        Sign in to Bhakti Vriksha
      </h1>
      <p className="mt-4 text-gray-700 text-center leading-relaxed">
        Members can mark attendance for Sunday sessions and access members-only
        features like the curriculum archive and announcements.
      </p>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="inline-flex items-center gap-3 bg-white hover:bg-saffron-50 border border-gray-300 text-gray-800 font-medium rounded-lg px-5 py-3 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500"
        >
          {/* Google "G" mark */}
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 48 48"
            className="shrink-0"
          >
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.1 4 9.3 8.4 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.3 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.2 39.6 16 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.2 5.2c-.4.4 6.8-5 6.8-14.9 0-1.2-.1-2.4-.4-3.5z"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      <p className="mt-6 text-xs text-gray-500 text-center leading-relaxed">
        Access is limited to registered families. Please sign in with the Gmail
        account you registered with.
      </p>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-sm text-krishna-700 hover:text-krishna-800 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
