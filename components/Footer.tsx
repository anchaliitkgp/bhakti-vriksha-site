export default function Footer() {
  return (
    <footer className="mt-16 bg-krishna-800 text-krishna-100">
      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-8">
        <div>
          <div className="font-serif text-xl text-white">Bhakti Vriksha</div>
          <div className="text-sm text-saffron-200 tracking-widest uppercase">
            Radha Madan Mohan
          </div>
          <p className="mt-3 text-sm opacity-80">
            A Sunday journey through the Bhagavad-gita for families, under the
            shelter of Sri Sri Radha Madan Mohan.
          </p>
        </div>
        <div>
          <div className="font-semibold text-white mb-3">Quick Links</div>
          <ul className="space-y-2 text-sm">
            <li><a href="/curriculum" className="hover:text-saffron-200">Proposed Curriculum</a></li>
            <li><a href="/schedule" className="hover:text-saffron-200">Actual Schedule</a></li>
            <li><a href="/speakers" className="hover:text-saffron-200">Speakers</a></li>
            <li><a href="/register" className="hover:text-saffron-200">Register</a></li>
            <li><a href="/contact" className="hover:text-saffron-200">Contact</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white mb-3">External</div>
          <ul className="space-y-2 text-sm">
            <li><a href="https://vedabase.io/en/" target="_blank" rel="noreferrer" className="hover:text-saffron-200">Vedabase — Prabhupada&apos;s Books</a></li>
            <li><a href="https://radheshyamdas.com/newcomers" target="_blank" rel="noreferrer" className="hover:text-saffron-200">HG Radheshyam Das — Newcomers</a></li>
            <li><a href="https://iskconcongregation.com/" target="_blank" rel="noreferrer" className="hover:text-saffron-200">ISKCON Congregation</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-krishna-700">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs opacity-70 text-center">
          © {new Date().getFullYear()} Bhakti Vriksha Radha Madan Mohan · Hare Krishna
        </div>
      </div>
    </footer>
  );
}
