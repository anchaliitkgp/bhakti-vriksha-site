"use client";
import Link from "next/link";
import { useState } from "react";

const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/curriculum", label: "Curriculum" },
  { href: "/speakers", label: "Speakers" },
  { href: "/resources", label: "Resources" },
  { href: "/gallery", label: "Gallery" },
  { href: "/register", label: "Register" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-saffron-200">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link
          href="/"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
        >
          <span className="text-2xl" aria-hidden>ॐ</span>
          <div className="leading-tight">
            <div className="font-serif text-lg text-krishna-700 font-semibold">
              Bhakti Vriksha
            </div>
            <div className="text-[11px] uppercase tracking-widest text-saffron-700">
              Radha Madan Mohan
            </div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-gray-700 hover:text-krishna-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded px-1"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          className="md:hidden p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <span className="block w-6 h-0.5 bg-gray-700 mb-1" />
          <span className="block w-6 h-0.5 bg-gray-700 mb-1" />
          <span className="block w-6 h-0.5 bg-gray-700" />
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="md:hidden bg-white border-t border-saffron-100"
        >
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded py-1"
                onClick={() => setOpen(false)}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
