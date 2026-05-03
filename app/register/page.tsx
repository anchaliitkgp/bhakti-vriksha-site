export default function Register() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-krishna-800">Register your family</h1>
      <div className="om-divider mt-3 mb-6" />
      <p className="text-gray-700 mb-6">
        We welcome married couples, parents with children, youth and anyone
        seeking to bring the Bhagavad-gita into their daily lives. Registration
        is free.
      </p>

      <div className="bg-saffron-50 border border-saffron-200 rounded-lg p-6 mb-8">
        <h2 className="font-serif text-xl text-krishna-800 mb-3">
          How to register
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Fill the short form below (or via WhatsApp — see Contact)</li>
          <li>We will add you to the program WhatsApp group</li>
          <li>You receive a welcome pack and first Sunday session details</li>
        </ol>
      </div>

      {/* Replace src with your own Google Form embed URL */}
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="font-semibold text-krishna-800">Registration form</div>
          <div className="text-sm text-gray-600">
            Replace the iframe below with your Google Form embed URL.
          </div>
        </div>
        <iframe
          title="Registration Form"
          src="https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?embedded=true"
          className="w-full"
          style={{ minHeight: 700 }}
        >
          Loading registration form…
        </iframe>
      </div>
    </div>
  );
}
