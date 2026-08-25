"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../lib/api";
import { useAuthStore } from "../../stores/auth";
import { ConfirmModal, Skeleton, useToast } from "@aurora/ui";

interface CollectionItem {
  id: string;
  name: string;
  gameCount: number;
}

export default function CollectionsPage() {
  const router = useRouter();
  const { user, isLoading, fetchMe } = useAuthStore();
  const toast = useToast();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CollectionItem | null>(null);

  useEffect(() => {
    if (!user) fetchMe();
  }, [user, fetchMe]);
  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/v1/collections");
      setCollections(data.collections);
    } catch {
      toast.show("Failed to load collections", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadCollections();
  }, [user, loadCollections]);

  async function createCollection() {
    if (!newName.trim()) return;
    setError("");
    try {
      await api.post("/api/v1/collections", { name: newName.trim() });
      setNewName("");
      await loadCollections();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to create";
      setError(msg);
    }
  }

  async function deleteCollection() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/v1/collections/${deleteTarget.id}`);
      await loadCollections();
    } catch {
      toast.show("Failed to delete collection", "error");
    }
    setDeleteTarget(null);
  }

  if (isLoading || !user) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-night-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-screen p-4 pt-12">
      <div className="max-w-lg w-full space-y-6">
        <h1 className="text-2xl font-bold text-center font-display">Collections</h1>

        {/* Create */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New collection name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createCollection()}
            maxLength={50}
            className="flex-1 px-3 py-2 bg-night-800 border border-night-700 rounded focus:outline-none focus:border-aurora-cyan"
          />
          <button
            onClick={createCollection}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-aurora-cyan hover:bg-[#3ad2e8] disabled:opacity-50 rounded font-medium text-sm transition-colors"
          >
            Create
          </button>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center text-night-400 py-12">
            <p>No collections yet.</p>
            <p className="text-sm mt-1">Create one above to organize your games!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {collections.map((c) => (
              <div
                key={c.id}
                className="bg-night-900 rounded-lg p-4 flex items-center justify-between"
              >
                <Link
                  href={`/collections/${c.id}`}
                  className="flex-1 hover:text-aurora-cyan transition-colors"
                >
                  <span className="font-medium">
                    {c.name === "Favorites" ? "❤️ " : ""}
                    {c.name}
                  </span>
                  <span className="text-night-400 text-sm ml-2">({c.gameCount} games)</span>
                </Link>
                {c.name !== "Favorites" && (
                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link href="/play" className="text-night-400 hover:text-white text-sm">
            &larr; Back to Play
          </Link>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This will remove the collection and all game associations. Games themselves won't be deleted."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={deleteCollection}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}
