"use client";

import { useEffect, useState } from "react";

/**
 * Whether the app is running as an installed app rather than in a browser tab.
 *
 * True when launched from the home screen on iOS or from an installed PWA
 * elsewhere. Worth knowing because the two contexts want different chrome:
 * a browser tab already has back/forward and an address bar, an installed app
 * has neither and needs to supply its own navigation.
 */
export function useStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const check = () => {
      // iOS Safari uses a non-standard property; everything else uses the
      // display-mode media query.
      const iosStandalone =
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      const displayMode =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        window.matchMedia?.("(display-mode: fullscreen)").matches;
      setStandalone(Boolean(iosStandalone || displayMode));
    };
    check();

    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener?.("change", check);
    return () => mq?.removeEventListener?.("change", check);
  }, []);

  return standalone;
}

/** Whether this is an iOS device, which needs its own install instructions. */
export function useIsIOS(): boolean {
  const [ios, setIos] = useState(false);
  useEffect(() => {
    const ua = window.navigator.userAgent;
    // iPadOS reports as Macintosh, so touch support is the distinguishing test.
    const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    setIos(/iPad|iPhone|iPod/.test(ua) || iPadOS);
  }, []);
  return ios;
}
