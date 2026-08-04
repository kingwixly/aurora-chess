"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@eyeonchess/ui";
import { useAuthStore } from "../lib/auth";
import AdminLayout from "../components/AdminLayout";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost";
      window.location.href = `${siteUrl}/login`;
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <html lang="en">
        <body className="bg-gray-950 text-white">
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-400">Loading...</p>
          </div>
        </body>
      </html>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

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
