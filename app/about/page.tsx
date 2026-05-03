export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-krishna-800">About the Program</h1>
      <div className="om-divider mt-3 mb-8" />

      <section className="prose prose-lg max-w-none">
        <p className="text-lg text-gray-800 leading-relaxed">
          Bhakti Vriksha Radha Madan Mohan is a weekly sanga for married couples
          with children, youth, and kids who want to bring the teachings of the
          Bhagavad-gita into their daily lives — and eventually, to advance
          together through the ISKCON Bhakti Vriksha progression.
        </p>

        <h2 className="font-serif text-2xl text-krishna-800 mt-10 mb-3">
          What is Bhakti Vriksha?
        </h2>
        <p>
          In Sri Caitanya-caritamrita, Lord Caitanya and His movement are
          compared to the tree of devotion — the <em>bhakti-vriksha</em>. Srila
          Prabhupada writes that the tree surrounds the entire world, and the
          flowers of that tree are to be distributed to everyone. Bhakti Vriksha
          as a program is the practical expression of that vision: small weekly
          groups where families chant, study, serve, and grow together.
        </p>

        <h2 className="font-serif text-2xl text-krishna-800 mt-10 mb-3">
          Our 32-week journey
        </h2>
        <p>
          Starting Sunday 31 May 2026, our weekly 90-minute program covers the
          Bhagavad-gita chapter by chapter, with every 4th Sunday dedicated to a
          practical session from HG Radheshyam Prabhu&apos;s newcomer courses on
          habits, relationships, overcoming bad habits, faith, and more.
        </p>

        <h2 className="font-serif text-2xl text-krishna-800 mt-10 mb-3">Our teachers</h2>

        <div className="bg-saffron-50 border-l-4 border-saffron-500 p-5 rounded my-4 not-prose">
          <div className="font-serif text-xl text-krishna-800">
            HG Mahaprema Krishna Das
          </div>
          <div className="text-sm text-saffron-700 uppercase tracking-wider mb-2">
            Senior Teacher
          </div>
          <p className="text-gray-700">
            Our senior-most teacher and most well-learned devotee in Bhagavad-gita.
            Leads the majority of Gita chapter sessions, deep philosophical topics,
            and the practical sessions on commitment and doubt-resolution.
          </p>
        </div>

        <div className="bg-saffron-50 border-l-4 border-saffron-500 p-5 rounded my-4 not-prose">
          <div className="font-serif text-xl text-krishna-800">
            HG Vrajeshwari Vinita Devi Dasi
          </div>
          <div className="text-sm text-saffron-700 uppercase tracking-wider mb-2">
            Program &amp; Youth Lead
          </div>
          <p className="text-gray-700">
            Excellent at planning and training kids and youth. Leads kids-focused
            sessions, youth talks, the Behavioral Science / relationships module,
            home altar workshops, and retreat planning.
          </p>
        </div>

        <h2 className="font-serif text-2xl text-krishna-800 mt-10 mb-3">
          Who can join?
        </h2>
        <ul>
          <li>Married couples wanting to practice Krishna consciousness together</li>
          <li>Parents wanting to bring up children with Vaishnava values</li>
          <li>Youth and teens looking for direction and purpose</li>
          <li>Kids (6–12) — we have a parallel kids&apos; track with stories, crafts, and games</li>
          <li>Newcomers welcome — no prior study required</li>
        </ul>

        <h2 className="font-serif text-2xl text-krishna-800 mt-10 mb-3">
          What to expect each Sunday
        </h2>
        <ol>
          <li>Arrival kirtan &amp; japa (10 min)</li>
          <li>Welcome and Vaishnava etiquette tip of the week (5 min)</li>
          <li>Main Gita / Practical class (30 min)</li>
          <li>Parallel groups — adults, teens, kids (20 min)</li>
          <li>Mind-sharpening game or activity (15 min)</li>
          <li>Closing kirtan and prasadam together (10 min)</li>
        </ol>
      </section>
    </div>
  );
}
