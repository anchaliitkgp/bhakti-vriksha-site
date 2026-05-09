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
      <section className="bg-gradient-to-b from-saffron-50 via-white to-saffron-50 border-b border-saffron-100">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center mb-6 md:mb-8">
            <div className="text-xs md:text-sm uppercase tracking-[0.25em] text-saffron-700">
              Darshan
            </div>
            <div className="om-divider mt-2 w-24 mx-auto" />
          </div>
          <figure className="mx-auto max-w-3xl">
            <div className="relative rounded-2xl overflow-hidden border-4 border-saffron-200 shadow-xl ring-1 ring-krishna-200/40 bg-krishna-900">
              {/* Place the photo at /public/radha-madan-mohan.jpg */}
              <img
                src="/radha-madan-mohan.jpg"
                alt="Sri Sri Radha Madan Mohan — the worshipable Deities of our sanga, beautifully dressed and garlanded"
                loading="eager"
                className="w-full h-auto block"
              />
            </div>
            <figcaption className="mt-5 text-center">
              <div className="font-serif text-2xl md:text-3xl text-krishna-800">
                Sri Sri Radha Madan Mohan
              </div>
              <div className="mt-1 text-sm md:text-base text-saffron-700 uppercase tracking-widest">
                Our beloved Lordships
              </div>
              <div className="mt-3 text-gray-600 text-sm italic max-w-xl mx-auto">
                All glories to the eternal Divine Couple, the presiding Deities
                of our sanga.
              </div>
            </figcaption>
          </figure>
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
