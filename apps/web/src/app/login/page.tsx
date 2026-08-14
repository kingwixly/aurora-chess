"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "../../stores/auth";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Only same-site paths: an open redirect here would let a crafted link bounce
  // someone off the site straight after they have typed a password.
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/play";
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If a valid session already exists, there is nothing to do here.
  useEffect(() => {
    if (user) router.replace(next);
  }, [user, router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      // A banned account lands on its standing page rather than a dashboard
      // where nothing works and nothing explains why.
      router.push(result?.banned ? "/standing" : next);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-night-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-night-900 p-8 ring-1 ring-inset ring-night-700">
        <div className="flex justify-center mb-4">
          <Image src="/logo-mark.png" alt="Aurora Chess" width={80} height={80} priority />
        </div>
        <h1 className="text-center font-display text-3xl tracking-tight">Welcome back</h1>
        <p className="mb-6 mt-2 text-center text-sm text-night-600">Sign in to keep playing.</p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-300 ring-1 ring-inset ring-red-500/30">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              id="email"
              name="email"
              className="w-full rounded-lg border border-night-700 bg-night-800 px-3.5 py-2.5 text-white placeholder:text-night-600 focus:border-aurora-cyan focus:outline-none focus:ring-1 focus:ring-aurora-cyan"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              id="password"
              name="password"
              className="w-full rounded-lg border border-night-700 bg-night-800 px-3.5 py-2.5 text-white placeholder:text-night-600 focus:border-aurora-cyan focus:outline-none focus:ring-1 focus:ring-aurora-cyan"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-aurora-cyan py-2.5 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-night-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-aurora-cyan hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}

/**
 * `useSearchParams` opts its subtree out of static rendering, so Next requires
 * a boundary above it or the route cannot be prerendered at all.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-night-950" />}>
      <LoginForm />
    </Suspense>
  );
}
