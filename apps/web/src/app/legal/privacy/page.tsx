"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="flex flex-col items-center min-h-screen p-4 pt-12">
      <div className="max-w-3xl w-full prose prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-gray-400">Last updated: March 2026</p>

        <h2>1. Introduction</h2>
        <p>
          EyeOnChess (&quot;we,&quot; &quot;our,&quot; or &quot;the Platform&quot;) is a
          self-hosted, open source chess platform. This Privacy Policy explains how the operator of
          this instance collects, uses, stores, and protects your personal information when you use
          the Platform.
        </p>
        <p>
          By creating an account and using EyeOnChess, you acknowledge that you have read and
          understood this Privacy Policy. If you do not agree with this policy, you must not use the
          Platform.
        </p>

        <h2>2. Information We Collect</h2>
        <h3>2.1 Account Information</h3>
        <p>When you register, we collect:</p>
        <ul>
          <li>Email address</li>
          <li>Username</li>
          <li>Password (stored as a bcrypt hash — we never store your plaintext password)</li>
        </ul>

        <h3>2.2 Game Data</h3>
        <p>When you play games, we collect and store:</p>
        <ul>
          <li>Game moves (SAN and UCI notation)</li>
          <li>Game results, time controls, and timestamps</li>
          <li>Elo rating changes</li>
          <li>Post-game analysis results (engine evaluations, move classifications)</li>
        </ul>

        <h3>2.3 Social Data</h3>
        <ul>
          <li>Friend lists and friend request history</li>
          <li>Online presence status (stored temporarily in Redis with a 30-second expiry)</li>
        </ul>

        <h3>2.4 Preferences</h3>
        <ul>
          <li>Display preferences (dark/light mode, board theme, piece set)</li>
          <li>Game collections you create</li>
        </ul>

        <h3>2.5 Technical Data</h3>
        <ul>
          <li>IP address (logged in server access logs and admin audit logs)</li>
          <li>Authentication tokens (JWT access tokens and hashed refresh tokens)</li>
          <li>Session data stored in cookies (httpOnly refresh token cookie)</li>
        </ul>

        <h3>2.6 Offline Data</h3>
        <p>
          When playing offline, game data is stored locally in your browser (localStorage). This
          data is synced to the server when you reconnect to the internet.
        </p>

        <h2>3. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and maintain the chess platform</li>
          <li>Authenticate your identity and manage your account</li>
          <li>Display your profile, rating, and game history to other users</li>
          <li>Facilitate real-time multiplayer games via WebSocket connections</li>
          <li>Run post-game analysis using the Stockfish chess engine</li>
          <li>Calculate and update Elo ratings</li>
          <li>Show friend online status</li>
          <li>Enable admin users to manage the platform</li>
          <li>Generate aggregate platform statistics (total users, games played, etc.)</li>
        </ul>

        <h2>4. Data Storage and Security</h2>
        <ul>
          <li>All data is stored on the server infrastructure where this instance is hosted</li>
          <li>Passwords are hashed using bcrypt with 12 rounds</li>
          <li>Refresh tokens are SHA-256 hashed before storage</li>
          <li>JWT access tokens expire after 15 minutes</li>
          <li>Refresh tokens expire after 7 days and are rotated on each use</li>
          <li>Admin actions are protected by CSRF tokens and rate limiting</li>
          <li>All admin mutations are logged in an audit trail</li>
        </ul>

        <h2>5. Data Sharing</h2>
        <p>
          EyeOnChess is a self-hosted platform. Your data is not shared with any third parties. The
          Platform does not use any external analytics services, advertising networks, or
          third-party APIs. All processing happens on the server infrastructure where this instance
          is deployed.
        </p>

        <h2>6. Public Information</h2>
        <p>The following information is publicly visible to other users:</p>
        <ul>
          <li>Username</li>
          <li>Rating</li>
          <li>Game history (opponents, results, time controls)</li>
          <li>Win/loss/draw statistics</li>
          <li>Account creation date</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>We use the following cookies:</p>
        <ul>
          <li>
            <strong>refresh_token</strong> — httpOnly, secure (in production), sameSite: lax.
            Contains an encrypted refresh token for session management. Expires after 7 days.
          </li>
          <li>
            <strong>csrf_token</strong> — Used for CSRF protection on admin panel operations.
            Expires after 1 hour.
          </li>
        </ul>

        <h2>8. Data Retention</h2>
        <ul>
          <li>Account data is retained for as long as your account is active</li>
          <li>Game data is retained indefinitely as part of the platform history</li>
          <li>Expired refresh tokens are deleted on use or expiry</li>
          <li>Online presence data expires after 30 seconds in Redis</li>
          <li>
            Prometheus metrics are retained for 30 days. Logs in Loki follow default retention
            policies.
          </li>
        </ul>

        <h2>9. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data through the /profile and /settings pages</li>
          <li>Update your preferences at any time</li>
          <li>Request account deactivation by contacting the platform administrator</li>
          <li>
            Request data deletion — contact the platform administrator. Note: deleting your account
            will cascade-delete your games, moves, analysis, friendships, and collections.
          </li>
        </ul>

        <h2>10. Children</h2>
        <p>
          EyeOnChess does not knowingly collect data from children under 13. If you believe a child
          under 13 has created an account, please contact the platform administrator.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          The platform administrator may update this Privacy Policy. Users will be notified of
          significant changes. Continued use of the Platform after changes constitutes acceptance.
        </p>

        <h2>12. Contact</h2>
        <p>For privacy-related questions, contact the administrator of this EyeOnChess instance.</p>

        <div className="mt-8 text-center">
          <Link href="/legal/terms" className="text-blue-400 hover:underline">
            Terms of Service &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
