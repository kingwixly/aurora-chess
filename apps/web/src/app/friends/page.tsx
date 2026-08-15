"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../lib/api";
import { useToast } from "@aurora/ui";
import PlayerSearch from "../../components/PlayerSearch";
import { useAuthStore } from "../../stores/auth";

interface Friend {
  friendshipId: string;
  id: string;
  username: string;
  rating: number;
  avatarUrl: string | null;
  isOnline: boolean;
}

interface FriendRequest {
  friendshipId: string;
  id: string;
  username: string;
  rating: number;
  avatarUrl: string | null;
  createdAt: string;
}

interface SearchUser {
  id: string;
  username: string;
  rating: number;
  avatarUrl: string | null;
}

export default function FriendsPage() {
  const router = useRouter();
  const { user, isLoading, fetchMe } = useAuthStore();
  const toast = useToast();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [filter, setFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  // Filtering people you already know is a different job from searching the
  // whole site, which is why they are separate controls rather than one box.
  const visibleFriends = useMemo<Friend[]>(() => {
    const term = filter.trim().toLowerCase();
    return friends.filter(
      (f) => (!onlineOnly || f.isOnline) && (term === "" || f.username.toLowerCase().includes(term))
    );
  }, [friends, filter, onlineOnly]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  const loadData = useCallback(async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.get("/api/v1/friends"),
        api.get("/api/v1/friends/requests"),
      ]);
      setFriends(friendsRes.data.friends);
      setRequests(requestsRes.data.requests);
    } catch {
      toast.show("Failed to load friends", "error");
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/api/v1/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data.users);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function sendRequest(username: string) {
    try {
      await api.post("/api/v1/friends/request", { username });
      setMessage(`Friend request sent to ${username}`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to send request";
      setMessage(msg);
      setTimeout(() => setMessage(""), 3000);
    }
  }

  async function acceptRequest(friendshipId: string) {
    try {
      await api.post("/api/v1/friends/accept", { friendshipId });
      await loadData();
    } catch {
      setMessage("Failed to accept request");
      setTimeout(() => setMessage(""), 3000);
    }
  }

  async function declineRequest(friendshipId: string) {
    try {
      await api.post("/api/v1/friends/decline", { friendshipId });
      setRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
    } catch {
      setMessage("Failed to decline request");
      setTimeout(() => setMessage(""), 3000);
    }
  }

  async function removeFriend(friendshipId: string) {
    try {
      await api.delete(`/api/v1/friends/${friendshipId}`);
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
    } catch {
      setMessage("Failed to remove friend");
      setTimeout(() => setMessage(""), 3000);
    }
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
        <h1 className="text-2xl font-bold text-center font-display">Friends</h1>

        {message && <p className="text-sm text-center text-yellow-400">{message}</p>}

        {/* Deliberately separated from the friend filter above and labelled
            differently: one narrows people you already know, the other reaches
            the whole site. Identical-looking bars side by side is what made
            them feel like one broken control. */}
        <div className="rounded-xl bg-night-900 p-4 ring-1 ring-inset ring-aurora-cyan/20">
          <h2 className="font-display text-lg font-semibold">Find new players</h2>
          <p className="mb-3 text-xs text-night-400">
            Searches every account on Aurora, including anyone who has changed their name.
          </p>
          <input
            type="text"
            placeholder="Search all of Aurora by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-night-800 border border-night-700 rounded focus:outline-none focus:border-aurora-cyan"
          />
          {searching && <p className="text-night-400 text-sm mt-2">Searching...</p>}
          {searchResults.length > 0 && (
            <ul className="mt-3 space-y-2">
              {searchResults.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between bg-night-800 rounded p-2"
                >
                  <Link
                    href={`/profile/${u.username}`}
                    className="hover:text-aurora-cyan transition-colors"
                  >
                    <span className="font-medium">{u.username}</span>
                    <span className="text-night-400 text-sm ml-2">({u.rating})</span>
                  </Link>
                  <button
                    onClick={() => sendRequest(u.username)}
                    className="text-xs px-2 py-1 bg-aurora-cyan hover:bg-[#3ad2e8] rounded transition-colors"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Incoming Requests */}
        {requests.length > 0 && (
          <div className="bg-night-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Incoming Requests ({requests.length})</h2>
            <ul className="space-y-2">
              {requests.map((r) => (
                <li
                  key={r.friendshipId}
                  className="flex items-center justify-between bg-night-800 rounded p-2"
                >
                  <Link
                    href={`/profile/${r.username}`}
                    className="hover:text-aurora-cyan transition-colors"
                  >
                    <span className="font-medium">{r.username}</span>
                    <span className="text-night-400 text-sm ml-2">({r.rating})</span>
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest(r.friendshipId)}
                      className="text-xs px-2 py-1 bg-emerald-500 hover:bg-emerald-400 rounded transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => declineRequest(r.friendshipId)}
                      className="text-xs px-2 py-1 bg-night-700 hover:bg-night-600 rounded transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Friends List */}
        <div className="rounded-xl bg-night-900 p-4 ring-1 ring-inset ring-night-700">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">
              Friends ({visibleFriends.length}
              {visibleFriends.length !== friends.length && ` of ${friends.length}`})
            </h2>
            <Link
              href="/messages"
              className="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
            >
              Messages
            </Link>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter this list"
              className="min-w-0 flex-1 rounded-lg border border-night-700 bg-night-800 px-3 py-2 text-sm outline-none focus:border-aurora-cyan"
            />
            <button
              onClick={() => setOnlineOnly((v) => !v)}
              aria-pressed={onlineOnly}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                onlineOnly
                  ? "bg-aurora-cyan text-night-950"
                  : "ring-1 ring-inset ring-night-700 hover:bg-night-800"
              }`}
            >
              Online only
            </button>
          </div>

          {friends.length === 0 ? (
            <p className="text-sm text-night-400">
              No friends yet. Use the search below to find players.
            </p>
          ) : visibleFriends.length === 0 ? (
            <p className="text-sm text-night-400">No friends match that.</p>
          ) : (
            <ul className="space-y-2">
              {visibleFriends.map((f) => (
                <li
                  key={f.friendshipId}
                  className="flex items-center justify-between bg-night-800 rounded p-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        f.isOnline ? "bg-green-400" : "bg-night-700"
                      }`}
                    />
                    <Link
                      href={`/profile/${f.username}`}
                      className="hover:text-aurora-cyan transition-colors"
                    >
                      <span className="font-medium">{f.username}</span>
                      <span className="ml-2 text-sm text-night-400">({f.rating})</span>
                    </Link>
                  </div>
                  <button
                    onClick={() => removeFriend(f.friendshipId)}
                    className="text-xs px-2 py-1 bg-red-500/30 hover:bg-red-500 text-red-400 hover:text-white rounded transition-colors"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-center">
          <Link href="/play" className="text-night-400 hover:text-white text-sm">
            &larr; Back to Play
          </Link>
        </div>
      </div>
    </main>
  );
}
