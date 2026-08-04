"use client";

import { useEffect, useState, useCallback } from "react";
import { adminRequest } from "../../lib/adminApi";
import { useToast } from "@eyeonchess/ui";
import { ConfirmModal } from "@eyeonchess/ui";
import { Skeleton } from "@eyeonchess/ui";

interface Game {
  id: string;
  status: string;
  result: string | null;
  timeControl: string;
  createdAt: string;
  white: { username: string } | null;
  black: { username: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-yellow-600/20 text-yellow-400",
  ACTIVE: "bg-green-600/20 text-green-400",
  COMPLETED: "bg-blue-600/20 text-blue-400",
  ABORTED: "bg-red-600/20 text-red-400",
};

export default function AdminGamesPage() {
  const toast = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const data = await adminRequest("get", `/api/v1/admin/games?${params}`);
      setGames(data.games);
      setPagination(data.pagination);
    } catch {
      toast.show("Failed to load games", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, toast]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  async function deleteGame(id: string) {
    setActionLoading(true);
    try {
      await adminRequest("delete", `/api/v1/admin/games/${id}`);
      toast.show("Game deleted");
      await loadGames();
    } catch {
      toast.show("Delete failed", "error");
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Games</h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by player..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-md px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded"
        >
          <option value="">All Status</option>
          <option value="WAITING">Waiting</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ABORTED">Aborted</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="px-3 py-2">White</th>
                  <th className="px-3 py-2">Black</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="px-3 py-2">{g.white?.username || "—"}</td>
                    <td className="px-3 py-2">{g.black?.username || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          STATUS_COLORS[g.status] || "bg-gray-700"
                        }`}
                      >
                        {g.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{g.result || "—"}</td>
                    <td className="px-3 py-2 text-gray-400">{g.timeControl}</td>
                    <td className="px-3 py-2 text-gray-400">
                      {new Date(g.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setDeleteTarget(g)}
                        className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {games.map((g) => (
              <div key={g.id} className="bg-gray-900 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm">
                      {g.white?.username || "?"} vs {g.black?.username || "?"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {g.timeControl} &middot; {new Date(g.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      STATUS_COLORS[g.status] || "bg-gray-700"
                    }`}
                  >
                    {g.status}
                  </span>
                </div>
                {g.result && <p className="text-xs text-gray-400 mb-2">{g.result}</p>}
                <button
                  onClick={() => setDeleteTarget(g)}
                  className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-sm"
              >
                Prev
              </button>
              <span className="text-sm text-gray-400">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete game?"
        message="This will permanently delete this game and all its moves and analysis. This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={() => deleteTarget && deleteGame(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
