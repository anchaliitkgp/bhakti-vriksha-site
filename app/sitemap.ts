import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://bhakti-vriksha-site.vercel.app";

const routes = [
  "", // home
  "about",
  "curriculum",
  "speakers",
  "resources",
  "gallery",
  "register",
  "contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((path) => ({
    url: `${BASE_URL}/${path}`.replace(/\/$/, path === "" ? "" : ""),
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
}
