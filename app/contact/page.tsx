export default function Contact() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-krishna-800">Contact us</h1>
      <div className="om-divider mt-3 mb-8" />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-saffron-100 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-saffron-700 mb-1">
            Program Coordinator
          </div>
          <div className="font-serif text-xl text-krishna-800">Anchal Nema</div>
          <p className="mt-2 text-sm text-gray-700">
            Questions about joining, nominating yourself to speak, or anything
            else related to the program.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div>📧 <a className="text-krishna-700 underline" href="mailto:contact@bhaktivrikshaRMM.org">contact@bhaktivrikshaRMM.org</a> <span className="text-gray-400">(placeholder)</span></div>
            <div>📱 WhatsApp: +91-XXXXX XXXXX <span className="text-gray-400">(placeholder)</span></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-saffron-100 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-saffron-700 mb-1">
            Venue
          </div>
          <div className="font-serif text-xl text-krishna-800">Sunday Program</div>
          <p className="mt-2 text-sm text-gray-700">
            Address and map will be shared in the welcome pack after registration.
          </p>
          <div className="mt-4 text-sm text-gray-700">
            <div>🕘 Sundays, timings shared on registration</div>
            <div>🚗 Parking available</div>
            <div>🍽️ Prasadam after every session</div>
          </div>
        </div>
      </div>

      <div className="mt-10 p-6 bg-krishna-800 text-white rounded-lg">
        <div className="font-serif text-xl mb-2">Join our WhatsApp group</div>
        <p className="text-sm opacity-90 mb-4">
          Weekly reminders, verse-of-the-week, session recordings, and community
          announcements.
        </p>
        <a
          href="#"
          className="inline-block bg-saffron-500 text-krishna-900 font-semibold px-5 py-2 rounded hover:bg-saffron-400 transition"
        >
          Request invite
        </a>
      </div>
    </div>
  );
}
