"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "../../lib/api";
import { AuroraBand } from "@aurora/ui";

interface Post {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  author: { username: string };
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/v1/blog")
      .then(({ data }) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl tracking-tight">Blog</h1>
        <p className="mt-1 text-sm text-night-400">
          Changes to the site, and the reasoning behind them.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-night-400">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="mt-8 rounded-xl bg-night-900 p-6 text-center text-sm text-night-300 ring-1 ring-inset ring-night-700">
            Nothing published yet.
          </p>
        ) : (
          <ul className="mt-8 space-y-4">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="block rounded-xl bg-night-900 p-5 ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
                >
                  <h2 className="font-display text-lg">{p.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-night-300">{p.summary}</p>
                  <p className="mt-2 text-xs text-night-400">
                    {new Date(p.publishedAt).toLocaleDateString()} &middot; {p.author.username}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
