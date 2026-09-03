"use client";

import { useState } from "react";
import { Flag, FLAG_COUNTRIES } from "@aurora/ui";
import EnginePicker from "./EnginePicker";
import api from "../lib/api";
import FlairPicker from "./FlairPicker";
import { useAuthStore } from "../stores/auth";
import { useSettingsStore } from "../stores/settings";

const INPUT =
  "w-full rounded-lg border border-night-700 bg-night-800 px-3.5 py-2.5 text-white placeholder:text-night-400 focus:border-aurora-cyan focus:outline-none";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-night-400">{hint}</span>}
    </label>
  );
}

/**
 * Account management: identity, privacy, and password.
 *
 * Password sits in its own form and its own request. Bundling it with display
 * settings would mean a stray keystroke in a password field blocking an avatar
 * change, and it has a consequence the other fields do not: every session is
 * signed out afterwards.
 */
export default function AccountSettings({ earnedFlairs = [] }: { earnedFlairs?: string[] }) {
  const { user, fetchMe, logout } = useAuthStore();

  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [hideGames, setHideGames] = useState(false);
  const playEngine = useSettingsStore((s) => s.playEngine);
  const setPlayEngine = useSettingsStore((s) => s.setPlayEngine);
  const analysisEngine = useSettingsStore((s) => s.analysisEngine);
  const setAnalysisEngine = useSettingsStore((s) => s.setAnalysisEngine);
  const [countryCode, setCountryCode] = useState(user?.countryCode ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function saveAccount() {
    setSaving(true);
    setMsg(null);
    try {
      await api.patch("/api/v1/auth/account", {
        username,
        email,
        avatarUrl: avatarUrl || null,
        hideRecentGames: hideGames,
        countryCode: countryCode || null,
        bio: bio || null,
        currentPassword: emailPassword || undefined,
      });
      await fetchMe();
      setEmailPassword("");
      setMsg({ text: "Saved", ok: true });
    } catch (err: unknown) {
      setMsg({
        text:
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Could not save",
        ok: false,
      });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setSaving(true);
    setPwMsg(null);
    try {
      await api.post("/api/v1/auth/password", { currentPassword, newPassword });
      setPwMsg({ text: "Password changed. Signing you out...", ok: true });
      // Every session is revoked server-side, so staying on the page would
      // leave a UI that looks signed in and is not.
      setTimeout(() => {
        logout();
        window.location.href = "/login";
      }, 1200);
    } catch (err: unknown) {
      setPwMsg({
        text:
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Could not change password",
        ok: false,
      });
    } finally {
      setSaving(false);
    }
  }

  const emailChanged = email !== (user?.email ?? "");

  return (
    <div className="space-y-4">
      <Row label="Username" hint="3-20 characters: letters, numbers, hyphen or underscore.">
        <input value={username} onChange={(e) => setUsername(e.target.value)} className={INPUT} />
      </Row>

      <Row label="Avatar URL" hint="An https link to an image. Leave empty for your initial.">
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
          className={INPUT}
        />
      </Row>

      <Row label="Country" hint="Shows a flag beside your name.">
        {/* The list stays plain text: a <select> cannot render SVG, so the
            chosen flag is previewed alongside instead. */}
        {countryCode && (
          <span className="mb-1.5 inline-flex items-center gap-2 text-sm text-night-400">
            <Flag code={countryCode} size={16} /> Currently shown beside your name
          </span>
        )}
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className={INPUT}
        >
          <option value="">No country</option>
          {FLAG_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Bio" hint="300 characters, shown on your profile. No links.">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={300}
          className={INPUT}
        />
      </Row>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Engine for bot games</span>
        <span className="mb-2 block text-xs text-night-400">
          Runs in your browser and is cached after the first download.
        </span>
        <EnginePicker purpose="play" value={playEngine} onChange={setPlayEngine} />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Engine for analysis</span>
        <span className="mb-2 block text-xs text-night-400">
          Used by the analysis board and by game review.
        </span>
        <EnginePicker purpose="analyse" value={analysisEngine} onChange={setAnalysisEngine} />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Flair</span>
        <FlairPicker earned={earnedFlairs} />
        <span className="mt-1 block text-xs text-night-400">
          One badge you have earned, worn beside your name.
        </span>
      </div>

      <Row label="Email">
        <input value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
      </Row>

      {emailChanged && (
        <Row
          label="Current password"
          hint="Required to change your email - it is where password resets are sent."
        >
          <input
            type="password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            className={INPUT}
          />
        </Row>
      )}

      <label className="flex cursor-pointer items-start justify-between gap-4 py-1">
        <span>
          <span className="font-medium">Hide my recent games</span>
          <span className="mt-0.5 block text-sm text-night-400">
            Other players will not see your game history on your profile. You still will.
          </span>
        </span>
        <input
          type="checkbox"
          checked={hideGames}
          onChange={(e) => setHideGames(e.target.checked)}
          className="mt-1.5 h-5 w-5 shrink-0"
        />
      </label>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-300"}`}>{msg.text}</p>
      )}

      <button
        onClick={saveAccount}
        disabled={saving}
        className="w-full rounded-lg bg-aurora-cyan py-2.5 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8] disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save account details"}
      </button>

      <hr className="border-night-700" />

      <h3 className="text-sm font-medium">Change password</h3>
      <Row label="Current password">
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={INPUT}
        />
      </Row>
      <Row
        label="New password"
        hint="At least 8 characters. All other sessions will be signed out."
      >
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={INPUT}
        />
      </Row>

      {pwMsg && (
        <p className={`text-sm ${pwMsg.ok ? "text-emerald-400" : "text-red-300"}`}>{pwMsg.text}</p>
      )}

      <button
        onClick={changePassword}
        disabled={saving || !currentPassword || newPassword.length < 8}
        className="w-full rounded-lg py-2.5 font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800 disabled:opacity-40"
      >
        Change password
      </button>
    </div>
  );
}
