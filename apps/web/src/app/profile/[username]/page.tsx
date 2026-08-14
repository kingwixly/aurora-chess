"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth";
import CollectionPicker from "../../../components/CollectionPicker";
import StreakBadge from "../../../components/stats/StreakBadge";
import {
  AuroraBand,
  TitleBadge,
  PlayerName,
  ModShield,
  FlairIcon,
  FideVerifiedMark,
  FideProfilePanel,
  BadgeShelf,
  StaffMark,
} from "@aurora/ui";
import RatingPools from "../../../components/RatingPools";
import ReportDialog from "../../../components/ReportDialog";
import type { Title } from "@aurora/chess";
import { FIDE_PANEL_TITLE_LABELS, flagEmoji, getCountry } from "@aurora/chess";

interface RecentGame {
  id: string;
  result: string | null;
  termination: string | null;
  timeControl: string;
  createdAt: string;
  whiteId: string | null;
  blackId: string | null;
  white: { username: string; title: Title | null } | null;
  black: { username: string; title: Title | null } | null;
}

interface PoolRating {
  timeControl: string;
  rating: number;
  peak: number;
  games: number;
}

interface ProfileBadgeData {
  key: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  pinned: boolean;
}

interface UserProfile {
  id: string;
  username: string;
  title: Title | null;
  modShield?: boolean;
  fideVerified?: boolean;
  staffRank?: string | null;
  countryCode?: string | null;
  bio?: string | null;
  activeFlair?: string | null;
  rating: number;
  ratings?: PoolRating[];
  badges?: ProfileBadgeData[];
  fideProfile?: {
    standard?: number | null;
    rapid?: number | null;
    blitz?: number | null;
    arenaTitles?: string[];
    profileUrl?: string | null;
    federation?: string | null;
    fideId?: string | null;
  } | null;
  avatarUrl: string | null;
  createdAt: string;
  stats: { wins: number; losses: number; draws: number; total: number };
  recentGames: RecentGame[];
  isH2H: boolean;
}

