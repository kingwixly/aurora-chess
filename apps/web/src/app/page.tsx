"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "../stores/auth";

export default function Home() {
  const router = useRouter();
  const { user, isLoading, fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/play");
    }
  }, [isLoading, user, router]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <Image src="/logo.png" alt="EyeOnChess" width={120} height={120} priority className="mb-6" />
      <h1 className="text-4xl font-bold mb-4">EyeOnChess</h1>
      <p className="text-gray-400 mb-8">Self-hostable chess platform</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
        >
          Log In
        </Link>
        <Link
          href="/register"
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors"
        >
          Register
        </Link>
      </div>
    </main>
  );
}
