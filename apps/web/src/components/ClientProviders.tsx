"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toast } from "@aurora/ui";
import ThemeProvider from "./ThemeProvider";
import BoardThemeStyles from "./BoardThemeStyles";
import ErrorBoundary from "./ErrorBoundary";
import TosGate from "./TosGate";
import { useUpdateNotification, checkDeferredUpdate } from "../lib/useUpdateNotification";
import { useOnlineStatus } from "../lib/useOnlineStatus";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import AppTabBar from "./AppTabBar";
import { useStandalone } from "../lib/useStandalone";
import { setDeviceIdProvider } from "@aurora/api-client";
import { getDeviceId } from "../lib/deviceId";

// Pages that don't require TOS acceptance
// Pages a user must be able to reach before accepting the terms - plus the
// standing pages, because someone banned before the terms changed still needs
// to see their record and appeal.
const TOS_EXEMPT_PATHS = ["/legal", "/login", "/register", "/fair-play", "/standing"];

/**
 * Top-level client component that wraps the app in ThemeProvider, BoardThemeStyles,
 * ErrorBoundary, and TosGate. Exempts certain paths (legal, login, register) from TOS checks.
 *
 * @param props - Children to render inside the provider stack.
 * @returns The composed provider tree wrapping the application content.
 */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isExempt = TOS_EXEMPT_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/";

  const isOnline = useOnlineStatus();
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const standalone = useStandalone();

  // Register the device identifier once, before any request goes out.
  useEffect(() => {
    setDeviceIdProvider(getDeviceId);
  }, []);

  // Restore the dismissal so the prompt does not return on every page load.
  useEffect(() => {
    try {
      if (localStorage.getItem("aurorachess-install-dismissed") === "1") {
        setInstallDismissed(true);
      }
    } catch {
      // Private browsing; the prompt shows for this session.
    }
  }, []);

  // PWA update detection
  useUpdateNotification();
  useEffect(() => {
    checkDeferredUpdate();
  }, []);

  // Detect iOS Safari not installed as PWA
  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = localStorage.getItem("aurorachess-ios-pwa-dismissed");
    if (isIos && !isStandalone && !dismissed) {
      setShowIosBanner(true);
    }
  }, []);

  return (
    <ThemeProvider>
      <BoardThemeStyles />
      <Toast />
      {!isOnline && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-yellow-900/90 border border-amber-500/40 rounded-full text-xs text-amber-300 shadow-lg">
          You&apos;re offline &mdash; bot games still work
        </div>
      )}
      {canInstall && !installDismissed && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-aurora-cyan px-4 py-2 text-sm text-night-950 shadow-lg">
          <span>Install AuroraChess app</span>
          <button
            onClick={install}
            className="rounded-full bg-night-950 px-3 py-1 text-xs font-bold text-aurora-cyan"
          >
            Install
          </button>
          {/* A prompt with no way out is not a prompt. Dark on cyan so it is
              obvious, and the choice is remembered so it does not return on
              every page. */}
          <button
            onClick={() => {
              setInstallDismissed(true);
              try {
                localStorage.setItem("aurorachess-install-dismissed", "1");
              } catch {
                // Private browsing; it will reappear next session.
              }
            }}
            aria-label="Dismiss install prompt"
            /* contrast-ok: the parent banner is solid aurora-cyan */
            className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-night-950/20 text-lg leading-none text-night-950 transition-colors hover:bg-night-950/40"
          >
            &times;
          </button>
        </div>
      )}
      {showIosBanner && !isInstalled && !canInstall && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-night-800 border border-night-700 rounded-xl shadow-lg text-sm text-white">
          <div className="flex-1">
            <p className="font-medium">Install AuroraChess</p>
            <p className="text-xs text-night-400 mt-0.5">
              Tap <span className="inline-block text-aurora-cyan">{"\u2B06\uFE0F"} Share</span> then
              &quot;Add to Home Screen&quot;
            </p>
          </div>
          <button
            onClick={() => {
              setShowIosBanner(false);
              localStorage.setItem("aurorachess-ios-pwa-dismissed", "1");
            }}
            className="text-night-400 hover:text-white text-lg shrink-0"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}
      <ErrorBoundary>{isExempt ? children : <TosGate>{children}</TosGate>}</ErrorBoundary>
    </ThemeProvider>
  );
}
