"use client";

import { useState } from "react";
import Link from "next/link";
import api from "../lib/api";
import { useAuthStore } from "../stores/auth";

/**
 * Gate component that blocks the app UI until the authenticated user accepts
 * the Terms of Service. Renders children directly if not logged in or already accepted.
 *
 * @param props - Children to render once TOS is accepted.
 * @returns The TOS acceptance screen, a deactivation message, or the children.
 */
export default function TosGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [accepting, setAccepting] = useState(false);
  const [declined, setDeclined] = useState(false);

  // Not logged in or already accepted — show the app
  if (!user || user.tosAccepted) {
    return <>{children}</>;
  }

  async function accept() {
    setAccepting(true);
    try {
      await api.post("/api/v1/auth/accept-tos");
      // Update local user state
      useAuthStore.setState({
        user: { ...user!, tosAccepted: true },
      });
    } catch {
      // retry on next page load
    } finally {
      setAccepting(false);
    }
  }

  async function decline() {
    setDeclined(true);
    try {
      await api.post("/api/v1/auth/decline-tos");
      useAuthStore.setState({ user: null });
    } catch {
      // ignore
    }
  }

  if (declined) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Account Deactivated</h1>
          <p className="text-gray-400 mb-4">
            You declined the Terms of Service. Your account has been deactivated.
          </p>
          <p className="text-gray-500 text-sm">
            Contact the platform administrator if you change your mind.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-screen p-4 pt-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-center mb-2">Terms of Service Agreement</h1>
        <p className="text-gray-400 text-center text-sm mb-6">
          Please read and accept our Terms of Service and Privacy Policy to continue using
          EyeOnChess.
        </p>

        <div className="bg-gray-900 rounded-lg p-6 mb-6 max-h-[60vh] overflow-y-auto text-sm text-gray-300 space-y-4">
          <h2 className="text-lg font-bold text-white">Terms of Service</h2>
          <p>
            By using EyeOnChess, you agree to be bound by these Terms of Service, our Privacy
            Policy, and all applicable laws and regulations. You must be at least 13 years of age.
          </p>
          <p>
            <strong>Account:</strong> You are responsible for maintaining the confidentiality of
            your credentials and all activities under your account. You agree not to create multiple
            accounts for abuse purposes.
          </p>
          <p>
            <strong>Fair Play:</strong> You agree not to use chess engines, computer assistance, or
            automated tools during live games against human opponents. Bot games are explicitly
            permitted.
          </p>
          <p>
            <strong>Acceptable Use:</strong> You agree not to harass other users, attempt
            unauthorized access, distribute malicious code, scrape the platform, impersonate others,
            or use the platform for illegal purposes.
          </p>
          <p>
            <strong>Data:</strong> All games are recorded and stored. Game data (moves, results,
            analysis) may be visible to other users. Your password is hashed and never stored in
            plaintext.
          </p>
          <p>
            <strong>Disclaimer:</strong> THE PLATFORM IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY
            OF ANY KIND. We are not liable for any damages resulting from your use of the platform,
            including loss of data, game records, or account information.
          </p>
          <p>
            <strong>Termination:</strong> We may terminate or suspend your account at any time for
            violation of these Terms. You may request account deactivation by declining these terms.
          </p>

          <h2 className="text-lg font-bold text-white mt-6">Privacy Policy</h2>
          <p>
            We collect: email, username, hashed password, game data, friend lists, preferences, IP
            addresses, and authentication tokens. We use this data to provide the chess platform,
            authenticate users, display profiles, and run game analysis.
          </p>
          <p>
            Your data is not shared with third parties. EyeOnChess does not use external analytics,
            advertising, or third-party APIs. All processing happens on the server where this
            instance is deployed.
          </p>
          <p>
            Cookies used: refresh_token (httpOnly, 7 days) for session management, csrf_token (1
            hour) for admin CSRF protection.
          </p>

          <p className="text-xs text-gray-500 mt-4">
            Full versions:{" "}
            <Link href="/legal/terms" className="text-blue-400 hover:underline" target="_blank">
              Terms of Service
            </Link>{" "}
            |{" "}
            <Link href="/legal/privacy" className="text-blue-400 hover:underline" target="_blank">
              Privacy Policy
            </Link>
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={decline}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            I Decline
          </button>
          <button
            onClick={accept}
            disabled={accepting}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg font-bold transition-colors"
          >
            {accepting ? "Accepting..." : "I Accept"}
          </button>
        </div>
      </div>
    </main>
  );
}
