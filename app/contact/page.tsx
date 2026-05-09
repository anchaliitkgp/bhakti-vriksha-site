import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact · Bhakti Vriksha Radha Madan Mohan",
  description:
    "Get in touch to join the Sunday sanga, visit the venue in Horamavu, Bengaluru, or ask any question about the program.",
};

const VENUE_ADDRESS =
  "36, 5th A Cross, M.R. Riches Garden Layout, NRI Layout, Kalkere, Horamavu Post, Bengaluru, Karnataka 560016";
const VENUE_MAP_URL = "https://maps.app.goo.gl/Lhim9TWNC3HKUMQG9";

const COORDINATOR = {
  name: "HG Mahaprema Krishna Das",
  email: "mahendra.prajapat@gmail.com",
  phone: "+91 99001 70338",
  phoneDigits: "919900170338",
};

const IT_HELP = {
  name: "Anchal Nema",
  email: "anchaliitkgp@gmail.com",
  phone: "+91 78792 94160",
  phoneDigits: "917879294160",
};

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-krishna-800">Contact us</h1>
      <div className="om-divider mt-3 mb-8" />
      <p className="text-gray-700 mb-8 max-w-2xl">
        We&rsquo;d love to hear from you. Reach out to the coordinator below to
        join the Sunday program, visit the venue, or ask any question about the
        curriculum.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Program Coordinator */}
        <ContactCard
          label="Program Coordinator"
          name={COORDINATOR.name}
          note="For questions about joining, the weekly program, curriculum, or speaking."
          email={COORDINATOR.email}
          phone={COORDINATOR.phone}
          phoneDigits={COORDINATOR.phoneDigits}
          highlight
        />

        {/* Website / IT help */}
        <ContactCard
          label="Website / IT Help"
          name={IT_HELP.name}
          note="For website access issues, login problems, or technical questions."
          email={IT_HELP.email}
          phone={IT_HELP.phone}
          phoneDigits={IT_HELP.phoneDigits}
        />
      </div>

      {/* Venue */}
      <div className="mt-10 bg-white p-6 rounded-lg border border-saffron-100 shadow-sm">
        <div className="text-xs uppercase tracking-wider text-saffron-700 mb-1">
          Venue
        </div>
        <div className="font-serif text-xl text-krishna-800 mb-2">
          Sunday Program
        </div>
        <p className="text-gray-800 text-sm leading-relaxed mb-4">
          {VENUE_ADDRESS}
        </p>
        <a
          href={VENUE_MAP_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-saffron-500 text-krishna-900 font-semibold px-4 py-2 rounded-md hover:bg-saffron-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krishna-700"
        >
          <span aria-hidden>📍</span>
          Open in Google Maps
          <span aria-hidden>→</span>
        </a>
        <div className="mt-4 text-sm text-gray-700 space-y-1">
          <div>🕘 Sundays — timings shared on registration</div>
          <div>🚗 Parking available</div>
          <div>🍽️ Prasadam after every session</div>
        </div>
      </div>

      {/* WhatsApp group (placeholder until URL is provided) */}
      <div className="mt-10 p-6 bg-krishna-800 text-white rounded-lg">
        <div className="font-serif text-xl mb-2">Join our WhatsApp group</div>
        <p className="text-sm opacity-90 mb-4">
          Weekly reminders, verse-of-the-week, session highlights, and
          community announcements.
        </p>
        <p className="text-sm opacity-90">
          <b>Coming soon.</b> For now, please contact{" "}
          <a
            href={`https://wa.me/${COORDINATOR.phoneDigits}`}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-saffron-200"
          >
            {COORDINATOR.name} on WhatsApp
          </a>{" "}
          to be added to the group.
        </p>
      </div>
    </div>
  );
}

function ContactCard({
  label,
  name,
  note,
  email,
  phone,
  phoneDigits,
  highlight = false,
}: {
  label: string;
  name: string;
  note: string;
  email: string;
  phone: string;
  phoneDigits: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-6 rounded-lg shadow-sm border ${
        highlight
          ? "bg-saffron-50 border-saffron-200"
          : "bg-white border-saffron-100"
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-saffron-700 mb-1">
        {label}
      </div>
      <div className="font-serif text-xl text-krishna-800">{name}</div>
      <p className="mt-2 text-sm text-gray-700">{note}</p>
      <div className="mt-4 space-y-2 text-sm">
        <div>
          <span aria-hidden>📧 </span>
          <a
            href={`mailto:${email}`}
            className="text-krishna-700 underline hover:text-krishna-900"
          >
            {email}
          </a>
        </div>
        <div>
          <span aria-hidden>📞 </span>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="text-krishna-700 underline hover:text-krishna-900"
          >
            {phone}
          </a>
        </div>
        <div>
          <span aria-hidden>💬 </span>
          <a
            href={`https://wa.me/${phoneDigits}`}
            target="_blank"
            rel="noreferrer"
            className="text-krishna-700 underline hover:text-krishna-900"
          >
            WhatsApp {phone}
          </a>
        </div>
      </div>
    </div>
  );
}
