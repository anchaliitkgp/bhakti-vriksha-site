import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found · Bhakti Vriksha Radha Madan Mohan",
  description: "The page you are looking for could not be found.",
};

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-xl text-center">
        <div
          className="text-7xl md:text-9xl font-serif text-krishna-700 mb-4"
          aria-hidden
        >
          ॐ
        </div>
        <div className="text-sm uppercase tracking-widest text-saffron-700 mb-3">
          404 — Page not found
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-krishna-800 mb-4">
          We could not find that page
        </h1>
        <p className="text-gray-700 mb-8">
          The page you are looking for may have moved, been renamed, or never
          existed. Please return home and try again, or browse our 32-week
          curriculum.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="bg-krishna-700 text-white font-semibold px-5 py-3 rounded-md hover:bg-krishna-800 transition"
          >
            Home
          </Link>
          <Link
            href="/curriculum"
            className="border border-krishna-300 text-krishna-700 font-semibold px-5 py-3 rounded-md hover:bg-krishna-50 transition"
          >
            View curriculum
          </Link>
          <Link
            href="/contact"
            className="border border-krishna-300 text-krishna-700 font-semibold px-5 py-3 rounded-md hover:bg-krishna-50 transition"
          >
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
