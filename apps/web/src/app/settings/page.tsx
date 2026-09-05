"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuroraBand, PlayerName } from "@aurora/ui";
import SignedOut from "../../components/SignedOut";
import AccountSettings from "../../components/AccountSettings";
import api from "../../lib/api";
import { useAuthStore } from "../../stores/auth";
import { useSettingsStore, BoardTheme, MaterialStyle, PieceSet } from "../../stores/settings";

const BOARD_THEMES: { key: BoardTheme; label: string; light: string; dark: string }[] = [
  { key: "classic", label: "Classic", light: "#f0d9b5", dark: "#b58863" },
  { key: "wood", label: "Wood", light: "#e8c98e", dark: "#a67c52" },
  { key: "green", label: "Green", light: "#ffffdd", dark: "#86a666" },
  { key: "blue", label: "Blue", light: "#dee3e6", dark: "#8ca2ad" },
  { key: "purple", label: "Purple", light: "#e8d0ff", dark: "#9070b0" },
  { key: "dark", label: "Dark", light: "#4b4847", dark: "#302e2b" },
];

const PIECE_SETS: { key: PieceSet; label: string; note: string }[] = [
  { key: "fontaine", label: "Fontaine", note: "The Aurora default" },
  { key: "sleek", label: "Sleek", note: "Solid and outline" },
  { key: "fae", label: "Fae", note: "Soft, rounded" },
  { key: "fatty", label: "Fatty", note: "Chunky and solid" },
];

const MATERIAL_STYLES: { key: MaterialStyle; label: string; hint: string; sample: string }[] = [
  {
    key: "compact",
    label: "Difference only",
    hint: "Just the material you are up, the way most online sites show it.",
    sample: "\u265E +2",
  },
  {
    key: "board",
    label: "Everything captured",
    hint: "Every piece you have taken, the way it looks over the board.",
    sample: "\u265B\u265C\u265D\u265F\u265F",
  },
];

/** A small live preview of a board theme, so the swatch means something. */
function ThemeSwatch({ light, dark }: { light: string; dark: string }) {
  return (
    <div className="grid h-12 w-12 grid-cols-4 overflow-hidden rounded-md" aria-hidden="true">
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} style={{ background: (Math.floor(i / 4) + i) % 2 === 0 ? light : dark }} />
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-night-900 p-5 ring-1 ring-inset ring-night-700">
      <h2 className="mb-4 text-xs uppercase tracking-wider text-night-400">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-night-400">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-6 w-11 shrink-0 overflow-hidden rounded-full p-0 transition-colors ${
          checked ? "bg-aurora-cyan" : "bg-night-700"
        }`}
      >
        {/* `left-0.5` stated explicitly.
            
            Without a `left`, an absolutely positioned element falls back to its
            static position - which shifts with any padding the button inherits
            from a global style. The knob was therefore starting somewhere other
            than the track's left edge, and the transform carried it past the
            right edge. Anchoring it removes the guesswork: track 44, knob 20,
            2px inset, so travel is exactly 20px. */}
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-[20px]" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [earnedFlairs, setEarnedFlairs] = useState<string[]>([]);
  const { user, isLoading, fetchMe, logout, sessionError } = useAuthStore();
  const {
    darkMode,
    boardTheme,
    soundEnabled,
    materialStyle,
    pieceSet,
    setDarkMode,
    setBoardTheme,
    setSoundEnabled,
    setMaterialStyle,
    setPieceSet,
  } = useSettingsStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Flairs come from badges, so the picker needs to know what has been earned.
  useEffect(() => {
    if (!user) return;
    api
      .get(`/api/v1/users/${user.username}`)
      .then(({ data }) =>
        setEarnedFlairs((data.user?.badges ?? []).map((b: { key: string }) => b.key))
      )
      .catch(() => setEarnedFlairs([]));
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night-950">
        <p className="text-night-400">Loading...</p>
      </main>
    );
  }

  if (!user) return <SignedOut error={sessionError} />;

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />

      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/play" className="text-sm text-night-400 transition-colors hover:text-white">
          &larr; Back to play
        </Link>

        <h1 className="mt-4 font-display text-3xl tracking-tight">Settings</h1>

        <div className="mt-8 space-y-4">
          <Section title="Account">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <PlayerName
                  username={user.username}
                  title={user.title}
                  fideVerified={user.fideVerified}
                  modShield={user.modShield}
                  flair={user.activeFlair}
                />
                <p className="mt-1 truncate text-sm text-night-400">{user.email}</p>
              </div>
              <Link
                href={`/profile/${user.username}`}
                className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
              >
                View profile
              </Link>
            </div>

            <div className="mt-4 border-t border-night-700 pt-4">
              <AccountSettings earnedFlairs={earnedFlairs} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-night-700 pt-4">
              <Link
                href="/invites"
                className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
              >
                Invites
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-red-300 ring-1 ring-inset ring-red-500/30 transition-colors hover:bg-red-500/10"
              >
                Log out
              </button>
            </div>
          </Section>

          <Section title="Board">
            <p className="mb-3 text-sm text-night-400">Board colours</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {BOARD_THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setBoardTheme(t.key)}
                  aria-pressed={boardTheme === t.key}
                  className={`flex flex-col items-center gap-1.5 rounded-lg p-2 ring-1 ring-inset transition-colors ${
                    boardTheme === t.key
                      ? "bg-night-800 ring-aurora-cyan"
                      : "ring-night-700 hover:bg-night-800"
                  }`}
                >
                  <ThemeSwatch light={t.light} dark={t.dark} />
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Pieces">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {PIECE_SETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPieceSet(p.key)}
                  aria-pressed={pieceSet === p.key}
                  className={`rounded-lg p-3 text-center ring-1 ring-inset transition-colors ${
                    pieceSet === p.key
                      ? "bg-night-800 ring-aurora-cyan"
                      : "ring-night-700 hover:bg-night-800"
                  }`}
                >
                  {p.key === "fontaine" ? (
                    <span className="flex h-10 items-center justify-center text-3xl leading-none">
                      &#9819;
                    </span>
                  ) : (
                    <img
                      src={`/piece-sets/${p.key}/wQ.png`}
                      alt=""
                      className="mx-auto h-10 w-10 object-contain"
                    />
                  )}
                  <span className="mt-1.5 block text-sm font-medium">{p.label}</span>
                  <span className="block text-xs text-night-400">{p.note}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Captured material">
            <div className="grid gap-2 sm:grid-cols-2">
              {MATERIAL_STYLES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMaterialStyle(m.key)}
                  aria-pressed={materialStyle === m.key}
                  className={`rounded-lg p-4 text-left ring-1 ring-inset transition-colors ${
                    materialStyle === m.key
                      ? "bg-night-800 ring-aurora-cyan"
                      : "ring-night-700 hover:bg-night-800"
                  }`}
                >
                  <span className="block text-lg">{m.sample}</span>
                  <span className="mt-1 block font-medium">{m.label}</span>
                  <span className="mt-0.5 block text-sm text-night-400">{m.hint}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Preferences">
            <Toggle
              label="Sound"
              hint="Move, capture, check and game-end sounds."
              checked={soundEnabled}
              onChange={setSoundEnabled}
            />
            <Toggle
              label="Dark theme"
              hint="Aurora is designed for dark. Light mode is partial."
              checked={darkMode}
              onChange={setDarkMode}
            />
          </Section>
        </div>
      </div>
    </main>
  );
}
