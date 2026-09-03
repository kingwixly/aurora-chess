import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "../components/ClientProviders";
import StandingBanner from "../components/StandingBanner";

/**
 * Fraunces for display. An optical-size serif with a "wonk" axis - it has
 * character at large sizes without reading as a stock editorial serif, and it
 * suits a game with a few centuries of print history behind it.
 */
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

/**
 * Monospace for ratings, titles, clocks and notation.
 *
 * Not decoration: chess notation is inherently monospaced, and setting ratings
 * and clocks in the same face means columns of numbers line up and a ticking
 * clock does not jitter as the digits change width.
 */
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  // Without this, Next resolves OG image URLs against localhost and social
  // previews break for every shared link.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Aurora Chess", template: "%s · Aurora Chess" },
  // The embed description is what people see before they click, so it leads
  // with the two things that actually differentiate Aurora.
  description:
    "Free, unlimited analysis and puzzles. Nine ways to earn a title, and no ban is ever issued by software.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Aurora Chess",
    siteName: "Aurora Chess",
    url: "/",
    description:
      "Free, unlimited analysis and puzzles. Nine ways to earn a title, and no ban is ever issued by software.",
    images: [{ url: "/og-card.png", width: 1200, height: 630 }],
    type: "website",
  },
  // Discord and X read these rather than the OpenGraph tags in some cases.
  twitter: {
    card: "summary_large_image",
    title: "Aurora Chess",
    description:
      "Free, unlimited analysis and puzzles. Nine ways to earn a title, and no ban is ever issued by software.",
    images: ["/og-card.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aurora Chess",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0F1C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        {/* Modern equivalent of apple-mobile-web-app-capable, which Chrome
            now warns about on every page load. */}
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icons/favicon-48x48.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-night-950 font-sans text-white antialiased">
        <ClientProviders>
          <StandingBanner />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
