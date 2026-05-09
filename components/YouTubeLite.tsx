"use client";

// YouTubeLite — a lightweight YouTube thumbnail + play-button facade.
// Only loads the full iframe/player when the user clicks, saving ~500kb
// of player JS per video on initial gallery load.
//
// Uses YouTube's own thumbnail CDN (img.youtube.com) so no auth / no API
// key needed.

import { useState } from "react";

export default function YouTubeLite({
  videoId,
  title,
}: {
  videoId: string;
  title: string;
}) {
  const [loaded, setLoaded] = useState(false);

  // hqdefault is 480x360 and always exists; maxresdefault may 404 on old
  // videos. hqdefault gives good quality with reliable loading.
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (loaded) {
    return (
      <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="group relative aspect-video w-full rounded-xl overflow-hidden bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500"
      aria-label={`Play video: ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnailUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition">
          <svg
            viewBox="0 0 24 24"
            className="w-8 h-8 md:w-10 md:h-10 text-rose-600"
            fill="currentColor"
            aria-hidden
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}
