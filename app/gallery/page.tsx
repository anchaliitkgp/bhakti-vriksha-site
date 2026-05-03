export default function Gallery() {
  const placeholders = Array.from({ length: 9 }, (_, i) => i);
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-krishna-800">Gallery</h1>
      <div className="om-divider mt-3 mb-6" />
      <p className="text-gray-700 mb-10 max-w-3xl">
        Photos from our Sunday sessions, kirtans, outings, and festivals. Once
        the program begins, we will populate this page with pictures from
        goushala visits, the Ahobilam pilgrimage, home altar workshops, and
        our graduation retreat.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {placeholders.map((i) => (
          <div
            key={i}
            className="aspect-square bg-gradient-to-br from-krishna-100 to-saffron-100 border border-saffron-200 rounded-lg flex items-center justify-center text-6xl opacity-70"
          >
            🪔
          </div>
        ))}
      </div>
    </div>
  );
}
