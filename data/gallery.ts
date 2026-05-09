// Gallery data — themed albums + YouTube highlights.
// Hand-editable for now; later will migrate to a DB-backed admin editor
// (Phase 2) so organisers can add new entries without a code change.
//
// To add a new entry today:
//   1. Copy one of the existing objects as a template
//   2. Fill in kind + url/id + title + theme + story
//   3. Commit + push to dev — the gallery will rebuild automatically

export type GalleryTheme =
  | "festivals"
  | "yatras"
  | "sessions"
  | "sanga";

export interface ThemeMeta {
  id: GalleryTheme;
  emoji: string;
  title: string;
  tagline: string;
  ribbonColor: string; // tailwind class suffix, used for ribbon accent
}

export const THEMES: ThemeMeta[] = [
  {
    id: "festivals",
    emoji: "🪔",
    title: "Festival Utsavs",
    tagline:
      "Every festival is a chance to invite Krishna into our homes and hearts. Together we celebrate His pastimes with kirtan, colour, and prasadam.",
    ribbonColor: "saffron",
  },
  {
    id: "yatras",
    emoji: "🚩",
    title: "Yatras & Pilgrimage",
    tagline:
      "Where devotees walk together, Krishna walks with them. Our yatras take us to the sacred places of Mahaprabhu's pastimes and bring us back transformed.",
    ribbonColor: "krishna",
  },
  {
    id: "sessions",
    emoji: "📚",
    title: "Insightful Sessions",
    tagline:
      "Bhakti isn't abstract philosophy — it's a science for daily life. These sessions bring timeless Gita wisdom to the joys and challenges we live with every week.",
    ribbonColor: "amber",
  },
  {
    id: "sanga",
    emoji: "🎂",
    title: "Sanga Moments",
    tagline:
      "Every devotee in our sanga is a gift from Krishna. We celebrate each other's birthdays and milestones so the family of bhakti only grows closer over time.",
    ribbonColor: "rose",
  },
];

export type GalleryItem =
  | {
      kind: "youtube-video";
      id: string; // YouTube video ID (the bit after v=)
      title: string;
      story: string;
      theme: GalleryTheme;
      date: string; // ISO YYYY-MM-DD or "2026" for year-only
      featured?: boolean; // true = show in highlight reel at top
    }
  | {
      kind: "supabase-album";
      slug: string; // matches the folder name inside the `gallery` bucket
      title: string;
      story: string;
      theme: GalleryTheme;
      date: string;
      fallbackUrl?: string; // Google Photos link shown until photos are uploaded
      featured?: boolean;
    }
  | {
      kind: "photos-album";
      url: string; // https://photos.app.goo.gl/...
      title: string;
      story: string;
      theme: GalleryTheme;
      date: string;
      featured?: boolean;
    }
  | {
      kind: "youtube-channel";
      url: string;
      title: string;
      story: string;
    }
  | {
      kind: "youtube-playlists";
      url: string;
      title: string;
      story: string;
    };

export const GALLERY_ITEMS: GalleryItem[] = [
  // ─── Featured video ──────────────────────────────────────────
  {
    kind: "youtube-video",
    id: "ykih1NvRR6A",
    title: "Janmashtami — Krishna's Appearance Day",
    story:
      "On Krishna's appearance day, the temple becomes Vrindavana. Watch our sanga offer abhishek, kirtan, and the pure joy of receiving the Lord in our midst at midnight.",
    theme: "festivals",
    date: "2026",
    featured: true,
  },

  // ─── Festival Utsavs ─────────────────────────────────────────
  {
    kind: "supabase-album",
    slug: "brahmostava-2026",
    fallbackUrl: "https://photos.app.goo.gl/5CBbm3qhCbUw3n5h7",
    title: "Brahmotsava 2026",
    story:
      "Five days, one sanga, countless opportunities for seva. Brahmotsava — the festival of festivals — saw our family circumambulating the temple with the Lordships, singing Their glories, and feasting as one.",
    theme: "festivals",
    date: "2026",
  },
  {
    kind: "supabase-album",
    slug: "holi-2026",
    fallbackUrl: "https://photos.app.goo.gl/cMPh8etnruFPyxMx6",
    title: "Holi 2026",
    story:
      "The festival of colours reminds us that bhakti transcends every barrier. Clouds of abir, laughter of children, and kirtan carrying through the courtyard — this is how Krishna's holi is played.",
    theme: "festivals",
    date: "2026",
  },

  // ─── Yatras & Pilgrimage ─────────────────────────────────────
  {
    kind: "supabase-album",
    slug: "jagannath-yatra",
    fallbackUrl: "https://photos.app.goo.gl/EtABPPxWiPBoeqed6",
    title: "Jagannath Rath Yatra",
    story:
      "Puri comes to Bengaluru. Families pulled the ropes of Lord Jagannath's chariot through the streets, offering kirtan and japa with every step. Witnessing the Lord come to us, instead of us going to Him — a memory to carry for a lifetime.",
    theme: "yatras",
    date: "2026",
  },

  // ─── Insightful Sessions ─────────────────────────────────────
  {
    kind: "supabase-album",
    slug: "art-of-parenting",
    fallbackUrl: "https://photos.app.goo.gl/JtYHvejV8zZX5Ut97",
    title: "Art of Parenting — a Krishna Conscious Perspective",
    story:
      "Raising children is the deepest seva a householder performs. In this session, our senior devotees unpacked how Bhagavad-gita's wisdom shapes everyday parenting — from handling tantrums to modelling bhakti at home.",
    theme: "sessions",
    date: "2026",
  },

  // ─── Sanga Moments ───────────────────────────────────────────
  {
    kind: "supabase-album",
    slug: "birthday-celebrations",
    fallbackUrl: "https://photos.app.goo.gl/hHoRUJ5SjSeun2jj6",
    title: "Birthday Celebrations",
    story:
      "Every devotee is a gift from Krishna. We cut cakes, chant Hare Krishna, and offer birthday blessings so the years of our lives become the years of our bhakti. Little moments that bind a sanga into a family.",
    theme: "sanga",
    date: "2026",
  },

  // ─── YouTube channel + playlists ─────────────────────────────
  {
    kind: "youtube-channel",
    url: "https://www.youtube.com/@gitatoday108",
    title: "Gita Today — YouTube Channel",
    story:
      "Our home for recordings of weekly classes, featured lectures, and spiritual highlights. Subscribe to stay in touch with the sanga even on weekdays.",
  },
  {
    kind: "youtube-playlists",
    url: "https://www.youtube.com/@gitatoday108/playlists",
    title: "Gita Today — Organised Playlists",
    story:
      "Browse lectures by theme — chapter-wise Bhagavad-gita classes, Bhagavatam series, festival specials, and practical workshops. A full library of Vaishnava wisdom at your fingertips.",
  },
];
