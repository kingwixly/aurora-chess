import { prisma } from "./prisma.js";

/** Configuration data for site-wide settings. */
export interface SiteSettingsData {
  siteName: string;
  registrationOpen: boolean;
  /** Require an invite code to sign up. */
  inviteOnly: boolean;
  maxUsers: number;
  requireEmailVerification: boolean;
}

/**
 * Load site settings from the database, falling back to environment variables.
 * @returns The resolved site settings.
 */
export async function getSiteSettings(): Promise<SiteSettingsData> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });

  if (settings) {
    return {
      siteName: settings.siteName,
      registrationOpen: settings.registrationOpen,
      inviteOnly: settings.inviteOnly,
      maxUsers: settings.maxUsers,
      requireEmailVerification: settings.requireEmailVerification,
    };
  }

  // Fallback to env vars
  return {
    siteName: process.env.SITE_NAME || "AuroraChess",
    registrationOpen: process.env.REGISTRATION_OPEN !== "false",
    // Opt-in, so an unconfigured install is open rather than accidentally
    // locked behind codes nobody has.
    inviteOnly: process.env.INVITE_ONLY === "true",
    maxUsers: parseInt(process.env.MAX_USERS || "0"),
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
  };
}
