"use client";

import { useState } from "react";
import { ALL_FIDE_PANEL_TITLES, FIDE_PANEL_TITLE_LABELS, grantableBadges } from "@aurora/chess";

export interface AdminUser {
  id: string;
  username: string;
  rating: number;
  peakRating?: number;
  fideVerified?: boolean;
  fideId?: string | null;
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
  cheatExempt?: boolean;
  usernameHistory?: { username: string; changedAt: string }[];
}

interface Props {
  user: AdminUser;
  saving: boolean;
  onClose: () => void;
  onSaveFide: (patch: Record<string, unknown>) => void;
  onSaveRating: (rating: number, reason: string) => void;
  onToggleBadge: (badgeKey: string, granted: boolean, evidence: string) => void;
  onToggleExempt?: (exempt: boolean) => void;
}

function Field({
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
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

const INPUT =
  "w-full rounded bg-gray-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400";

/**
 * Everything staff can grant, in one place.
 *
 * Three separate endpoints behind three tabs rather than one giant save: a
 * rating correction and a FIDE verification are unrelated decisions, and
 * bundling them into a single submit makes an accidental change to one while
 * intending the other far too easy.
 */
export default function AdminUserPanel({
  user,
  saving,
  onClose,
  onSaveFide,
  onSaveRating,
  onToggleBadge,
  onToggleExempt,
}: Props) {
  const [tab, setTab] = useState<"fide" | "badges" | "rating" | "history">("fide");

  const fp = user.fideProfile ?? {};
  const [verified, setVerified] = useState(user.fideVerified ?? false);
  const [fideId, setFideId] = useState(user.fideId ?? "");
  const [enabled, setEnabled] = useState(fp.enabled ?? false);
  const [standard, setStandard] = useState(fp.standard?.toString() ?? "");
  const [rapid, setRapid] = useState(fp.rapid?.toString() ?? "");
  const [blitz, setBlitz] = useState(fp.blitz?.toString() ?? "");
  const [federation, setFederation] = useState(fp.federation ?? "");
  const [profileUrl, setProfileUrl] = useState(fp.profileUrl ?? "");
  const [arenaTitles, setArenaTitles] = useState<string[]>(fp.arenaTitles ?? []);

  const [rating, setRating] = useState(user.rating.toString());
  const [reason, setReason] = useState("");

  const held = new Set((user.badges ?? []).map((b) => b.badgeKey));
  const [evidence, setEvidence] = useState("");

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-gray-800 shadow-xl">
        <div className="sticky top-0 border-b border-gray-700 bg-gray-800 p-5">
          <h2 className="text-lg font-bold">{user.username}</h2>
          <div className="mt-3 flex gap-1">
            {/* Labels stated rather than derived. CSS `capitalize` turns
                "fide" into "Fide", which is wrong for an acronym and cannot be
                fixed with styling. */}
            {(
              [
                ["fide", "FIDE"],
                ["badges", "Badges"],
                ["rating", "Rating"],
                ["history", "History"],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  tab === t ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 p-5">
          {tab === "fide" && (
            <>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">FIDE details verified</span>
                  <span className="mt-0.5 block text-xs text-gray-400">
                    Site verification complete and a registered FIDE account confirmed. Shows a mark
                    before their name everywhere.
                  </span>
                </span>
              </label>

              <Field label="FIDE ID">
                <input
                  value={fideId}
                  onChange={(e) => setFideId(e.target.value)}
                  className={INPUT}
                />
              </Field>

              <hr className="border-gray-700" />

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Show FIDE panel on their profile</span>
                  <span className="mt-0.5 block text-xs text-gray-400">
                    Stays hidden until at least one field below is filled in.
                  </span>
                </span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <Field label="Standard">
                  <input
                    value={standard}
                    onChange={(e) => setStandard(e.target.value)}
                    className={INPUT}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Rapid">
                  <input
                    value={rapid}
                    onChange={(e) => setRapid(e.target.value)}
                    className={INPUT}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Blitz">
                  <input
                    value={blitz}
                    onChange={(e) => setBlitz(e.target.value)}
                    className={INPUT}
                    inputMode="numeric"
                  />
                </Field>
              </div>

              <Field label="Federation" hint="Three-letter code, e.g. ENG">
                <input
                  value={federation}
                  onChange={(e) => setFederation(e.target.value)}
                  maxLength={3}
                  className={INPUT}
                />
              </Field>

              <Field
                label="FIDE profile URL"
                hint="Must be an https link on fide.com; anything else is rejected."
              >
                <input
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  className={INPUT}
                />
              </Field>

              <Field
                label="Arena and official titles"
                hint="Shown only on the profile panel, never beside their name."
              >
                <div className="flex flex-wrap gap-1.5">
                  {ALL_FIDE_PANEL_TITLES.map((t) => {
                    const on = arenaTitles.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() =>
                          setArenaTitles((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))
                        }
                        title={FIDE_PANEL_TITLE_LABELS[t]}
                        className={`rounded px-2 py-1 font-mono text-xs transition-colors ${
                          on ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <button
                disabled={saving}
                onClick={() =>
                  onSaveFide({
                    fideVerified: verified,
                    fideId: fideId.trim() || null,
                    enabled,
                    standard: num(standard),
                    rapid: num(rapid),
                    blitz: num(blitz),
                    federation: federation.trim() || null,
                    profileUrl: profileUrl.trim() || null,
                    arenaTitles,
                  })
                }
                className="w-full rounded bg-blue-600 py-2.5 font-medium transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save FIDE details"}
              </button>
            </>
          )}

          {tab === "badges" && (
            <>
              <Field
                label="Evidence"
                hint="Recorded with the grant. Required for credentials; staff-visible only."
              >
                <input
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  className={INPUT}
                />
              </Field>

              <ul className="space-y-1.5">
                {grantableBadges().map((b) => {
                  const on = held.has(b.key);
                  return (
                    <li
                      key={b.key}
                      className="flex items-center justify-between gap-3 rounded bg-gray-700 px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="mr-1.5">{b.icon}</span>
                        <span className="text-sm font-medium">{b.label}</span>
                        <span className="mt-0.5 block truncate text-xs text-gray-400">
                          {b.description}
                        </span>
                      </span>
                      <button
                        disabled={saving || (b.requiresEvidence && !on && !evidence.trim())}
                        onClick={() => onToggleBadge(b.key, !on, evidence.trim())}
                        title={
                          b.requiresEvidence && !on && !evidence.trim()
                            ? "This credential needs evidence"
                            : undefined
                        }
                        className={`shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                          on ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
                        }`}
                      >
                        {on ? "Revoke" : "Grant"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {tab === "rating" && (
            <>
              <p className="rounded bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200 ring-1 ring-inset ring-yellow-500/30">
                A correction moves their peak rating too, and automatic titles are recomputed from
                it - so lowering a rating can strip a title they no longer qualify for.
              </p>

              <Field
                label="Rating"
                hint={`Currently ${user.rating}${user.peakRating ? `, peak ${user.peakRating}` : ""}. Range 400-3500.`}
              >
                <input
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className={INPUT}
                  inputMode="numeric"
                />
              </Field>

              <Field label="Reason" hint="Recorded in the audit log.">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={INPUT}
                />
              </Field>

              <button
                disabled={saving || !reason.trim() || !Number(rating)}
                onClick={() => onSaveRating(Number(rating), reason.trim())}
                className="w-full rounded bg-blue-600 py-2.5 font-medium transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Apply correction"}
              </button>
            </>
          )}
        </div>

        {tab === "history" && (
          <>
            <div>
              <h3 className="mb-2 text-sm font-medium">Previous usernames</h3>
              {(user.usernameHistory ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">
                  This account has always used {user.username}.
                </p>
              ) : (
                <ul className="divide-y divide-gray-700 overflow-hidden rounded bg-gray-700">
                  {user.usernameHistory!.map((h, i) => (
                    <li key={i} className="flex items-center justify-between px-3 py-2">
                      <span className="font-mono text-sm">{h.username}</span>
                      <span className="text-xs text-gray-400">
                        until {new Date(h.changedAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Searching any of these names still finds this account.
              </p>
            </div>

            <hr className="my-3 border-gray-700" />

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={user.cheatExempt ?? false}
                onChange={(e) => onToggleExempt?.(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">Exempt from cheat detection</span>
                <span className="mt-0.5 block text-xs text-gray-400">
                  Set automatically for federation titles. Their engine-like accuracy is what the
                  title certifies, so flagging it is noise.
                </span>
              </span>
            </label>
          </>
        )}

        <div className="sticky bottom-0 border-t border-gray-700 bg-gray-800 p-4">
          <button
            onClick={onClose}
            className="w-full rounded bg-gray-700 py-2 text-sm transition-colors hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
