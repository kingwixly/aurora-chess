"use client";

import { useState } from "react";
import { MANUAL_TITLES, AUTO_TITLES, TITLE_LABELS, resolveTitle } from "@aurora/chess";
import type { ManualTitle, AutoTitle } from "@aurora/chess";

export interface TitleUser {
  id: string;
  username: string;
  rating: number;
  peakRating: number;
  titleManual: ManualTitle | null;
  titleAuto: AutoTitle | null;
  titleAutoLocked: boolean;
  titleBanned: boolean;
  titleBanReason: string | null;
}

interface TitleEditorProps {
  user: TitleUser;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
}

/**
 * Title management for a single user.
 *
 * Deliberately shows the resolved outcome up front, because the interaction
 * between a manual title, an auto title and a ban is not obvious from the
 * individual controls - staff should be able to see what the player will
 * actually display before saving.
 */
export default function TitleEditor({ user, saving, onClose, onSave }: TitleEditorProps) {
  const [titleManual, setTitleManual] = useState<ManualTitle | "">(user.titleManual ?? "");
  const [titleAuto, setTitleAuto] = useState<AutoTitle | "">(user.titleAuto ?? "");
  const [locked, setLocked] = useState(user.titleAutoLocked);
  const [banned, setBanned] = useState(user.titleBanned);
  const [banReason, setBanReason] = useState(user.titleBanReason ?? "");

  const preview = resolveTitle({
    titleManual: titleManual || null,
    titleAuto: titleAuto || null,
    titleBanned: banned,
  });

  function handleSave() {
    const patch: Record<string, unknown> = {
      titleManual: titleManual || null,
      titleBanned: banned,
      titleBanReason: banned ? banReason.trim() || null : null,
    };

    // Only send auto-title fields when staff actually touched them. Sending
    // titleAuto unconditionally would silently lock every user that passes
    // through this dialog.
    if (locked !== user.titleAutoLocked) {
      patch.titleAutoLocked = locked;
    }
    if (locked && titleAuto !== (user.titleAuto ?? "")) {
      patch.titleAuto = titleAuto || null;
    }

    onSave(patch);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg bg-gray-800 p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold">Titles - {user.username}</h2>
        <p className="mb-4 text-xs text-gray-400">
          Rating {user.rating} · peak {user.peakRating}
        </p>

        {/* Manual title */}
        <label className="mb-1 block text-sm font-medium">Staff-assigned title</label>
        <select
          value={titleManual}
          onChange={(e) => setTitleManual(e.target.value as ManualTitle | "")}
          className="mb-1 w-full rounded bg-gray-700 px-3 py-2 text-sm"
        >
          <option value="">- none -</option>
          {MANUAL_TITLES.map((t) => (
            <option key={t} value={t}>
              {t} - {TITLE_LABELS[t]}
            </option>
          ))}
        </select>
        <p className="mb-4 text-xs text-gray-500">
          Always masks the automatic title. Clearing it restores whatever the player earned.
        </p>

        {/* Auto title */}
        <label className="mb-1 block text-sm font-medium">Automatic title</label>
        <div className="mb-1 flex items-center gap-2">
          <select
            value={titleAuto}
            onChange={(e) => setTitleAuto(e.target.value as AutoTitle | "")}
            disabled={!locked}
            className="flex-1 rounded bg-gray-700 px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">- none -</option>
            {AUTO_TITLES.map((t) => (
              <option key={t} value={t}>
                {t} - {TITLE_LABELS[t]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 whitespace-nowrap text-xs">
            <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
            Override
          </label>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          {locked
            ? "Overridden - automatic recomputation is suspended for this user."
            : "Computed from peak rating after every rated game. Tick Override to set it by hand."}
        </p>

        {/* Title ban */}
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={banned} onChange={(e) => setBanned(e.target.checked)} />
          Title ban
        </label>
        {banned && (
          <input
            type="text"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Reason (internal, not shown to the player)"
            maxLength={500}
            className="mb-1 w-full rounded bg-gray-700 px-3 py-2 text-sm"
          />
        )}
        <p className="mb-4 text-xs text-gray-500">
          Hides all titles without deleting them. Automatic titles keep accruing underneath and
          reappear if the ban is lifted.
        </p>

        <div className="mb-4 rounded bg-gray-900 px-3 py-2 text-sm">
          Will display:{" "}
          {preview ? (
            <span className="font-bold text-amber-300">{preview}</span>
          ) : (
            <span className="text-gray-500">no title</span>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded bg-gray-700 px-4 py-2 text-sm transition-colors hover:bg-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
