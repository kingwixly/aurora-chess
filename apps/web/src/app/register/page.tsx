"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "../../stores/auth";
import api from "../../lib/api";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useAuthStore((s) => s.register);

  const inviteFromUrl = searchParams.get("invite") || "";
  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasUrlInvite = !!inviteFromUrl;

  // Validate invite code on blur or when loaded from URL
  useEffect(() => {
    if (!inviteCode || inviteCode.length < 10) {
      setInviteValid(null);
      setInviteError("");
      return;
    }
    const timer = setTimeout(async () => {
      try {
        await api.get(`/api/v1/invites/validate/${inviteCode}`);
        setInviteValid(true);
        setInviteError("");
      } catch (err: unknown) {
        setInviteValid(false);
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          "Invalid invite code";
        setInviteError(msg);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!inviteCode) {
      setError("Invite code is required");
      return;
    }
    setLoading(true);
    try {
      await register(email, username, password, inviteCode);
      router.push("/play");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Registration failed";
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
        <h1 className="text-center font-display text-3xl tracking-tight">Create your account</h1>
        <p className="mb-6 mt-2 text-center text-sm text-night-600">
          Free, and your title starts accruing from your first rated game.
        </p>
        <p className="text-sm text-night-400 text-center mb-4">
          AuroraChess is invite-only. You need an invite code to register.
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-300 ring-1 ring-inset ring-red-500/30">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invite code */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              readOnly={hasUrlInvite}
              required
              placeholder="Paste your invite code"
              className={`w-full px-3 py-2 bg-night-800 border rounded font-mono text-sm focus:outline-none ${
                hasUrlInvite
                  ? "border-night-600 text-night-400 cursor-not-allowed"
                  : "border-night-700 focus:border-aurora-cyan"
              } ${inviteValid === true ? "border-green-600" : inviteValid === false ? "border-red-600" : ""}`}
            />
            {inviteValid === true && (
              <p className="text-xs text-emerald-400 mt-1">Valid invite code</p>
            )}
            {inviteError && <p className="text-xs text-red-400 mt-1">{inviteError}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-night-700 bg-night-800 px-3.5 py-2.5 text-white placeholder:text-night-600 focus:border-aurora-cyan focus:outline-none focus:ring-1 focus:ring-aurora-cyan"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
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
              minLength={8}
              className="w-full rounded-lg border border-night-700 bg-night-800 px-3.5 py-2.5 text-white placeholder:text-night-600 focus:border-aurora-cyan focus:outline-none focus:ring-1 focus:ring-aurora-cyan"
            />
            <p className="text-xs text-night-500 mt-1">Minimum 8 characters</p>
          </div>
          <button
            type="submit"
            disabled={loading || inviteValid === false}
            className="w-full rounded-lg bg-aurora-cyan py-2.5 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-night-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-aurora-cyan hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
