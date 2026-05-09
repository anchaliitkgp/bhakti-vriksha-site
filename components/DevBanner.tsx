// Renders a slim strip at the top of every page in non-production builds
// so you can see at a glance which Supabase project the site is talking to
// and catch misconfigured env files immediately.
// In production, this component renders nothing.

function extractProjectRef(url: string | undefined): string {
  if (!url) return "(no url)";
  if (url.startsWith("REPLACE_ME")) return "UNSET";
  try {
    const host = new URL(url).host;
    return host.split(".")[0];
  } catch {
    return "(invalid url)";
  }
}

export default function DevBanner() {
  if (process.env.NODE_ENV === "production") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ref = extractProjectRef(url);

  // Known prod project ref — loud warning if we accidentally loaded prod.
  const PROD_REF = "paeetsgehvhahaibmpsj";
  const isProdDb = ref === PROD_REF;
  const isUnset = ref === "UNSET" || ref === "(no url)" || ref === "(invalid url)";

  const bgClass = isUnset
    ? "bg-yellow-500 text-black"
    : isProdDb
    ? "bg-red-700 text-white"
    : "bg-red-600 text-white";

  const label = isUnset
    ? "⚠ DEV — Supabase env is UNSET"
    : isProdDb
    ? "⚠⚠ DEV SERVER IS CONNECTED TO PROD — be careful"
    : "DEV";

  return (
    <div
      role="status"
      aria-label="Development environment indicator"
      className={`w-full text-center text-xs font-mono py-1 px-2 ${bgClass}`}
    >
      {label} — Supabase: <span className="font-semibold">{ref}</span>
      {" · "}
      NODE_ENV: <span className="font-semibold">{process.env.NODE_ENV}</span>
    </div>
  );
}
