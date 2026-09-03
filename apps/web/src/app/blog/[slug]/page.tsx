"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "../../../lib/api";
import { AuroraBand } from "@aurora/ui";

interface Post {
  slug: string;
  title: string;
  summary: string;
  body: string;
  publishedAt: string;
  updatedAt: string;
  author: { username: string };
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/v1/blog/${slug}`)
      .then(({ data }) => setPost(data.post))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night-950">
        <p className="text-night-400">Loading...</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-night-950">
        <p className="text-night-300">That post does not exist.</p>
        <Link href="/blog" className="text-sm text-aurora-cyan hover:underline">
          Back to the blog
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <article className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/blog" className="text-sm text-night-400 hover:text-white">
          &larr; Blog
        </Link>
        <h1 className="mt-4 font-display text-3xl leading-tight tracking-tight">{post.title}</h1>
        <p className="mt-2 text-xs text-night-400">
          {new Date(post.publishedAt).toLocaleDateString()} &middot; {post.author.username}
        </p>

        {/* Rendered as plain paragraphs rather than parsed markdown.
            Bringing in a markdown renderer means bringing in its sanitiser too,
            and staff-written prose does not need the surface area. */}
        <div className="mt-6 space-y-4">
          {post.body.split(/\n\n+/).map((para, i) => (
            <p key={i} className="leading-relaxed text-night-200">
              {para}
            </p>
          ))}
        </div>
      </article>
    </main>
  );
}
