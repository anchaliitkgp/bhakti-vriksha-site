// Gallery album uploader.
//
// Usage:
//   npm run gallery:upload <album-slug> <path-to-folder>
//
// What it does per image:
//   1. Reads each .jpg / .jpeg / .png / .heic file from the folder
//   2. Auto-rotates based on EXIF orientation
//   3. Writes two sizes to Supabase Storage:
//        gallery/{slug}/full/{filename}.jpg   -> 1600px wide, 85% JPEG
//        gallery/{slug}/thumb/{filename}.jpg  -> 400px wide, 80% JPEG
//   4. Skips files already uploaded (idempotent — safe to re-run)
//
// Loads Supabase credentials from the env file the calling npm script pipes
// in (via scripts/with-env.sh).

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, basename, join } from "node:path";
import sharp from "sharp";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing env vars. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const [, , slug, folder] = process.argv;
if (!slug || !folder) {
  console.error("Usage: node supabase/upload-album.mjs <album-slug> <path-to-folder>");
  console.error("Example: node supabase/upload-album.mjs brahmostava-2026 ~/Downloads/brahmostava-2026");
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`Invalid slug '${slug}'. Use lowercase letters, digits, and hyphens only.`);
  process.exit(1);
}

const st = await stat(folder);
if (!st.isDirectory()) {
  console.error(`'${folder}' is not a directory.`);
  process.exit(1);
}

const entries = (await readdir(folder))
  .filter((name) =>
    /\.(jpg|jpeg|png|heic|webp)$/i.test(name) && !name.startsWith(".")
  )
  .sort()
  // Per user direction: upload only the first 5 images per album to keep
  // the free-tier storage footprint tiny and the page load fast. If you
  // want more, bump this or pass --all on the CLI later.
  .slice(0, 5);

if (entries.length === 0) {
  console.error(`No image files found in ${folder}`);
  process.exit(1);
}

console.log(`Uploading ${entries.length} files to 'gallery/${slug}/' ...`);

// Fetch the list of already-uploaded full-size files so we can skip them.
const listUrl = `${supabaseUrl}/storage/v1/object/list/gallery`;
const alreadyUploaded = await (async () => {
  const res = await fetch(listUrl, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prefix: `${slug}/full/`,
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    }),
  });
  if (!res.ok) {
    console.warn(`Could not list existing files (HTTP ${res.status}) — uploading all.`);
    return new Set();
  }
  const list = await res.json();
  return new Set(list.map((f) => f.name));
})();

// Upload helper. Uploads `buf` to `path` with the given content type.
async function uploadObject(path, buf, contentType) {
  const url = `${supabaseUrl}/storage/v1/object/gallery/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buf,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Upload failed for ${path} (HTTP ${res.status}): ${t}`);
  }
}

let uploaded = 0;
let skipped = 0;

for (const [i, name] of entries.entries()) {
  const outName = `${basename(name, extname(name))}.jpg`;
  const fullPath = `${slug}/full/${outName}`;
  const thumbPath = `${slug}/thumb/${outName}`;

  if (alreadyUploaded.has(outName)) {
    process.stdout.write(`  [${i + 1}/${entries.length}] ${name} → skipped (already uploaded)\n`);
    skipped++;
    continue;
  }

  try {
    const source = await readFile(join(folder, name));

    // Resize + compress in parallel
    const [fullBuf, thumbBuf] = await Promise.all([
      sharp(source)
        .rotate() // EXIF auto-rotate
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer(),
      sharp(source)
        .rotate()
        .resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer(),
    ]);

    await uploadObject(fullPath, fullBuf, "image/jpeg");
    await uploadObject(thumbPath, thumbBuf, "image/jpeg");

    uploaded++;
    const sizeKb = Math.round(fullBuf.byteLength / 1024);
    process.stdout.write(
      `  [${i + 1}/${entries.length}] ${name} → uploaded (${sizeKb} KB full)\n`
    );
  } catch (e) {
    console.error(`  [${i + 1}/${entries.length}] ${name} → FAILED: ${e.message}`);
  }
}

console.log();
console.log(
  `Done. ${uploaded} uploaded, ${skipped} skipped, ${entries.length - uploaded - skipped} failed.`
);
console.log();
console.log(
  `Album should now render at /gallery — add or confirm the 'supabase-album' entry in data/gallery.ts with slug '${slug}'.`
);
