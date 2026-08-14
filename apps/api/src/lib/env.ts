import { logger } from "./logger.js";

/**
 * Environment validation.
 *
 * Checked at boot and fatal on failure, because the alternative is a server
 * that starts happily and then fails at the worst moment — a missing JWT secret
 * does not surface until someone tries to sign in, and a placeholder secret
 * does not surface at all until it is exploited.
 */

interface Requirement {
  key: string;
  /** Reject values that are obviously placeholders rather than secrets. */
  minLength?: number;
  description: string;
}

const REQUIRED: Requirement[] = [
  { key: "DATABASE_URL", description: "Postgres connection string" },
  { key: "JWT_SECRET", minLength: 32, description: "Access token signing secret" },
  { key: "REDIS_URL", description: "Redis connection string" },
];

/** Values that mean somebody copied the example file and never edited it. */
const PLACEHOLDERS = ["change-me", "changeme", "your-secret", "secret", "password", "xxx", "todo"];

export function validateEnv(): void {
  const problems: string[] = [];

  for (const req of REQUIRED) {
    const value = process.env[req.key];
    if (!value) {
      problems.push(`${req.key} is not set (${req.description})`);
      continue;
    }
    if (req.minLength && value.length < req.minLength) {
      problems.push(
        `${req.key} is too short — ${value.length} characters, needs at least ${req.minLength}`
      );
    }
    const lower = value.toLowerCase();
    if (PLACEHOLDERS.some((p) => lower.includes(p))) {
      problems.push(`${req.key} still contains a placeholder value`);
    }
  }

  if (process.env.NODE_ENV === "production") {
    // A cookie without Secure is sent over plain HTTP, which makes session
    // theft trivial on a shared network.
    if (process.env.COOKIE_SECURE === "false") {
      problems.push("COOKIE_SECURE must not be false in production");
    }
    if (!process.env.CORS_ORIGIN) {
      problems.push("CORS_ORIGIN is not set — refusing to allow every origin in production");
    }
  }

  if (problems.length > 0) {
    logger.fatal(
      { problems },
      "Configuration is not valid. Fix these and restart:\n  - " + problems.join("\n  - ")
    );
    process.exit(1);
  }

  logger.info("Environment validated");
}
