import type { Metadata } from "next";
import Link from "next/link";
import YouTubeLite from "@/components/YouTubeLite";
import AlbumCollage, { type AlbumPhotoLite } from "@/components/AlbumCollage";
import {
  GALLERY_ITEMS,
  THEMES,
  type GalleryItem,
  type GalleryTheme,
} from "@/data/gallery";
import { listAlbumPhotos } from "@/lib/gallery";

export const revalidate = 3600; // re-list album contents hourly

export const metadata: Metadata = {
  title: "Gallery · Bhakti Vriksha Radha Madan Mohan",
  description:
    "Festival utsavs, yatras, sessions, and sanga moments from our Bhakti Vriksha Radha Madan Mohan family.",
};

const RIBBON_CLASSES: Record<string, string> = {
  saffron: "from-saffron-200 via-saffron-300 to-saffron-400",
  krishna: "from-krishna-200 via-krishna-300 to-krishna-500",
  amber: "from-amber-100 via-amber-200 to-amber-300",
  rose: "from-rose-100 via-rose-200 to-rose-300",
};
const CARD_RING: Record<string, string> = {
  saffron: "hover:ring-saffron-400",
  krishna: "hover:ring-krishna-400",
  amber: "hover:ring-amber-400",
  rose: "hover:ring-rose-400",
};

