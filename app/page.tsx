import Link from "next/link";
import type { Metadata } from "next";
import { getNextSession } from "@/lib/sessions";

// Revalidate at most once per minute. Home stays fast (edge-cached HTML);
// schedule changes made via Supabase show up within 60s of saving.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Bhakti Vriksha Radha Madan Mohan · Sunday Family Sanga",
  description:
    "A 32-week journey through the Bhagavad-gita for families — every Sunday at Kalkere, Bengaluru. Kirtan, class, games, and prasadam for couples, youth, and kids.",
};

export default async function Home() {
  const next = await getNextSession();
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-krishna-800 via-krishna-700 to-saffron-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="text-saffron-200 tracking-widest uppercase text-xs md:text-sm">
            Bhakti Vriksha
          </div>
          <h1 className="font-serif text-4xl md:text-6xl font-semibold mt-2 leading-tight">
            Sri Sri Radha Madan Mohan
          </h1>
          <p className="mt-5 text-lg md:text-xl max-w-2xl opacity-90">
            A Sunday journey through the Bhagavad-gita for families — 32 weeks
            of chapter-by-chapter wisdom, chanting, Vaishnava culture, and joyful
            sanga for couples, youth, and kids.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="bg-white text-krishna-800 font-semibold px-5 py-3 rounded-md hover:bg-saffron-100 transition"
            >
              Register your family
            </Link>
            <Link
              href="/curriculum"
              className="border border-white/70 text-white px-5 py-3 rounded-md hover:bg-white/10 transition"
            >
              View proposed curriculum
            </Link>
          </div>
        </div>
      </section>

      {/* Darshan — Sri Sri Radha Madan Mohan */}
      <section className="relative overflow-hidden bg-gradient-to-b from-saffron-50 via-white to-saffron-50 border-b border-saffron-100">
        {/* Soft radial glow behind the altar */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(250,176,44,0.18),_transparent_60%)]"
        />
        <div className="relative max-w-5xl mx-auto px-4 py-14 md:py-20">
          <div className="text-center mb-6 md:mb-10">
            {/* ISKCON logo on desktop replaces the om divider */}
            <div className="hidden md:flex items-center justify-center">
              <img
                src="/iskcon-logo.png"
                alt="ISKCON logo"
                width={72}
                height={72}
                className="opacity-95 drop-shadow-[0_2px_6px_rgba(139,69,19,0.35)]"
              />
            </div>
            <div className="mt-3 text-xs md:text-sm uppercase tracking-[0.3em] text-saffron-700">
              Darshan
            </div>
            {/* Keep om-divider on mobile for balance */}
            <div className="om-divider mt-3 w-24 mx-auto md:hidden" />
          </div>

          <figure className="mx-auto max-w-3xl">
            {/* Ornate layered frame: gold gradient → inner navy bevel → photo */}
            <div className="relative p-[10px] md:p-[14px] rounded-[28px] bg-gradient-to-br from-[#f7d07a] via-[#c9912f] to-[#8b5e15] shadow-[0_20px_60px_-10px_rgba(139,69,19,0.5)]">
              {/* Decorative corner flourishes (desktop) */}
              <span aria-hidden className="hidden md:block absolute -top-2 -left-2 text-3xl text-saffron-600">✦</span>
              <span aria-hidden className="hidden md:block absolute -top-2 -right-2 text-3xl text-saffron-600">✦</span>
              <span aria-hidden className="hidden md:block absolute -bottom-2 -left-2 text-3xl text-saffron-600">✦</span>
              <span aria-hidden className="hidden md:block absolute -bottom-2 -right-2 text-3xl text-saffron-600">✦</span>

              <div className="relative rounded-[20px] p-1 bg-gradient-to-b from-krishna-900 to-krishna-800">
                <div className="relative rounded-[16px] overflow-hidden ring-1 ring-saffron-300/60">
                  <img
                    src="/radha-madan-mohan.jpg"
                    alt="Sri Sri Radha Madan Mohan — the worshipable Deities of our sanga, beautifully dressed and garlanded"
                    loading="eager"
                    className="w-full h-auto block"
                  />
                </div>
              </div>
            </div>

            <figcaption className="mt-6 text-center">
              <div className="font-serif text-2xl md:text-3xl text-krishna-800">
                Sri Sri Radha Madan Mohan
              </div>
              <div className="mt-1 text-sm md:text-base text-saffron-700 uppercase tracking-widest">
                Our beloved Lordships
              </div>
              <div className="mt-3 text-gray-600 text-sm md:text-base italic max-w-xl mx-auto">
                All glories to the eternal Divine Couple, the presiding Deities
                of our sanga.
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Our Lineage — Srila Prabhupada, HH Jayapataka Swami, HG Mahaprema Prabhu */}
      <section className="bg-white border-b border-saffron-100">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <div className="text-center mb-10">
            <div className="text-xs md:text-sm uppercase tracking-[0.3em] text-saffron-700">
              Our Lineage
            </div>
            <h2 className="mt-2 font-serif text-3xl md:text-4xl text-krishna-800">
              Rooted in parampara
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-gray-700 leading-relaxed">
              Our sanga is inspired by the teachings of Srila Prabhupada and
              the practical example of HH Jayapataka Swami Maharaja — and
              shaped day-to-day under the loving guidance of HG Mahaprema
              Krishna Das.
            </p>
          </div>

          <div className="grid gap-6 md:gap-8 md:grid-cols-3">
            <LineageCard
              img="/srila-prabhupada.jpg"
              name="Srila Prabhupada"
              honorific="HDG A.C. Bhaktivedanta Swami"
              role="Founder-Acharya, ISKCON"
              body="Our inspiration and siksha-guru. The Bhagavad-gita As It Is and Srimad-Bhagavatam — with their illuminating purports — are the foundation of every session."
            />
            <LineageCard
              img="/jayapataka-swami.jpg"
              name="HH Jayapataka Swami Maharaja"
              honorific="Disciple of Srila Prabhupada"
              role="Our Gurudeva"
              body="Our guiding light in preaching and family-centered Bhakti Vriksha programs. His dedication to Lord Chaitanya's mission shapes how we approach sanga and seva."
            />
            <LineageCard
              img="/mahaprema-prabhu.jpg"
              name="HG Mahaprema Krishna Das"
              honorific="Our Teacher"
              role="Backbone of the sanga"
              body="The heart of our Bhakti Vriksha program. Week after week, he teaches the Gita, shares his realizations, and lovingly shepherds each family on their journey home."
              featured
            />
          </div>
        </div>
      </section>

      {/* Next Sunday banner */}
      <section className="bg-saffron-50 border-y border-saffron-200">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-saffron-700">
              Next Sunday · Week {next.week}
            </div>
            <div className="font-serif text-xl text-krishna-800">
              {next.title}
            </div>
            <div className="text-sm text-gray-600">
              {new Date(next.date).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · Speaker: {next.suggestedSpeaker}
            </div>
          </div>
          <Link
            href="/curriculum"
            className="text-krishna-700 underline underline-offset-4 hover:text-krishna-900"
          >
            See proposed curriculum →
          </Link>
        </div>
      </section>

      {/* Pitch blocks */}
      <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-8">
        <Card
          emoji="📖"
          title="Gita chapter by chapter"
          body="18 chapters of the Bhagavad-gita taught across 24 sessions. Rooted in Srila Prabhupada's purports, brought to life for family situations."
        />
        <Card
          emoji="🪔"
          title="Vaishnava culture at home"
          body="One etiquette practice each week — from offering bhoga to home aarti to Tulasi seva. Your home becomes a place of bhakti."
        />
        <Card
          emoji="👨‍👩‍👧‍👦"
          title="For every age"
          body="Parallel tracks for kids, teens and adults. Games that sharpen the mind. Outings including goushala and Ahobilam pilgrimage."
        />
      </section>

      {/* Four pillars */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="font-serif text-3xl text-krishna-800">
            Four pillars of the program
          </h2>
          <div className="om-divider mt-3 mb-10" />
          <div className="grid md:grid-cols-2 gap-8">
            <Pillar
              num="1"
              title="Daily chanting"
              body="Progress from 1 → 4 → 8 rounds over six months. MMC-based chanting craft session to build quality japa."
            />
            <Pillar
              num="2"
              title="Scriptural foundation"
              body="Essential teachings of the Bhagavad-gita, with key verses memorized and practical applications for work, marriage, and parenting."
            />
            <Pillar
              num="3"
              title="Vaishnava etiquette"
              body="24 weekly etiquette practices across body, speech, food, home altar, and sanga culture."
            />
            <Pillar
              num="4"
              title="Bhakti Vriksha preparation"
              body="Structured progression through Shraddhavan → Sevaka → Sadhaka levels, graduating into active Bhakti Vriksha groups."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-krishna-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="font-serif text-3xl md:text-4xl">Join our sanga</h2>
          <p className="mt-3 max-w-2xl mx-auto opacity-90">
            Open to married couples, parents, youth, and kids. Every Sunday,
            90 minutes of kirtan, class, games, and prasadam together.
          </p>
          <Link
            href="/register"
            className="inline-block mt-6 bg-saffron-500 text-krishna-900 font-semibold px-6 py-3 rounded-md hover:bg-saffron-400 transition"
          >
            Register your family →
          </Link>
        </div>
      </section>
    </div>
  );
}