type FriendshipState = "none" | "pending" | "friends" | "incoming";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { user: currentUser, fetchMe } = useAuthStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendState, setFriendState] = useState<FriendshipState>("none");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [h2hMode, setH2hMode] = useState(true);
  const [favoriteGameId, setFavoriteGameId] = useState<string | null>(null);
  const [streaks, setStreaks] = useState<{
    current: { type: "win" | "loss" | "none"; count: number };
    bestWin: number;
  } | null>(null);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const isOther = currentUser && currentUser.username !== username;
        const vsParam = isOther && h2hMode ? `?vsUserId=${currentUser.id}` : "";
        const { data } = await api.get(`/api/v1/users/${username}${vsParam}`);
        setProfile(data.user);

        if (currentUser && data.user.id !== currentUser.id) {
          const [friendsRes, requestsRes] = await Promise.all([
            api.get("/api/v1/friends"),
            api.get("/api/v1/friends/requests"),
          ]);
          const friend = friendsRes.data.friends.find(
            (f: { id: string; friendshipId: string }) => f.id === data.user.id
          );
          if (friend) {
            setFriendState("friends");
            setFriendshipId(friend.friendshipId);
            return;
          }
          const incoming = requestsRes.data.requests.find(
            (r: { id: string; friendshipId: string }) => r.id === data.user.id
          );
          if (incoming) {
            setFriendState("incoming");
            setFriendshipId(incoming.friendshipId);
            return;
          }
          setFriendState("none");
        }
      } catch {
        setError("User not found");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username, currentUser, h2hMode]);

  // Fetch streaks for own profile
  useEffect(() => {
    if (!isOwnProfile) return;
    api
      .get("/api/v1/stats")
      .then(({ data }) => {
        if (data.streaks) setStreaks(data.streaks);
      })
      .catch(() => {});
  }, [isOwnProfile]);

  async function sendRequest() {
    setActionLoading(true);
    try {
      await api.post("/api/v1/friends/request", { username });
      setFriendState("pending");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to send request";
      if (msg.includes("pending")) setFriendState("pending");
      else setError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function acceptRequest() {
    if (!friendshipId) return;
    setActionLoading(true);
    try {
      await api.post("/api/v1/friends/accept", { friendshipId });
      setFriendState("friends");
    } catch {
      setError("Failed to accept");
    } finally {
      setActionLoading(false);
    }
  }

  async function removeFriend() {
    if (!friendshipId) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/v1/friends/${friendshipId}`);
      setFriendState("none");
      setFriendshipId(null);
    } catch {
      setError("Failed to remove");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-night-400">Loading...</p>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-red-400">{error || "User not found"}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto w-full max-w-2xl space-y-4 px-6 py-10">
        <Link href="/play" className="text-sm text-night-400 transition-colors hover:text-white">
          &larr; Back to play
        </Link>

        {/* Header */}
        <div className="rounded-xl bg-night-900 p-6 ring-1 ring-inset ring-night-700">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-night-800 font-display text-2xl font-bold">
              {profile.username[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 font-display text-3xl tracking-tight">
                {profile.fideVerified && <FideVerifiedMark size={22} />}
                {profile.staffRank && <StaffMark rank={profile.staffRank} size={22} />}
                {profile.modShield && <ModShield />}
                <TitleBadge title={profile.title} />
                <span className="truncate">{profile.username}</span>
                <FlairIcon flairKey={profile.activeFlair} />
              </h1>
              <p className="mt-1 text-sm text-night-400">
                {getCountry(profile.countryCode) && (
                  <span className="mr-2">
                    {flagEmoji(profile.countryCode)} {getCountry(profile.countryCode)!.name}
                  </span>
                )}
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="rounded-xl bg-night-900 px-5 py-4 text-sm leading-relaxed text-night-300 ring-1 ring-inset ring-night-700">
            {profile.bio}
          </p>
        )}

        {/* Ratings by time control. The pooled figure alone hid the fact that
            a player can be a very different strength at bullet and classical. */}
        <section>
          <h2 className="mb-2 text-xs uppercase tracking-wider text-night-500">
            Ratings by time control
          </h2>
          <RatingPools ratings={profile.ratings} />
        </section>

        {/* Badges: profile only, never beside a username elsewhere. */}
        <section>
          <h2 className="mb-2 text-xs uppercase tracking-wider text-night-500">Badges</h2>
          <BadgeShelf badges={profile.badges ?? []} />
        </section>

        {/* Staff-maintained FIDE detail, only when they have enabled it. */}
        {profile.fideProfile && (
          <FideProfilePanel data={profile.fideProfile} titleLabels={FIDE_PANEL_TITLE_LABELS} />
        )}

        {/* H2H toggle (only when viewing other profile while logged in) */}
        {currentUser && !isOwnProfile && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setH2hMode(true)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                h2hMode ? "bg-aurora-cyan" : "bg-night-800 hover:bg-night-800"
              }`}
            >
              vs Me
            </button>
            <button
              onClick={() => setH2hMode(false)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                !h2hMode ? "bg-aurora-cyan" : "bg-night-800 hover:bg-night-800"
              }`}
            >
              All Games
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-night-900 rounded p-3 text-center">
            <p className="text-2xl font-bold font-display">{profile.rating}</p>
            <p className="text-night-400 text-xs">Rating</p>
          </div>
          <div className="bg-night-900 rounded p-3 text-center">
            <p className="text-2xl font-bold font-display">{profile.stats.total}</p>
            <p className="text-night-400 text-xs">Games</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-night-900 rounded p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{profile.stats.wins}</p>
            <p className="text-night-400 text-xs">Wins</p>
          </div>
          <div className="bg-night-900 rounded p-3 text-center">
            <p className="text-lg font-bold text-red-400">{profile.stats.losses}</p>
            <p className="text-night-400 text-xs">Losses</p>
          </div>
          <div className="bg-night-900 rounded p-3 text-center">
            <p className="text-lg font-bold text-night-300">{profile.stats.draws}</p>
            <p className="text-night-400 text-xs">Draws</p>
          </div>
        </div>

        {streaks && isOwnProfile && (
          <StreakBadge current={streaks.current} bestWin={streaks.bestWin} />
        )}

        {/* Friend actions */}
        {!isOwnProfile && currentUser && (
          <div className="text-center">
            {friendState === "none" && (
              <button
                onClick={sendRequest}
                disabled={actionLoading}
                className="px-4 py-2 bg-aurora-cyan hover:bg-[#3ad2e8] disabled:opacity-50 rounded font-medium transition-colors"
              >
                Add Friend
              </button>
            )}
            {friendState === "pending" && (
              <span className="text-yellow-400 text-sm">Request Pending</span>
            )}
            {friendState === "incoming" && (
              <button
                onClick={acceptRequest}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded font-medium transition-colors"
              >
                Accept Request
              </button>
            )}
            {friendState === "friends" && (
              <button
                onClick={removeFriend}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 rounded font-medium transition-colors"
              >
                Remove Friend
              </button>
            )}
          </div>
        )}

        {/* Recent games */}
        {profile.recentGames && profile.recentGames.length > 0 && (
          <div className="bg-night-900 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-night-400 mb-3">
              {profile.isH2H ? "Games Between Us" : "Recent Games"}
            </h2>
            <div className="space-y-2">
              {profile.recentGames.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between bg-night-800 rounded p-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">
                      {g.white ? (
                        <PlayerName username={g.white.username} title={g.white.title} size="sm" />
                      ) : (
                        "?"
                      )}{" "}
                      vs{" "}
                      {g.black ? (
                        <PlayerName username={g.black.username} title={g.black.title} size="sm" />
                      ) : (
                        "?"
                      )}
                    </p>
                    <p className="text-xs text-night-500">
                      {g.result || "—"} &middot; {g.timeControl} &middot;{" "}
                      {new Date(g.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => setFavoriteGameId(g.id)}
                      className="px-1.5 py-0.5 text-xs hover:text-red-400 transition-colors"
                      title="Add to collection"
                    >
                      ♡
                    </button>
                    <Link
                      href={`/game/${g.id}/analysis`}
                      className="px-2 py-0.5 bg-night-800 hover:bg-night-700 rounded text-xs transition-colors"
                    >
                      Analyse
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => router.back()}
            className="text-sm text-night-400 transition-colors hover:text-white"
          >
            &larr; Back
          </button>
          {currentUser && currentUser.username !== profile.username && (
            <button
              onClick={() => setReporting(true)}
              className="ml-4 text-xs text-night-500 transition-colors hover:text-red-300"
            >
              Report this player
            </button>
          )}
        </div>
      </div>

      {reporting && (
        <ReportDialog targetUsername={profile.username} onClose={() => setReporting(false)} />
      )}

      {/* Collection picker */}
      {favoriteGameId && (
        <CollectionPicker
          gameId={favoriteGameId}
          open={true}
          onClose={() => setFavoriteGameId(null)}
        />
      )}
    </main>
  );
}
