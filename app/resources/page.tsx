import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources · Bhakti Vriksha Radha Madan Mohan",
  description:
    "Curated reading and listening — Srila Prabhupada's books on Vedabase, HG Radheshyam Prabhu's newcomer courses, and Bhakti Vriksha study materials.",
};

const groups = [
  {
    title: "Srila Prabhupada's Books (Vedabase)",
    links: [
      { name: "Bhagavad-gita As It Is", href: "https://vedabase.io/en/library/bg/" },
      { name: "Srimad Bhagavatam", href: "https://vedabase.io/en/library/sb/" },
      { name: "Sri Caitanya-caritamrita", href: "https://vedabase.io/en/library/cc/" },
      { name: "Science of Self-Realization", href: "https://vedabase.io/en/library/ssr/" },
      { name: "Nectar of Instruction", href: "https://vedabase.io/en/library/noi/" },
    ],
  },
  {
    title: "HG Radheshyam Prabhu — Newcomer Courses",
    links: [
      { name: "Newcomers Home", href: "https://radheshyamdas.com/newcomers" },
      { name: "Fundamentals of Spirituality", href: "https://radheshyamdas.com/newcomers/fundamentals-of-spirituality" },
      { name: "GAME — Gita for All Made Easy", href: "https://radheshyamdas.com/newcomers/game-(gita-for-all-made-easy)-positive-thinker-course" },
      { name: "Applied Spirituality", href: "https://radheshyamdas.com/newcomers/applied-spirituality" },
      { name: "IITians Program", href: "https://radheshyamdas.com/newcomers/iitians-program" },
      { name: "Online Certified Courses", href: "https://courses.radheshyamdas.com/" },
    ],
  },
  {
    title: "Bhakti Vriksha Materials",
    links: [
      { name: "ISKCON Bhakti Vriksha Training Module (Book 1, PDF)", href: "https://iskconcongregation.com/wp-content/uploads/2018/11/Bhakti-Vriksha-Training-Module-Book-1_1.pdf" },
      { name: "ISKCON Mangalore — Bhakti Vriksha Level Structure", href: "https://iskconmangaluru.com/bhakti-vriksha/" },
    ],
  },
];

export default function Resources() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-krishna-800">Resources</h1>
      <div className="om-divider mt-3 mb-6" />
      <p className="text-gray-700 mb-10 max-w-3xl">
        A curated set of links and reading material for our sanga. Start with
        the Bhagavad-gita and grow from there. For deeper study, the Radheshyam
        Prabhu newcomer courses are excellent companions.
      </p>

      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="font-serif text-2xl text-krishna-800 mb-4">
              {g.title}
            </h2>
            <ul className="grid md:grid-cols-2 gap-3">
              {g.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block p-4 bg-white border border-saffron-100 rounded-lg hover:border-saffron-400 hover:shadow transition"
                  >
                    <span className="text-krishna-700 font-medium">{l.name}</span>
                    <span className="block text-xs text-gray-500 mt-1">
                      {l.href}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
