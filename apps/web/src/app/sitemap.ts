import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost";
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/register`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/play`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/play/bot`, changeFrequency: "weekly", priority: 0.7 },
  ];
}
