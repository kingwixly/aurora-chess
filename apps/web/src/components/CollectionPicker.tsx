"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";

interface Collection {
  id: string;
  name: string;
}

interface CollectionPickerProps {
  gameId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Renders a modal with a checkbox list of the user's game collections,
 * allowing them to add or remove a game from each collection.
 *
 * @param props - {@link CollectionPickerProps}
 * @returns The collection picker modal, or null when not open.
 */
export default function CollectionPicker({ gameId, open, onClose }: CollectionPickerProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    async function load() {
      setLoading(true);
      try {
        const [colRes, memRes] = await Promise.all([
          api.get("/api/v1/collections"),
          api.get(`/api/v1/games/${gameId}/collections`),
        ]);
        setCollections(colRes.data.collections);
        setMemberOf(new Set(memRes.data.collections.map((c: Collection) => c.id)));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [open, gameId]);

  async function toggle(collectionId: string) {
    const isMember = memberOf.has(collectionId);
    try {
      if (isMember) {
        await api.delete(`/api/v1/collections/${collectionId}/games/${gameId}`);
        setMemberOf((prev) => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
      } else {
        await api.post(`/api/v1/collections/${collectionId}/games`, { gameId });
        setMemberOf((prev) => new Set(prev).add(collectionId));
      }
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-4 max-w-xs w-full mx-4">
        <h3 className="text-sm font-bold mb-3">Add to Collection</h3>
        {loading ? (
          <p className="text-gray-400 text-xs">Loading...</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {collections.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 cursor-pointer text-sm p-1 hover:bg-gray-800 rounded"
              >
                <input
                  type="checkbox"
                  checked={memberOf.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="rounded"
                />
                <span>
                  {c.name === "Favorites" ? "❤️ " : ""}
                  {c.name}
                </span>
              </label>
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full mt-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
