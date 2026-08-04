import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientProviders from "../components/ClientProviders";

export const metadata: Metadata = {
  title: "EyeOnChess",
  description: "Self-hostable chess platform — play, analyze, compete",
  manifest: "/manifest.json",
  openGraph: {
    title: "EyeOnChess",
    description: "Self-hostable chess platform — play, analyze, compete",
    images: [{ url: "/logo.png", width: 1200, height: 1200 }],
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EyeOnChess",
  },
};

export const viewport: Viewport = {
  themeColor: "#030712",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="bg-gray-950 text-white min-h-screen dark:bg-gray-950 dark:text-white light:bg-white light:text-gray-900">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
