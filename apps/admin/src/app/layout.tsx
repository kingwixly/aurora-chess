"use client";

import { useEffect } from "react";
import { Toast } from "@aurora/ui";
import { useAuthStore } from "../lib/auth";
import AdminLayout from "../components/AdminLayout";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // NO automatic redirect.
  //
  // This used to bounce to the main site's /login on any failure. That page
  // then saw a live session and forwarded to /play, so the whole thing looked
  // like "clicking Admin sends me to the dashboard" with no indication of
  // what was refused or why. Two completely different faults - no session, and
  // a session belonging to a non-admin - produced the identical mystery loop.
  //
  // Failing visibly is worth more than failing tidily.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost";

  if (isLoading) {
    return (
      <html lang="en">
        <body className="bg-gray-950 text-white">
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-gray-400">Checking your session...</p>
          </div>
        </body>
      </html>
    );
  }

  if (!user) {
    return (
      <html lang="en">
        <body className="bg-gray-950 text-white">
          <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
            <h1 className="text-2xl font-semibold">Not signed in</h1>
            <p className="text-sm text-gray-400">
              The admin panel could not read your session. This usually means the login cookie is
              not reaching this subdomain.
            </p>
            <a
              href={`${siteUrl}/login?next=${encodeURIComponent(
                typeof window === "undefined" ? "/" : window.location.href
              )}`}
              className="mt-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium hover:bg-blue-500"
            >
              Sign in
            </a>
          </div>
        </body>
      </html>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <html lang="en">
        <body className="bg-gray-950 text-white">
          <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
            <h1 className="text-2xl font-semibold">Not an administrator</h1>
            <p className="text-sm text-gray-400">
              You are signed in as <span className="font-mono text-gray-200">{user.username}</span>,
              whose role is{" "}
              <span className="font-mono text-amber-300">{user.role ?? "unknown"}</span>. The panel
              requires <span className="font-mono">ADMIN</span>.
            </p>
            <p className="text-xs text-gray-500">
              Fix it with: UPDATE &quot;User&quot; SET role=&apos;ADMIN&apos; WHERE username= &apos;
              {user.username}&apos;; then sign out and back in.
            </p>
            <a
              href={siteUrl}
              className="mt-2 rounded-lg px-5 py-2.5 font-medium ring-1 ring-inset ring-gray-700 hover:bg-gray-900"
            >
              Back to Aurora
            </a>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">
        <AdminLayout>
          <Toast />
          {children}
        </AdminLayout>
      </body>
    </html>
  );
}
