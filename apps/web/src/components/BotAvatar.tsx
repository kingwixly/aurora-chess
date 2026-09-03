"use client";

import { useState } from "react";

/**
 * A bot's portrait.
 *
 * `avatar` is a path under /public rather than an emoji. When the file is
 * missing - art lands one band at a time - this falls back to the character's
 * initial on a neutral tile rather than a broken image, so a partial art drop
 * never breaks the roster.
 */
export default function BotAvatar({
  name,
  avatar,
  size = 48,
  className = "",
}: {
  name: string;
  avatar?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const isPath = !!avatar && avatar.startsWith("/");

  if (!isPath || failed) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        className={`flex shrink-0 items-center justify-center rounded-lg bg-night-800 font-display font-semibold text-night-400 ring-1 ring-inset ring-night-700 ${className}`}
      >
        {/* Emoji avatars from the old roster still render here rather than
            being dropped, so an un-migrated database degrades gracefully. */}
        {avatar && !isPath ? avatar : name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // Plain <img>: these are small static files and next/image's optimiser adds
    // a round trip per portrait for no benefit at this size.
    <img
      src={avatar}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-lg object-cover ring-1 ring-inset ring-night-700 ${className}`}
    />
  );
}
