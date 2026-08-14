import type { MetadataRoute } from "next";

/**
 * Sitemap.
 *
 * Public pages only. Anything behind a login is excluded — listing `/messages`
 * or `/standing` invites crawlers to hammer routes that will only ever return a
 * redirect, and a punishment record has no business in a search index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost";
  const now = new Date();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/register`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/play`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/play/bot`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/puzzles`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/analysis`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/leaderboard`, changeFrequency: "daily", priority: 0.6 },
    // Public and worth indexing: how moderation works is the thing prospective
    // players most want to know before signing up.
    { url: `${baseUrl}/fair-play`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