export default async function Gallery() {
  // Resolve supabase-album photo lists once per render.
  const supabaseSlugs = GALLERY_ITEMS
    .filter((it) => it.kind === "supabase-album")
    .map((it) => (it as { slug: string }).slug);

  const photosBySlug = new Map<string, AlbumPhotoLite[]>();
  await Promise.all(
    supabaseSlugs.map(async (slug) => {
      const photos = await listAlbumPhotos(slug);
      photosBySlug.set(slug, photos);
    })
  );

  const featured = GALLERY_ITEMS.filter(
    (it) => "featured" in it && it.featured
  );

  const youtubeLinks = GALLERY_ITEMS.filter(
    (it) =>
      it.kind === "youtube-channel" || it.kind === "youtube-playlists"
  );

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-krishna-700 via-krishna-800 to-krishna-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <div className="text-saffron-200 uppercase tracking-[0.25em] text-xs md:text-sm">
            Gallery
          </div>
          <h1 className="mt-3 font-serif text-3xl md:text-5xl leading-tight">
            Moments of Bhakti
          </h1>
          <div className="om-divider mt-4 mb-4" aria-hidden />
          <p className="max-w-3xl text-saffron-50/90 text-base md:text-lg leading-relaxed">
            Every festival, every yatra, every birthday — they're all
            opportunities to remember Krishna together. Here are the stories
            of our Bhakti Vriksha Radha Madan Mohan sanga, one utsav at a
            time.
          </p>
        </div>
      </section>

      {/* Featured video */}
      {featured.length > 0 && featured[0].kind === "youtube-video" && (
        <section className="max-w-6xl mx-auto px-4 py-10 md:py-14">
          <div className="text-xs uppercase tracking-widest text-saffron-700">
            Featured
          </div>
          <h2 className="font-serif text-2xl md:text-3xl text-krishna-800 mt-1">
            {featured[0].title}
          </h2>
          <div className="mt-5 grid md:grid-cols-[3fr_2fr] gap-6 items-start">
            <YouTubeLite videoId={featured[0].id} title={featured[0].title} />
            <p className="text-gray-700 leading-relaxed text-base md:text-lg">
              {featured[0].story}
            </p>
          </div>
        </section>
      )}

      {/* Themed album sections */}
      {THEMES.map((theme) => {
        const items = GALLERY_ITEMS.filter(
          (it) =>
            (it.kind === "photos-album" ||
              it.kind === "supabase-album" ||
              it.kind === "youtube-video") &&
            !("featured" in it && it.featured) &&
            "theme" in it &&
            (it as { theme: GalleryTheme }).theme === theme.id
        );
        if (items.length === 0) return null;
        return (
          <section
            key={theme.id}
            className="max-w-6xl mx-auto px-4 py-10 md:py-14"
          >
            <div
              className={`h-1 w-20 rounded bg-gradient-to-r ${
                RIBBON_CLASSES[theme.ribbonColor] ?? ""
              }`}
              aria-hidden
            />
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl" aria-hidden>
                {theme.emoji}
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-krishna-800">
                {theme.title}
              </h2>
            </div>
            <p className="mt-2 max-w-3xl text-gray-700 leading-relaxed">
              {theme.tagline}
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((it, idx) => (
                <AlbumCard
                  key={idx}
                  item={it}
                  photosBySlug={photosBySlug}
                  ringClass={CARD_RING[theme.ribbonColor] ?? ""}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* YouTube channel + playlists */}
      {youtubeLinks.length > 0 && (
        <section className="bg-saffron-50/50 border-t border-saffron-100">
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl" aria-hidden>
                🎥
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-krishna-800">
                Keep watching on YouTube
              </h2>
            </div>
            <p className="mt-2 max-w-3xl text-gray-700 leading-relaxed">
              Our weekly classes, lectures, and festival livestreams live on
              the Gita Today channel. Subscribe to stay connected even
              between Sundays.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              {youtubeLinks.map((it, idx) => (
                <a
                  key={idx}
                  href={(it as { url: string }).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-5 bg-white border border-saffron-200 rounded-2xl shadow-sm hover:shadow-md hover:ring-2 hover:ring-rose-300 transition"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-serif text-lg text-krishna-800">
                      {(it as { title: string }).title}
                    </div>
                    <span className="text-xs uppercase tracking-wider text-rose-600 shrink-0">
                      {it.kind === "youtube-channel"
                        ? "Channel"
                        : "Playlists"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                    {(it as { story: string }).story}
                  </p>
                  <div className="mt-3 text-xs text-gray-500">
                    Opens YouTube in a new tab →
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing invitation */}
      <section className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
        <div className="text-xl md:text-2xl font-serif text-krishna-800 leading-relaxed">
          &ldquo;Wherever Krishna dances, wherever His devotees gather — that
          is where the material world ends and Vaikuntha begins.&rdquo;
        </div>
        <div className="mt-4 text-sm text-gray-600">
          — from the Brahma Samhita traditions
        </div>
        <div className="mt-10">
          <Link
            href="/register"
            className="inline-block bg-saffron-500 text-krishna-900 font-semibold px-6 py-3 rounded-md hover:bg-saffron-400 transition"
          >
            Join the sanga → Register your family
          </Link>
        </div>
      </section>
    </div>
  );
}

// ─── Album card ───────────────────────────────────────────────────────
function AlbumCard({
  item,
  photosBySlug,
  ringClass,
}: {
  item: GalleryItem;
  photosBySlug: Map<string, AlbumPhotoLite[]>;
  ringClass: string;
}) {
  if (item.kind === "supabase-album") {
    const photos = photosBySlug.get(item.slug) ?? [];
    return (
      <AlbumCollage
        slug={item.slug}
        title={item.title}
        story={item.story}
        date={item.date}
        photos={photos}
        fallbackUrl={item.fallbackUrl}
        ringClass={ringClass}
      />
    );
  }

  if (item.kind === "photos-album") {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block bg-white border border-saffron-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:ring-2 ${ringClass} transition`}
      >
        <div className="relative aspect-[4/3] bg-gradient-to-br from-saffron-100 via-saffron-200 to-krishna-200">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl md:text-7xl opacity-60" aria-hidden>
              📷
            </span>
          </div>
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium text-krishna-700 shadow-sm">
            Google Photos →
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-serif text-lg text-krishna-800">
              {item.title}
            </h3>
            <span className="text-xs text-gray-500 shrink-0">{item.date}</span>
          </div>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">
            {item.story}
          </p>
        </div>
      </a>
    );
  }

  if (item.kind === "youtube-video") {
    return (
      <div
        className={`bg-white border border-saffron-100 rounded-2xl overflow-hidden shadow-sm hover:ring-2 ${ringClass} transition`}
      >
        <YouTubeLite videoId={item.id} title={item.title} />
        <div className="p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-serif text-lg text-krishna-800">
              {item.title}
            </h3>
            <span className="text-xs text-gray-500 shrink-0">{item.date}</span>
          </div>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">
            {item.story}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
