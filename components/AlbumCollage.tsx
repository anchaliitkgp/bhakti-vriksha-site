"use client";

// AlbumCollage — a Pinterest-style collage + click-to-open lightbox
// carousel for one album.
//
// If the album has photos, shows up to 5 thumbnails arranged as a mosaic.
// Clicking any thumbnail opens the lightbox at that index. If the album
// has no photos yet, renders a fallback placeholder card that links to
// the provided fallback URL (Google Photos) in a new tab.

import { useCallback, useEffect, useState } from "react";

export type AlbumPhotoLite = {
  full: string;
  thumb: string;
  name: string;
};

export interface AlbumCollageProps {
  slug: string;
  title: string;
  story: string;
  date: string;
  photos: AlbumPhotoLite[];
  fallbackUrl?: string;
  ringClass: string;
}

export default function AlbumCollage({
  slug,
  title,
  story,
  date,
  photos,
  fallbackUrl,
  ringClass,
}: AlbumCollageProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const n = photos.length;

  const openAt = useCallback((i: number) => {
    setIndex(i);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const next = useCallback(
    () => setIndex((i) => (n === 0 ? 0 : (i + 1) % n)),
    [n]
  );
  const prev = useCallback(
    () => setIndex((i) => (n === 0 ? 0 : (i - 1 + n) % n)),
    [n]
  );

  // Keyboard nav while lightbox is open
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, next, prev]);

  // ─── No photos yet — fallback placeholder card ─────────────────
  if (n === 0) {
    return (
      <a
        href={fallbackUrl ?? "#"}
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
            <h3 className="font-serif text-lg text-krishna-800">{title}</h3>
            <span className="text-xs text-gray-500 shrink-0">{date}</span>
          </div>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">{story}</p>
          <p className="mt-2 text-xs text-gray-400">
            Photos coming to this page soon — for now view on Google Photos.
          </p>
        </div>
      </a>
    );
  }

  // ─── Collage layout ─────────────────────────────────────────────
  // Layouts are tuned for 1..5 photos. 5 is the configured cap.
  return (
    <>
      <div
        className={`bg-white border border-saffron-100 rounded-2xl overflow-hidden shadow-sm hover:ring-2 ${ringClass} transition`}
      >
        <div className="relative aspect-[4/3] bg-gray-50 p-1">
          <CollageLayout
            photos={photos}
            onClickPhoto={openAt}
            title={title}
          />
        </div>
        <div className="p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-serif text-lg text-krishna-800">{title}</h3>
            <span className="text-xs text-gray-500 shrink-0">{date}</span>
          </div>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">{story}</p>
          <button
            type="button"
            onClick={() => openAt(0)}
            className="mt-3 text-sm text-krishna-700 underline underline-offset-2 hover:text-krishna-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
          >
            Open album ({n} photo{n === 1 ? "" : "s"}) →
          </button>
        </div>
      </div>

      {open && (
        <Lightbox
          photos={photos}
          index={index}
          title={title}
          slug={slug}
          onClose={close}
          onPrev={prev}
          onNext={next}
          setIndex={setIndex}
        />
      )}
    </>
  );
}

// ─── Collage: a responsive mosaic of up to 5 thumbs ────────────────
function CollageLayout({
  photos,
  onClickPhoto,
  title,
}: {
  photos: AlbumPhotoLite[];
  onClickPhoto: (i: number) => void;
  title: string;
}) {
  const n = photos.length;

  if (n === 1) {
    return (
      <button
        type="button"
        onClick={() => onClickPhoto(0)}
        className="absolute inset-1 rounded-xl overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[0].thumb}
          alt={`${title} photo 1`}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.02] transition"
        />
      </button>
    );
  }

  if (n === 2) {
    return (
      <div className="absolute inset-1 grid grid-cols-2 gap-1">
        {photos.map((p, i) => (
          <CollageTile key={i} photo={p} idx={i} title={title} onClick={onClickPhoto} />
        ))}
      </div>
    );
  }

  if (n === 3) {
    return (
      <div className="absolute inset-1 grid grid-cols-2 gap-1">
        <CollageTile photo={photos[0]} idx={0} title={title} onClick={onClickPhoto} className="row-span-2" />
        <CollageTile photo={photos[1]} idx={1} title={title} onClick={onClickPhoto} />
        <CollageTile photo={photos[2]} idx={2} title={title} onClick={onClickPhoto} />
      </div>
    );
  }

  if (n === 4) {
    return (
      <div className="absolute inset-1 grid grid-cols-2 grid-rows-2 gap-1">
        {photos.map((p, i) => (
          <CollageTile key={i} photo={p} idx={i} title={title} onClick={onClickPhoto} />
        ))}
      </div>
    );
  }

  // n === 5: a big hero on the left + 2x2 on the right
  return (
    <div className="absolute inset-1 grid grid-cols-3 grid-rows-2 gap-1">
      <CollageTile
        photo={photos[0]}
        idx={0}
        title={title}
        onClick={onClickPhoto}
        className="row-span-2 col-span-2"
      />
      <CollageTile photo={photos[1]} idx={1} title={title} onClick={onClickPhoto} />
      <CollageTile photo={photos[2]} idx={2} title={title} onClick={onClickPhoto} />
      <CollageTile photo={photos[3]} idx={3} title={title} onClick={onClickPhoto} />
      <CollageTile photo={photos[4]} idx={4} title={title} onClick={onClickPhoto} />
    </div>
  );
}

function CollageTile({
  photo,
  idx,
  title,
  onClick,
  className,
}: {
  photo: AlbumPhotoLite;
  idx: number;
  title: string;
  onClick: (i: number) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(idx)}
      className={`relative rounded-lg overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 ${className ?? ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumb}
        alt={`${title} photo ${idx + 1}`}
        loading="lazy"
        className="w-full h-full object-cover group-hover:scale-[1.03] transition"
      />
    </button>
  );
}

// ─── Lightbox: full-screen carousel ─────────────────────────────────
function Lightbox({
  photos,
  index,
  title,
  slug,
  onClose,
  onPrev,
  onNext,
  setIndex,
}: {
  photos: AlbumPhotoLite[];
  index: number;
  title: string;
  slug: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  setIndex: (i: number) => void;
}) {
  // Swipe handling for mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) onNext();
      else onPrev();
    }
    setTouchStartX(null);
  };

  const current = photos[index];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — photo ${index + 1} of ${photos.length}`}
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-white text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="truncate">
          <span className="font-serif text-base">{title}</span>
          <span className="ml-3 text-white/60">
            {index + 1} / {photos.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Close album"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Main photo */}
      <div
        className="flex-1 relative flex items-center justify-center select-none"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.full}
          src={current.full}
          alt={`${title} photo ${index + 1}`}
          className="max-h-full max-w-full object-contain animate-[fade-in_0.25s_ease]"
        />

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Previous photo"
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Next photo"
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div
          className="px-4 py-3 overflow-x-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2 justify-center">
            {photos.map((p, i) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setIndex(i)}
                className={`shrink-0 w-14 h-14 rounded-md overflow-hidden ring-2 transition ${
                  i === index
                    ? "ring-saffron-400"
                    : "ring-transparent hover:ring-white/40"
                }`}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumb}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
