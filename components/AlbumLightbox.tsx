"use client";

// Fullscreen image lightbox with prev/next, keyboard nav, swipe, and a
// thumbnail strip. Used by the gallery album cards — click any thumbnail
// to open the lightbox at that photo.
//
// Accessibility:
//   - role="dialog", aria-modal, trapped focus (basic — close button takes focus)
//   - ESC closes
//   - Arrow keys navigate, Home / End jump
//   - On mobile: horizontal swipe navigates

import { useEffect, useRef, useState, useCallback } from "react";

export type LightboxPhoto = {
  full: string;
  thumb: string;
  name: string;
};

export interface AlbumLightboxProps {
  albumTitle: string;
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
}

export default function AlbumLightbox({
  albumTitle,
  photos,
  initialIndex,
  onClose,
}: AlbumLightboxProps) {
  const [index, setIndex] = useState(
    Math.max(0, Math.min(initialIndex, photos.length - 1))
  );
  const closeBtn = useRef<HTMLButtonElement>(null);
  const thumbStrip = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      setIndex((prev) => {
        const next = prev + delta;
        if (next < 0) return 0;
        if (next >= photos.length) return photos.length - 1;
        return next;
      });
    },
    [photos.length]
  );

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Home") setIndex(0);
      else if (e.key === "End") setIndex(photos.length - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, photos.length]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Focus close button on open
  useEffect(() => {
    closeBtn.current?.focus();
  }, []);

  // Scroll active thumb into view
  useEffect(() => {
    const el = thumbStrip.current?.querySelector(
      `[data-idx="${index}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  // Preload neighbours so swipes feel instant
  useEffect(() => {
    const neighbours = [index - 1, index + 1];
    for (const i of neighbours) {
      if (i >= 0 && i < photos.length) {
        const img = new Image();
        img.src = photos[i].full;
      }
    }
  }, [index, photos]);

  const current = photos[index];
  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${albumTitle} — photo ${index + 1} of ${photos.length}`}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur flex flex-col"
      onClick={(e) => {
        // Click backdrop (but not inside interactive controls) to close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 text-white">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-saffron-300">
            Album
          </div>
          <div className="font-serif text-base md:text-lg truncate">
            {albumTitle}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-saffron-200/80 tabular-nums">
            {index + 1} / {photos.length}
          </span>
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main image + arrows */}
      <div
        className="flex-1 relative overflow-hidden"
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStart.current == null) return;
          const dx = e.changedTouches[0].clientX - touchStart.current;
          touchStart.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.full}
          alt={`${albumTitle} — ${index + 1}`}
          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
        />

        {index > 0 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-14 md:h-14 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-14 md:h-14 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      <div
        ref={thumbStrip}
        className="overflow-x-auto py-3 px-3 md:px-6 bg-black/80 border-t border-white/10"
      >
        <div className="flex gap-2">
          {photos.map((p, i) => (
            <button
              key={p.name}
              data-idx={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={`shrink-0 rounded-md overflow-hidden ring-2 transition ${
                i === index
                  ? "ring-saffron-400"
                  : "ring-transparent hover:ring-white/40"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumb}
                alt=""
                loading="lazy"
                className="h-16 w-auto object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
