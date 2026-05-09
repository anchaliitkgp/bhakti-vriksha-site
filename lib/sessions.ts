// Data-access layer for the sessions (curriculum) table.
//
// Public pages (/curriculum, /) call these helpers and get automatic
// Incremental Static Regeneration via the `revalidate` export on each page.
// That means the HTML is pre-rendered and cached at Vercel's edge, but
// refreshed from Supabase at most once per `revalidate` seconds.
//
// In the rare case of a Supabase outage, the helpers fall back to the seed
// file (data/schedule.ts) so public pages never go blank. Members-only pages
// still require Supabase.

import { supabaseServer } from "@/lib/supabase";
import {
  schedule as seedSchedule,
  type Session as SeedSession,
} from "@/data/schedule";

export type SessionCategory =
  | "Gita / Core"
  | "Practical (HG Radheshyam Prabhu)"
  | "Special / Guest Session";

export interface Session {
  week: number;
  date: string; // ISO YYYY-MM-DD
  category: SessionCategory;
  title: string;
  suggestedLevel: string;
  suggestedSpeaker: string;
  notes: string;
}

// ── DB row type (snake_case) ────────────────────────────────────────────────
interface DbSessionRow {
  week: number;
  date: string;
  category: SessionCategory;
  title: string;
  suggested_level: string | null;
  suggested_speaker: string | null;
  notes: string | null;
}

function rowToSession(r: DbSessionRow): Session {
  return {
    week: r.week,
    date: r.date,
    category: r.category,
    title: r.title,
    suggestedLevel: r.suggested_level ?? "",
    suggestedSpeaker: r.suggested_speaker ?? "",
    notes: r.notes ?? "",
  };
}

// Seed fallback — already matches the Session shape.
function seedAsSessions(): Session[] {
  return seedSchedule as SeedSession[] as unknown as Session[];
}

/**
 * Fetch all 32 sessions, ordered by week ascending.
 * Falls back to the TS seed file if Supabase is unreachable.
 */
export async function getAllSessions(): Promise<Session[]> {
  try {
    const { data, error } = await supabaseServer()
      .from("sessions")
      .select("week, date, category, title, suggested_level, suggested_speaker, notes")
      .order("week", { ascending: true });

    if (error) {
      console.warn("[sessions] supabase fetch failed, using seed:", error.message);
      return seedAsSessions();
    }
    if (!data || data.length === 0) {
      console.warn("[sessions] no rows in DB, using seed");
      return seedAsSessions();
    }
    return (data as DbSessionRow[]).map(rowToSession);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[sessions] supabase threw, using seed:", message);
    return seedAsSessions();
  }
}

/**
 * Find the "next Sunday" to highlight on the home page.
 * - If program hasn't started: returns week 1
 * - During program: returns the first session on or after today (IST)
 * - After program: returns the last session
 */
export async function getNextSession(): Promise<Session> {
  const sessions = await getAllSessions();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const upcoming = sessions.find((s) => s.date >= today);
  return upcoming ?? sessions.at(-1) ?? sessions[0];
}
