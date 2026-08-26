"use client";

import { useEffect, useState, useCallback } from "react";
import { adminRequest } from "../../lib/adminApi";
import { useToast } from "@aurora/ui";
import { ConfirmModal } from "@aurora/ui";
import { Skeleton } from "@aurora/ui";
import { TitleBadge } from "@aurora/ui";
import { resolveTitle } from "@aurora/chess";
import type { ManualTitle, AutoTitle } from "@aurora/chess";
import TitleEditor from "../../components/TitleEditor";
import AdminUserPanel from "../../components/AdminUserPanel";

interface User {
  id: string;
  email: string;
  username: string;
  rating: number;
  peakRating: number;
  role: string;
  active: boolean;
  verified: boolean;
  createdAt: string;
  titleManual: ManualTitle | null;
  titleAuto: AutoTitle | null;
  titleAutoLocked: boolean;
  titleBanned: boolean;
  titleBanReason: string | null;
  fideVerified?: boolean;
  fideId?: string | null;
  cheatExempt?: boolean;
  usernameHistory?: { username: string; changedAt: string }[];
  fideProfile?: {
    enabled?: boolean;
    standard?: number | null;
    rapid?: number | null;
    blitz?: number | null;
    arenaTitles?: string[];
    profileUrl?: string | null;
    federation?: string | null;
  } | null;
  badges?: { badgeKey: string }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  // Select the function, not the store. Subscribing to the whole store
  // makes this a new reference on every toast, which turns any dependent
  // callback into an unstable one and any dependent effect into a loop.
  const showToast = useToast((s) => s.show);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{
    type: "delete" | "toggle";
    user: User;
    field?: string;
    value?: unknown;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [titleEditing, setTitleEditing] = useState<User | null>(null);
  const [panelUser, setPanelUser] = useState<User | null>(null);

  // Create user
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("USER");
  const [creating, setCreating] = useState(false);

  function generatePassword() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
    let pw = "";
    const arr = new Uint8Array(20);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 20; i++) pw += chars[arr[i] % chars.length];
    setNewPassword(pw);
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(newPassword);
      showToast("Password copied to clipboard");
    } catch {
      showToast("Failed to copy", "error");
    }
  }

  async function createUser() {
    setCreating(true);
    try {
      await adminRequest("post", "/api/v1/admin/users", {
        email: newEmail,
        username: newUsername,
        password: newPassword,
        role: newRole,
        verified: true,
      });
      showToast("User created");
      setShowCreate(false);
      setNewEmail("");
      setNewUsername("");
      setNewPassword("");
      setNewRole("USER");
      await loadUsers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to create user";
      showToast(msg, "error");
    } finally {
      setCreating(false);
    }
  }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const data = await adminRequest("get", `/api/v1/admin/users?${params}`);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function updateUser(id: string, data: Record<string, unknown>) {
    setActionLoading(true);
    try {
      await adminRequest("patch", `/api/v1/admin/users/${id}`, data);
      showToast("User updated");
      await loadUsers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Update failed";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  async function updateTitle(id: string, patch: Record<string, unknown>) {
    setActionLoading(true);
    try {
      await adminRequest("patch", `/api/v1/admin/users/${id}/title`, patch);
      showToast("Titles updated");
      await loadUsers();
      setTitleEditing(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Title update failed";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  }

  /** FIDE verification and the profile panel. */
  async function saveFide(id: string, patch: Record<string, unknown>) {
    setActionLoading(true);
    try {
      await adminRequest("patch", `/api/v1/admin/users/${id}/fide`, patch);
      showToast("FIDE details updated");
      await loadUsers();
      setPanelUser(null);
    } catch (err: unknown) {
      showToast(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          "Update failed",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  /** Manual rating correction. Recomputes their automatic title. */
  async function saveRating(id: string, rating: number, ratingReason: string) {
    setActionLoading(true);
    try {
      await adminRequest("patch", `/api/v1/admin/users/${id}`, { rating, ratingReason });
      showToast("Rating updated");
      await loadUsers();
      setPanelUser(null);
    } catch (err: unknown) {
      showToast(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          "Rating update failed",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleBadge(id: string, badgeKey: string, granted: boolean, evidence: string) {
    setActionLoading(true);
    try {
      await adminRequest("patch", `/api/v1/admin/users/${id}/badges`, {
        badgeKey,
        granted,
        evidence: evidence || undefined,
      });
      showToast(granted ? "Badge granted" : "Badge revoked");
      await loadUsers();
    } catch (err: unknown) {
      showToast(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          "Badge update failed",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteUser(id: string) {
    setActionLoading(true);
    try {
      await adminRequest("delete", `/api/v1/admin/users/${id}`);
      showToast("User deleted");
      await loadUsers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Delete failed";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Users</h1>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by username or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-md px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors whitespace-nowrap"
        >
          + Create User
        </button>
      </div>

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold mb-4">Create User</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded font-mono text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Min 8 characters"
                  />
                  <button
                    onClick={generatePassword}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-xs font-medium transition-colors"
                    title="Generate strong password"
                  >
                    Generate
                  </button>
                  {newPassword && (
                    <button
                      onClick={copyPassword}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createUser}
                disabled={creating || !newEmail || !newUsername || newPassword.length < 8}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded font-medium transition-colors"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Verified</th>
                  <th className="px-3 py-2">Joined</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="px-3 py-2 font-medium">{u.username}</td>
                    <td className="px-3 py-2 text-gray-400">{u.email}</td>
                    <td className="px-3 py-2">{u.rating}</td>
                    <td className="px-3 py-2">
                      {u.titleBanned ? (
                        <span
                          title={u.titleBanReason || "Title banned"}
                          className="text-xs font-semibold text-red-400"
                        >
                          BANNED
                        </span>
                      ) : (
                        <TitleBadge
                          title={resolveTitle({
                            titleManual: u.titleManual,
                            titleAuto: u.titleAuto,
                            titleBanned: u.titleBanned,
                          })}
                          size="sm"
                        />
                      )}
                      {u.titleAutoLocked && (
                        <span
                          className="ml-1 text-xs text-gray-500"
                          title="Automatic title overridden"
                        >
                          &#128274;
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          u.role === "ADMIN"
                            ? "bg-purple-600/20 text-purple-400"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          u.active ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
                        }`}
                      >
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {u.verified ? (
                        <span className="text-green-400 text-xs">Yes</span>
                      ) : (
                        <span className="text-gray-500 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            setConfirm({
                              type: "toggle",
                              user: u,
                              field: "active",
                              value: !u.active,
                            })
                          }
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          {u.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => setPanelUser(u)}
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          Manage
                        </button>
                        <button
                          onClick={() => setTitleEditing(u)}
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          Titles
                        </button>
                        <button
                          onClick={() =>
                            setConfirm({
                              type: "toggle",
                              user: u,
                              field: "role",
                              value: u.role === "ADMIN" ? "USER" : "ADMIN",
                            })
                          }
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          {u.role === "ADMIN" ? "Demote" : "Promote"}
                        </button>
                        <button
                          onClick={() => setConfirm({ type: "delete", user: u })}
                          className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {users.map((u) => (
              <div key={u.id} className="bg-gray-900 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{u.username}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <div className="flex gap-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        u.role === "ADMIN"
                          ? "bg-purple-600/20 text-purple-400"
                          : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {u.role}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        u.active ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
                      }`}
                    >
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <button
                    onClick={() =>
                      setConfirm({
                        type: "toggle",
                        user: u,
                        field: "active",
                        value: !u.active,
                      })
                    }
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                  >
                    {u.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() =>
                      setConfirm({
                        type: "toggle",
                        user: u,
                        field: "role",
                        value: u.role === "ADMIN" ? "USER" : "ADMIN",
                      })
                    }
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                  >
                    {u.role === "ADMIN" ? "Demote" : "Promote"}
                  </button>
                  <button
                    onClick={() => setConfirm({ type: "delete", user: u })}
                    className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
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

      {/* Confirm modal */}
      <ConfirmModal
        open={!!confirm}
        title={
          confirm?.type === "delete"
            ? `Delete ${confirm?.user?.username}?`
            : `${confirm?.field === "role" ? (confirm?.value === "ADMIN" ? "Promote" : "Demote") : confirm?.value ? "Activate" : "Deactivate"} ${confirm?.user?.username}?`
        }
        message={
          confirm?.type === "delete"
            ? "This will permanently delete this user and all their data. This cannot be undone."
            : `Are you sure you want to ${confirm?.field === "role" ? (confirm?.value === "ADMIN" ? "promote to admin" : "demote to user") : confirm?.value ? "activate" : "deactivate"} this user?`
        }
        confirmLabel={confirm?.type === "delete" ? "Delete" : "Confirm"}
        confirmVariant={confirm?.type === "delete" ? "danger" : "primary"}
        loading={actionLoading}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === "delete") {
            deleteUser(confirm.user.id);
          } else {
            updateUser(confirm.user.id, {
              [confirm.field!]: confirm.value,
            });
          }
        }}
        onCancel={() => setConfirm(null)}
      />
      {panelUser && (
        <AdminUserPanel
          user={panelUser}
          saving={actionLoading}
          onClose={() => setPanelUser(null)}
          onSaveFide={(patch) => saveFide(panelUser.id, patch)}
          onSaveRating={(rating, reason) => saveRating(panelUser.id, rating, reason)}
          onToggleBadge={(key, granted, evidence) =>
            toggleBadge(panelUser.id, key, granted, evidence)
          }
          onToggleExempt={async (exempt) => {
            setActionLoading(true);
            try {
              await adminRequest("patch", `/api/v1/admin/users/${panelUser.id}/exempt`, {
                cheatExempt: exempt,
              });
              showToast(exempt ? "Exempted from detection" : "Exemption removed");
              await loadUsers();
              setPanelUser(null);
            } finally {
              setActionLoading(false);
            }
          }}
        />
      )}

      {titleEditing && (
        <TitleEditor
          user={titleEditing}
          saving={actionLoading}
          onClose={() => setTitleEditing(null)}
          onSave={(patch) => updateTitle(titleEditing.id, patch)}
        />
      )}
    </div>
  );
}
