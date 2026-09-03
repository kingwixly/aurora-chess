"use client";

import { useCallback, useEffect, useState } from "react";
import { adminRequest } from "../../lib/adminApi";
import { useToast } from "@aurora/ui";

interface Post {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body?: string;
  publishedAt: string | null;
  updatedAt: string;
  author: { id: string; username: string };
}

/**
 * Blog editor.
 *
 * Drafts are the default. Publishing is a deliberate second action, because a
 * post that goes live the moment you create it means there is no way to write
 * one over two sittings.
 */
export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const showToast = useToast((s) => s.show);

  const load = useCallback(async () => {
    try {
      const res = await adminRequest("get", "/api/v1/admin/blog");
      setPosts(res.data.posts ?? []);
    } catch {
      showToast("Could not load posts", "error");
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    setCreating(true);
    setEditing(null);
    setTitle("");
    setSummary("");
    setBody("");
  }

  async function startEdit(p: Post) {
    try {
      const res = await adminRequest("get", `/api/v1/admin/blog/${p.id}`);
      const full = res.data.post;
      setEditing(full);
      setCreating(false);
      setTitle(full.title);
      setSummary(full.summary);
      setBody(full.body);
    } catch {
      showToast("Could not open that post", "error");
    }
  }

  async function save(publish: boolean) {
    setSaving(true);
    try {
      if (creating) {
        await adminRequest("post", "/api/v1/admin/blog", { title, summary, body, publish });
        showToast(publish ? "Published" : "Draft saved");
      } else if (editing) {
        await adminRequest("patch", `/api/v1/admin/blog/${editing.id}`, {
          title,
          summary,
          body,
          ...(publish ? { publish: true } : {}),
        });
        showToast("Saved");
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not save";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  async function unpublish(p: Post) {
    try {
      await adminRequest("patch", `/api/v1/admin/blog/${p.id}`, { publish: false });
      await load();
    } catch {
      showToast("Could not unpublish", "error");
    }
  }

  async function remove(p: Post) {
    if (!confirm(`Delete "${p.title}" permanently?`)) return;
    try {
      await adminRequest("delete", `/api/v1/admin/blog/${p.id}`);
      await load();
    } catch {
      showToast("Could not delete", "error");
    }
  }

  const open = creating || editing;

  return (
    <main className="p-4 lg:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold">Blog</h1>
        {!open && (
          <button
            onClick={startNew}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            New post
          </button>
        )}
      </div>

      {open ? (
        <div className="mt-4 space-y-3 rounded bg-gray-800 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded bg-gray-900 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One-line summary, shown in the list and in link previews"
            className="w-full rounded bg-gray-900 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            placeholder="Post body. Blank lines separate paragraphs."
            className="w-full rounded bg-gray-900 p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => save(false)}
              disabled={saving || !title.trim() || !body.trim()}
              className="rounded bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600 disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving || !title.trim() || !body.trim()}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              {editing?.publishedAt ? "Save" : "Publish"}
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
              className="rounded px-4 py-2 text-sm text-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {posts.length === 0 && (
            <li className="rounded bg-gray-800 p-4 text-sm text-gray-400">No posts yet.</li>
          )}
          {posts.map((p) => (
            <li key={p.id} className="rounded bg-gray-800 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{p.title}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    p.publishedAt ? "bg-green-600/20 text-green-400" : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {p.publishedAt ? "published" : "draft"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                /{p.slug} &middot; {p.author.username}
                {p.publishedAt && ` · ${new Date(p.publishedAt).toLocaleDateString()}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => startEdit(p)}
                  className="rounded bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
                {p.publishedAt && (
                  <button
                    onClick={() => unpublish(p)}
                    className="rounded bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600"
                  >
                    Unpublish
                  </button>
                )}
                <button
                  onClick={() => remove(p)}
                  className="rounded px-3 py-1 text-xs text-red-400 hover:bg-gray-700"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
