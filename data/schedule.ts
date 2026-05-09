// ─── SEED DATA — not the runtime source of truth ─────────────────────────
// Public pages (/curriculum, /) read from the Supabase `sessions` table via
// lib/sessions.ts. This file seeds that table via `npm run seed:sessions`
// and is the fallback when Supabase is unreachable.
//
// To change the schedule permanently:
//   1. Edit this file
//   2. Commit + push
//   3. Run: npm run seed:sessions                (updates dev DB)
//   4. Run: npm run seed:sessions:prod           (updates prod DB; types YES)
//
// Once the Organiser curriculum editor ships (Phase 2), Organisers will edit
// the DB directly via the web UI, and this file becomes historical seed only.

export type SessionCategory = "Gita / Core" | "Practical (HG Radheshyam Prabhu)";

export interface Session {
  week: number;
  date: string; // ISO date
  category: SessionCategory;
  title: string;
  suggestedLevel: string;
  suggestedSpeaker: string;
  notes: string;
}

/**
 * 32-week schedule starting Sunday 31 May 2026.
 * Practical (Radheshyam Prabhu) sessions every 4th week.
 */
export const schedule: Session[] = [
  { week: 1,  date: "2026-05-31", category: "Gita / Core", title: "Introduction: What is the Gita?", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Sets the vision for the entire program" },
  { week: 2,  date: "2026-06-07", category: "Gita / Core", title: "Chapter 1: Arjuna's Dilemma", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Foundation chapter; needs strong opener" },
  { week: 3,  date: "2026-06-14", category: "Gita / Core", title: "Chapter 2: The Soul is Eternal", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Most quoted chapter; philosophical depth" },
  { week: 4,  date: "2026-06-21", category: "Practical (HG Radheshyam Prabhu)", title: "Gita Tools for Great Habits", suggestedLevel: "L2/L3", suggestedSpeaker: "Shekhar Prabhuji or Anchal Nema", notes: "Habit stacking, morning routine" },
  { week: 5,  date: "2026-06-28", category: "Gita / Core", title: "Chapter 3: Karma Yoga", suggestedLevel: "L2", suggestedSpeaker: "Shekhar Prabhuji", notes: "Work as worship; practical" },
  { week: 6,  date: "2026-07-05", category: "Gita / Core", title: "Chapter 4: Transcendental Knowledge", suggestedLevel: "L2", suggestedSpeaker: "Anu Mataji", notes: "Parampara importance" },
  { week: 7,  date: "2026-07-12", category: "Gita / Core", title: "Chapter 5: Karma-Sannyasa Yoga", suggestedLevel: "L3", suggestedSpeaker: "Divya Nayak", notes: "Detached action" },
  { week: 8,  date: "2026-07-19", category: "Practical (HG Radheshyam Prabhu)", title: "Do Your Best and Leave the Rest", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Core karma yoga (2.47)" },
  { week: 9,  date: "2026-07-26", category: "Gita / Core", title: "Chapter 6: Dhyana Yoga", suggestedLevel: "L2", suggestedSpeaker: "Shekhar Prabhuji", notes: "Meditation and discipline" },
  { week: 10, date: "2026-08-02", category: "Gita / Core", title: "Review + Goushala Visit Prep", suggestedLevel: "L1", suggestedSpeaker: "HG Vrajeshwari Vinita DD", notes: "Recap + outing logistics" },
  { week: 11, date: "2026-08-09", category: "Gita / Core", title: "Chapter 7: Knowledge of the Absolute", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Krishna as source of everything" },
  { week: 12, date: "2026-08-16", category: "Practical (HG Radheshyam Prabhu)", title: "Overcoming Bad Habits (Media, Phone, Temper)", suggestedLevel: "L2", suggestedSpeaker: "Shekhar Prabhuji", notes: "Needs authenticity; sincere practice" },
  { week: 13, date: "2026-08-23", category: "Gita / Core", title: "Chapter 8: Attaining the Supreme", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Consciousness at time of death" },
  { week: 14, date: "2026-08-30", category: "Gita / Core", title: "Chapter 9: Most Confidential Knowledge", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Raja-vidya" },
  { week: 15, date: "2026-09-06", category: "Gita / Core", title: "Ahobilam Pilgrimage Debrief", suggestedLevel: "L3", suggestedSpeaker: "Anchal Nema", notes: "Sharing session" },
  { week: 16, date: "2026-09-13", category: "Practical (HG Radheshyam Prabhu)", title: "Basics of Bhakti Yoga + MMC Level 1 (Chanting)", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Japa craft; L1 only" },
  { week: 17, date: "2026-09-20", category: "Gita / Core", title: "Chapter 10: Opulence of the Absolute", suggestedLevel: "L2", suggestedSpeaker: "Anu Mataji", notes: "Vibhuti yoga" },
  { week: 18, date: "2026-09-27", category: "Gita / Core", title: "Chapter 11: Universal Form", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Vishwarupa; awe-inspiring" },
  { week: 19, date: "2026-10-04", category: "Gita / Core", title: "Chapter 12: Devotional Service", suggestedLevel: "L2", suggestedSpeaker: "Shekhar Prabhuji", notes: "26 qualities of devotee" },
  { week: 20, date: "2026-10-11", category: "Practical (HG Radheshyam Prabhu)", title: "Behavioral Science from Bhagavatam (Relationships)", suggestedLevel: "L1", suggestedSpeaker: "HG Vrajeshwari Vinita DD", notes: "Marriage, in-laws, kids" },
  { week: 21, date: "2026-10-18", category: "Gita / Core", title: "Application Workshop: Gita in Daily Life", suggestedLevel: "L3", suggestedSpeaker: "Srirekha Mataji", notes: "Facilitated discussion" },
  { week: 22, date: "2026-10-25", category: "Gita / Core", title: "Chapter 13: Nature, Enjoyer, Consciousness", suggestedLevel: "L2", suggestedSpeaker: "Anu Mataji", notes: "Kshetra-kshetrajna" },
  { week: 23, date: "2026-11-01", category: "Gita / Core", title: "Chapter 14: Three Modes of Material Nature", suggestedLevel: "L2", suggestedSpeaker: "Shekhar Prabhuji", notes: "Sattva/rajas/tamas" },
  { week: 24, date: "2026-11-08", category: "Practical (HG Radheshyam Prabhu)", title: "Managing Anger, Lust, Greed (3 Gates to Hell)", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Ch 16.21; deep content" },
  { week: 25, date: "2026-11-15", category: "Gita / Core", title: "Chapter 15: Yoga of the Supreme Person", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Inverted tree" },
  { week: 26, date: "2026-11-22", category: "Gita / Core", title: "Home Altar Workshop + Sadhu Sanga", suggestedLevel: "L1", suggestedSpeaker: "HG Vrajeshwari Vinita DD", notes: "Planning-heavy; hands-on" },
  { week: 27, date: "2026-11-29", category: "Gita / Core", title: "Chapter 16: Divine and Demonic Natures", suggestedLevel: "L2", suggestedSpeaker: "Anu Mataji", notes: "26 divine qualities" },
  { week: 28, date: "2026-12-06", category: "Practical (HG Radheshyam Prabhu)", title: "Destroy Doubts and Awaken Faith", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "For skeptical spouses" },
  { week: 29, date: "2026-12-13", category: "Gita / Core", title: "Chapter 17: Three Kinds of Faith", suggestedLevel: "L3", suggestedSpeaker: "Ria Mataji", notes: "Food/charity/austerity in modes" },
  { week: 30, date: "2026-12-20", category: "Gita / Core", title: "Chapter 18: Perfection of Renunciation", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das", notes: "Conclusion; 18.66 surrender" },
  { week: 31, date: "2026-12-27", category: "Gita / Core", title: "Year-End Reflection + Next-Year Planning", suggestedLevel: "L1", suggestedSpeaker: "HG Vrajeshwari Vinita DD", notes: "Planning session" },
  { week: 32, date: "2027-01-03", category: "Practical (HG Radheshyam Prabhu)", title: "Graduation + Bhakti Vriksha Launch", suggestedLevel: "L1", suggestedSpeaker: "HG Mahaprema Krishna Das + HG Vrajeshwari Vinita DD", notes: "Certificates + launch ceremony" },
];

export const speakers = [
  { level: "L1", name: "HG Mahaprema Krishna Das", role: "Senior Teacher", description: "Most senior devotee in our sanga, deeply learned in the Bhagavad-gita. Leads opening sessions, deep philosophical chapters, and doubt-resolution." },
  { level: "L1", name: "HG Vrajeshwari Vinita DD", role: "Program & Youth Lead", description: "Excellent at planning, training kids and youth. Leads kids-focused sessions, youth talks, and the Behavioral Science / relationships module." },
  { level: "L2", name: "Shekhar Prabhuji", role: "Senior Practitioner", description: "Newly initiated; very sincere practice. Leads mid-complexity chapters (Ch 3, 6, 12, 14) and practical sessions on habits." },
  { level: "L2", name: "Anu Mataji", role: "Senior Practitioner", description: "Newly initiated; very sincere practice. Leads moderate chapters (Ch 4, 10, 13, 16) with a reflective, sharing-based tone." },
  { level: "L3", name: "Anchal Nema", role: "Facilitator", description: "Aspiring sincere practitioner. Program coordinator; facilitates outing debriefs and logistics sessions." },
  { level: "L3", name: "Divya Nayak", role: "Facilitator", description: "Aspiring sincere practitioner. Supports application-oriented chapters and workshops." },
  { level: "L3", name: "Srirekha Mataji", role: "Facilitator", description: "Aspiring sincere practitioner. Leads application workshops and review sessions." },
  { level: "L3", name: "Ria Mataji", role: "Facilitator", description: "Aspiring sincere practitioner. Leads moderate chapters (Ch 17) with mentor support." },
  { level: "L4", name: "Newer Devotees", role: "Support Team", description: "Newer to Krishna consciousness. Support roles: kirtan, prasadam coordination, kids' parallel sessions, reading verses." },
];
