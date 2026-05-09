"use client";
import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

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

function firstName(name?: string | null, email?: string | null): string {
  if (name && name.trim().length > 0) return name.trim().split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return "Friend";
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  const isAuthed = status === "authenticated" && !!session?.user;
  const role = session?.user?.role;
  const canSeeAdmin = role === "organiser" || role === "manager";

  // Dynamic links (built from session state; not part of the static `nav` array).
  const dynamicLinks: { href: string; label: string }[] = [];
  if (isAuthed) dynamicLinks.push({ href: "/member", label: "Member" });
  if (isAuthed && canSeeAdmin)
    dynamicLinks.push({ href: "/admin", label: "Admin" });

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
          {dynamicLinks.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-gray-700 hover:text-krishna-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded px-1"
            >
              {n.label}
            </Link>
          ))}
          {status === "unauthenticated" && (
            <Link
              href="/signin"
              className="text-gray-700 hover:text-krishna-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded px-1"
            >
              Sign in
            </Link>
          )}
          {isAuthed && (
            <>
              <span className="text-gray-500 text-xs hidden lg:inline">
                Hi, {firstName(session.user.name, session.user.email)}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-gray-700 hover:text-krishna-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded px-1"
              >
                Sign out
              </button>
            </>
          )}
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
                className="text-gray-700 hover:text-krishna-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded py-1"
                onClick={() => setOpen(false)}
              >
                {n.label}
              </Link>
            ))}
            {dynamicLinks.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-gray-700 hover:text-krishna-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded py-1"
                onClick={() => setOpen(false)}
              >
                {n.label}
              </Link>
            ))}
            {status === "unauthenticated" && (
              <Link
                href="/signin"
                className="text-gray-700 hover:text-krishna-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded py-1"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            )}
            {isAuthed && (
              <>
                <span className="text-gray-500 text-xs py-1">
                  Hi, {firstName(session.user.name, session.user.email)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="text-left text-gray-700 hover:text-krishna-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded py-1"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
