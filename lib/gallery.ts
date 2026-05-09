// Server-side helper for listing album photos from the 'gallery' Supabase
// Storage bucket. Used by the /gallery page at render time.
//
// Bucket layout: gallery/{slug}/full/{name}.jpg, gallery/{slug}/thumb/{name}.jpg
// Photos sort by filename ascending (upload CLI writes deterministic names).

import { supabaseServer } from "@/lib/supabase";

export type AlbumPhoto = {
  name: string;
  full: string; // public URL to the 1600px jpeg
  thumb: string; // public URL to the 400px jpeg
};

/** Returns all photos in `gallery/<slug>/full/`. Empty array if the album
 *  doesn't exist, is empty, or Supabase is unreachable. */
export async function listAlbumPhotos(
  slug: string
): Promise<AlbumPhoto[]> {
  try {
    const supabase = supabaseServer();

    // List files in the album's /full/ folder
    const { data, error } = await supabase.storage
      .from("gallery")
      .list(`${slug}/full`, {
        limit: 500,
        sortBy: { column: "name", order: "asc" },
      });
    if (error) {
      console.error(`[gallery] list failed for ${slug}:`, error.message);
      return [];
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    return (data ?? [])
      .filter((f) => !f.name.startsWith("."))
      .map((f) => ({
        name: f.name,
        full: `${url}/storage/v1/object/public/gallery/${slug}/full/${encodeURIComponent(f.name)}`,
        thumb: `${url}/storage/v1/object/public/gallery/${slug}/thumb/${encodeURIComponent(f.name)}`,
      }));
  } catch (err) {
    console.error(`[gallery] threw for ${slug}:`, err);
    return [];
  }
}