function Card({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="bg-white rounded-lg border border-saffron-100 p-6 shadow-sm">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-serif text-xl text-krishna-800 mb-2">{title}</h3>
      <p className="text-gray-700 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function Pillar({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-saffron-500 text-white font-bold flex items-center justify-center font-serif text-lg">
        {num}
      </div>
      <div>
        <h3 className="font-serif text-xl text-krishna-800">{title}</h3>
        <p className="mt-1 text-gray-700 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function LineageCard({
  img,
  name,
  honorific,
  role,
  body,
  featured = false,
}: {
  img: string;
  name: string;
  honorific: string;
  role: string;
  body: string;
  featured?: boolean;
}) {
  // Featured card gets a gold border, subtle scale, and saffron glow.
  const frameClass = featured
    ? "p-[4px] bg-gradient-to-br from-[#f7d07a] via-[#c9912f] to-[#8b5e15] shadow-[0_14px_40px_-10px_rgba(139,69,19,0.45)] md:scale-[1.02]"
    : "p-[2px] bg-gradient-to-br from-saffron-200 via-saffron-300 to-saffron-400 shadow-md";
  return (
    <figure
      className={`relative rounded-2xl ${frameClass} transition hover:shadow-lg`}
    >
      <div className="rounded-[14px] bg-white overflow-hidden h-full flex flex-col">
        <div className="relative aspect-[4/5] bg-krishna-50 overflow-hidden">
          <img
            src={img}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover object-top"
          />
          {featured && (
            <span className="absolute top-3 left-3 bg-saffron-500 text-krishna-900 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full shadow">
              Our Teacher
            </span>
          )}
        </div>
        <figcaption className="p-5 flex-1 flex flex-col">
          <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-saffron-700">
            {role}
          </div>
          <h3 className="mt-1 font-serif text-xl md:text-2xl text-krishna-800 leading-snug">
            {name}
          </h3>
          <div className="text-xs md:text-sm text-gray-500 italic">
            {honorific}
          </div>
          <p className="mt-3 text-sm text-gray-700 leading-relaxed">{body}</p>
        </figcaption>
      </div>
    </figure>
  );
}
