"use client";

import { useEffect, useState, useCallback } from "react";
import { adminRequest } from "../../lib/adminApi";
import { Skeleton } from "@eyeonchess/ui";

interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
  admin: { username: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
  "user.update": "text-blue-400",
  "user.delete": "text-red-400",
  "game.delete": "text-red-400",
  "settings.update": "text-yellow-400",
};

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (actionFilter) params.set("action", actionFilter);
      const data = await adminRequest("get", `/api/v1/admin/audit-log?${params}`);
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter]);

  function formatDetails(details: string | null): string {
    if (!details) return "";
    try {
      const parsed = JSON.parse(details);
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
    } catch {
      return details;
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Audit Log</h1>

      <div className="mb-4">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded"
        >
          <option value="">All Actions</option>
          <option value="user.update">User Updates</option>
          <option value="user.delete">User Deletes</option>
          <option value="game.delete">Game Deletes</option>
          <option value="settings.update">Settings Changes</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-gray-500">No audit entries found.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Admin</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Details</th>
                  <th className="px-3 py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-medium">{log.admin.username}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`font-mono text-xs ${
                          ACTION_COLORS[log.action] || "text-gray-300"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {log.targetType}
                      {log.targetId && (
                        <span className="text-gray-600 ml-1">{log.targetId.slice(0, 8)}...</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs max-w-xs truncate">
                      {formatDetails(log.details)}
                    </td>
                    <td className="px-3 py-2 text-gray-500 font-mono text-xs">{log.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-gray-900 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <span
                    className={`font-mono text-xs ${ACTION_COLORS[log.action] || "text-gray-300"}`}
                  >
                    {log.action}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  by {log.admin.username} &middot; {log.targetType}
                  {log.targetId && ` ${log.targetId.slice(0, 8)}...`}
                </p>
                {log.details && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {formatDetails(log.details)}
                  </p>
                )}
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
    </div>
  );
}
