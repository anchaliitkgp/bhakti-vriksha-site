import { speakers } from "@/data/schedule";

const levelColor: Record<string, string> = {
  L1: "bg-krishna-100 border-krishna-300 text-krishna-800",
  L2: "bg-saffron-100 border-saffron-300 text-saffron-800",
  L3: "bg-yellow-50 border-yellow-300 text-yellow-800",
  L4: "bg-gray-100 border-gray-300 text-gray-700",
};

export default function Speakers() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-krishna-800">Our Speakers</h1>
      <div className="om-divider mt-3 mb-6" />
      <p className="text-gray-700 mb-10 max-w-3xl">
        Our speakers are organized into four levels based on seniority in
        Krishna consciousness and depth of study. Topics are matched to
        speakers accordingly; self-nomination is welcomed through the program
        coordinator.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {speakers.map((sp) => (
          <div
            key={sp.name}
            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`inline-block text-xs font-bold px-2 py-1 rounded border ${
                  levelColor[sp.level] ?? "bg-gray-100 border-gray-300"
                }`}
              >
                {sp.level}
              </span>
              <span className="text-xs uppercase tracking-wider text-saffron-700">
                {sp.role}
              </span>
            </div>
            <h2 className="font-serif text-xl text-krishna-800">{sp.name}</h2>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              {sp.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-krishna-50 border-l-4 border-krishna-600 rounded">
        <h3 className="font-serif text-xl text-krishna-800 mb-2">
          Want to speak?
        </h3>
        <p className="text-gray-700">
          We welcome self-nomination for any session. Contact the program
          coordinator (Anchal Nema) at least one week in advance. L3 and L4
          speakers are paired with an L1 or L2 mentor for content review before
          their session.
        </p>
      </div>
    </div>
  );
}
