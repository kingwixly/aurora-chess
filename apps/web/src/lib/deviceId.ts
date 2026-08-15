/**
 * A stable-ish device fingerprint.
 *
 * Sent as a header so moderation can act on a device rather than only an
 * account or an address. Without it, device bans and the per-device signup
 * limit are both dead code — the server looks for a header nobody sends.
 *
 * **This is not a hardware ID.** A browser cannot produce one. This survives a
 * new account, a cleared cookie and a VPN; it does not survive a different
 * browser, a profile reset, or in many cases a browser update. It is one signal
 * among several, never proof on its own, and the user-facing wording says
 * "device" rather than anything implying hardware.
 *
 * Deliberately built from coarse, stable properties. Canvas and audio
 * fingerprinting would be more unique and much more fragile — they change with
 * driver and browser updates, so a ban would evaporate for innocent reasons
 * while the technique reads as far more invasive than it is worth here.
 */

const STORAGE_KEY = "aurora-device-id";

function hash(input: string): string {
  // FNV-1a, doubled with different offsets for a 64-bit-ish value. Not
  // cryptographic — this identifies, it does not authenticate.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).slice(0, 32);
}

function computeFingerprint(): string {
  if (typeof window === "undefined") return "";
  const nav = window.navigator;
  const parts = [
    nav.userAgent,
    nav.language,
    (nav.languages ?? []).join(","),
    String(nav.hardwareConcurrency ?? ""),
    String((nav as Navigator & { deviceMemory?: number }).deviceMemory ?? ""),
    String(window.screen?.width ?? ""),
    String(window.screen?.height ?? ""),
    String(window.screen?.colorDepth ?? ""),
    String(new Date().getTimezoneOffset()),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
  ];
  return hash(parts.join("|"));
}

/**
 * The device identifier for this browser.
 *
 * Cached in localStorage so it stays stable even if the browser is updated and
 * a property changes. Clearing storage regenerates it — which is the honest
 * limit of the technique.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && /^[a-f0-9]{16,64}$/i.test(stored)) return stored;
    const fresh = computeFingerprint();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Private browsing: fall back to computing it each time. Less stable, but
    // still better than sending nothing.
    return computeFingerprint();
  }
}
