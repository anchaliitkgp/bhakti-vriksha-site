import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register · Bhakti Vriksha Radha Madan Mohan",
  description:
    "Register your family for the Sunday Bhakti Vriksha program. Free to join — contact HG Mahaprema Krishna Das to get started.",
};

// When the Google Form URL is available, swap the "Contact to register" section
// for an <iframe src={GOOGLE_FORM_URL} ... />. See README for details.
// const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/XXXX/viewform?embedded=true";

const COORDINATOR = {
  name: "HG Mahaprema Krishna Das",
  email: "mahendra.prajapat@gmail.com",
  phone: "+91 99001 70338",
  phoneDigits: "919900170338",
};

export default function Register() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-krishna-800">
        Register your family
      </h1>
      <div className="om-divider mt-3 mb-6" />
      <p className="text-gray-700 mb-6">
        We welcome married couples, parents with children, youth, and anyone
        seeking to bring the Bhagavad-gita into their daily lives. Registration
        is free.
      </p>

      <div className="bg-saffron-50 border border-saffron-200 rounded-lg p-6 mb-8">
        <h2 className="font-serif text-xl text-krishna-800 mb-3">
          How to join
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>
            Contact {COORDINATOR.name} on WhatsApp, phone, or email (details
            below)
          </li>
          <li>
            Share your family details — names and age of any children joining
          </li>
          <li>
            You&rsquo;ll receive the welcome message with this Sunday&rsquo;s
            session details and the venue
          </li>
        </ol>
      </div>

      <div className="bg-white border border-saffron-100 rounded-lg p-6 shadow-sm">
        <div className="text-xs uppercase tracking-wider text-saffron-700 mb-1">
          Contact to register
        </div>
        <div className="font-serif text-xl text-krishna-800 mb-2">
          {COORDINATOR.name}
        </div>
        <div className="space-y-2 text-sm mt-4">
          <div>
            <span aria-hidden>💬 </span>
            <a
              href={`https://wa.me/${COORDINATOR.phoneDigits}?text=${encodeURIComponent(
                "Hare Krishna. I'd like to register my family for the Bhakti Vriksha Sunday program.",
              )}`}
              target="_blank"
              rel="noreferrer"
              className="text-krishna-700 underline hover:text-krishna-900"
            >
              WhatsApp {COORDINATOR.phone}
            </a>
          </div>
          <div>
            <span aria-hidden>📞 </span>
            <a
              href={`tel:${COORDINATOR.phone.replace(/\s/g, "")}`}
              className="text-krishna-700 underline hover:text-krishna-900"
            >
              Call {COORDINATOR.phone}
            </a>
          </div>
          <div>
            <span aria-hidden>📧 </span>
            <a
              href={`mailto:${COORDINATOR.email}?subject=${encodeURIComponent(
                "Bhakti Vriksha — registration",
              )}`}
              className="text-krishna-700 underline hover:text-krishna-900"
            >
              {COORDINATOR.email}
            </a>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mt-6">
        We&rsquo;ll soon offer an online registration form. For now, a message
        on WhatsApp is the quickest way to join.
      </p>
    </div>
  );
}
