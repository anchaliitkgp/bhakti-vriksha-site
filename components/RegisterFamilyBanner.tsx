import Link from "next/link";

// RegisterFamilyBanner
// Shows on /member and /admin for any signed-in user who does NOT yet have
// a family row (families.primary_email = their email). Gently nudges them to
// register so their birthdays + wedding anniversaries are tracked by the
// programme for celebrations.
//
// Organisers and Managers (code-allowlisted) see this too — they retain
// their role regardless of family status; registering is purely additive for
// celebration + attendance features.

export default function RegisterFamilyBanner({
  kind,
}: {
  kind: "member" | "organiser";
}) {
  return (
    <div className="mt-6 p-4 border-l-4 border-saffron-500 bg-saffron-50 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden>
          🌸
        </div>
        <div className="flex-1 text-sm">
          <div className="font-serif text-base text-krishna-800">
            {kind === "organiser"
              ? "Register your family too"
              : "Celebrate with us"}
          </div>
          <p className="mt-1 text-gray-700 leading-relaxed">
            {kind === "organiser" ? (
              <>
                Even as an Organiser, please register your family once so we
                can celebrate birthdays, wedding anniversaries, and other
                important events together as a sanga. Your Organiser role will
                be preserved.
              </>
            ) : (
              <>
                Register your family so we can mark your Sunday attendance
                together and celebrate important life events like birthdays
                and anniversaries.
              </>
            )}
          </p>
          <Link
            href="/register"
            className="inline-block mt-3 text-sm bg-saffron-600 hover:bg-saffron-700 text-white font-medium rounded-md px-4 py-2"
          >
            Register your family →
          </Link>
        </div>
      </div>
    </div>
  );
}
