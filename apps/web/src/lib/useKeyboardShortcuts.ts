"use client";

import { useEffect } from "react";

type ShortcutMap = Record<string, () => void>;

/**
 * Hook that registers global keydown listeners for the given shortcut map.
 * Ignores key events from input/textarea/select elements and modifier keys.
 *
 * @param shortcuts - A map of key names to callback functions.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Ignore with modifiers (except Shift for ?)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key;
      const fn = shortcuts[key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
