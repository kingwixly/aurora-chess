"use client";

import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <main className="flex flex-col items-center min-h-screen p-4 pt-12">
      <div className="max-w-3xl w-full prose prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-sm text-gray-400">Last updated: March 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account on EyeOnChess (&quot;the Platform&quot;), you agree to be bound by
          these Terms of Service (&quot;Terms&quot;), our Privacy Policy, and all applicable laws
          and regulations. If you do not agree to these Terms, you are prohibited from using or
          accessing the Platform. These Terms constitute a legally binding agreement between you
          (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and the operator of this
          EyeOnChess instance (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years of age to use the Platform. By using EyeOnChess, you
          represent and warrant that you are at least 13 years old and have the legal capacity to
          enter into these Terms. If you are under 18, you represent that your parent or legal
          guardian has reviewed and agreed to these Terms on your behalf.
        </p>

        <h2>3. Account Registration</h2>
        <p>
          3.1. You must provide a valid email address, a unique username, and a password to create
          an account. You are responsible for maintaining the confidentiality of your account
          credentials.
        </p>
        <p>
          3.2. You are solely responsible for all activities that occur under your account. You must
          notify the platform administrator immediately of any unauthorized use of your account.
        </p>
        <p>
          3.3. You agree not to create multiple accounts for the purpose of manipulating ratings,
          evading bans, or any other form of abuse.
        </p>
        <p>
          3.4. We reserve the right to suspend or terminate your account at any time for violation
          of these Terms, without prior notice.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree NOT to:</p>
        <ul>
          <li>
            Use any chess engine, computer assistance, or automated tools during live games against
            human opponents (commonly known as &quot;cheating&quot;)
          </li>
          <li>Intentionally lose games to manipulate ratings (&quot;sandbagging&quot;)</li>
          <li>Harass, threaten, or abuse other users in any way</li>
          <li>
            Attempt to gain unauthorized access to the Platform, other user accounts, or the
            underlying infrastructure
          </li>
          <li>Use the Platform to transmit any malicious code, viruses, or harmful content</li>
          <li>Scrape, crawl, or use automated means to access the Platform without permission</li>
          <li>Impersonate another user or entity</li>
          <li>Use the Platform for any illegal purpose or in violation of any applicable laws</li>
          <li>Interfere with or disrupt the Platform or servers connected to the Platform</li>
          <li>
            Attempt to reverse engineer, decompile, or disassemble any part of the Platform (except
            as permitted by the open source license)
          </li>
          <li>
            Circumvent any security measures, rate limits, or access controls implemented on the
            Platform
          </li>
          <li>
            Use the Platform to distribute spam, unsolicited messages, or promotional material
          </li>
        </ul>

        <h2>5. Fair Play Policy</h2>
        <p>
          5.1. EyeOnChess uses an Elo rating system. You agree to play all rated games to the best
          of your natural ability without the assistance of chess engines or other computerized
          aids.
        </p>
        <p>
          5.2. Bot games (games against the Stockfish engine) are explicitly permitted and are
          clearly labeled. Engine assistance is only prohibited in human vs. human games.
        </p>
        <p>
          5.3. We reserve the right to analyze games for evidence of engine use and to take action
          including rating adjustments, temporary suspensions, or permanent bans.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          6.1. EyeOnChess is open source software licensed under the MIT License. The source code is
          available at the project&apos;s repository.
        </p>
        <p>
          6.2. The Stockfish chess engine is licensed under the GNU General Public License v3. We
          acknowledge and comply with the terms of that license.
        </p>
        <p>
          6.3. Chess game moves and positions are not copyrightable. Your game data (moves, results,
          analysis) is stored on the Platform but you retain no exclusive rights over chess moves.
        </p>
        <p>
          6.4. Your username, profile information, and user-generated content (such as collection
          names) remain your responsibility. You grant the Platform a non-exclusive license to
          display this content as part of the service.
        </p>

        <h2>7. Game Data and Analysis</h2>
        <p>
          7.1. All games played on the Platform are recorded and stored, including moves,
          timestamps, and results.
        </p>
        <p>
          7.2. Post-game analysis is performed by the Stockfish engine running on the server. This
          analysis data (evaluations, move classifications, accuracy percentages) is stored
          alongside your game records.
        </p>
        <p>
          7.3. Game data may be visible to other users as described in the Privacy Policy (game
          history, results, and statistics are public).
        </p>

        <h2>8. Service Availability</h2>
        <p>
          8.1. EyeOnChess is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We
          do not guarantee that the Platform will be available at all times or free from errors.
        </p>
        <p>
          8.2. We may modify, suspend, or discontinue the Platform (or any part thereof) at any time
          without prior notice. We shall not be liable to you or any third party for any
          modification, suspension, or discontinuation.
        </p>
        <p>
          8.3. We are not responsible for any loss of data, including but not limited to game
          records, analysis data, or account information, resulting from server failures, software
          bugs, or force majeure events.
        </p>

        <h2>9. Disclaimer of Warranties</h2>
        <p>
          THE PLATFORM IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
          IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE
          UNINTERRUPTED, SECURE, OR ERROR-FREE. WE DO NOT WARRANT THE ACCURACY OR COMPLETENESS OF
          ANY CHESS ANALYSIS, ENGINE EVALUATIONS, OR MOVE CLASSIFICATIONS PROVIDED BY THE PLATFORM.
        </p>

        <h2>10. Limitation of Liability</h2>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE PLATFORM OPERATORS, ITS
          CONTRIBUTORS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL,
          OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR ACCESS TO OR USE OF OR INABILITY TO
          ACCESS OR USE THE PLATFORM; (B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE PLATFORM;
          (C) ANY CONTENT OBTAINED FROM THE PLATFORM; OR (D) UNAUTHORIZED ACCESS, USE, OR ALTERATION
          OF YOUR TRANSMISSIONS OR CONTENT.
        </p>

        <h2>11. Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless the Platform operators, contributors,
          and licensors from and against any and all claims, liabilities, damages, losses, costs,
          expenses, or fees (including reasonable attorneys&apos; fees) arising from your use of the
          Platform, your violation of these Terms, or your violation of any rights of a third party.
        </p>

        <h2>12. Account Termination</h2>
        <p>
          12.1. You may request account deactivation at any time by contacting the platform
          administrator or declining the Terms of Service.
        </p>
        <p>
          12.2. We may terminate or suspend your account immediately, without prior notice or
          liability, for any reason, including without limitation if you breach these Terms.
        </p>
        <p>
          12.3. Upon termination, your right to use the Platform will immediately cease. All
          provisions of these Terms which by their nature should survive termination shall survive,
          including, without limitation, ownership provisions, warranty disclaimers, indemnity, and
          limitations of liability.
        </p>

        <h2>13. Open Source</h2>
        <p>
          EyeOnChess is open source software. The source code is available under the MIT License.
          These Terms of Service apply to your use of this specific hosted instance, not to the
          software itself. You are free to host your own instance subject to the MIT License terms.
        </p>

        <h2>14. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the
          jurisdiction in which this instance is operated, without regard to its conflict of law
          provisions.
        </p>

        <h2>15. Changes to Terms</h2>
        <p>
          We reserve the right to modify or replace these Terms at any time. If a revision is
          material, we will provide notice prior to any new terms taking effect. You may be required
          to re-accept updated Terms. What constitutes a material change will be determined at our
          sole discretion.
        </p>

        <h2>16. Severability</h2>
        <p>
          If any provision of these Terms is held to be unenforceable or invalid, such provision
          will be changed and interpreted to accomplish the objectives of such provision to the
          greatest extent possible under applicable law, and the remaining provisions will continue
          in full force and effect.
        </p>

        <h2>17. Entire Agreement</h2>
        <p>
          These Terms, together with the Privacy Policy, constitute the entire agreement between you
          and the Platform operators regarding your use of the Platform, and supersede all prior
          agreements and understandings.
        </p>

        <h2>18. Contact</h2>
        <p>
          For questions about these Terms of Service, contact the administrator of this EyeOnChess
          instance.
        </p>

        <div className="mt-8 text-center">
          <Link href="/legal/privacy" className="text-blue-400 hover:underline">
            &larr; Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
