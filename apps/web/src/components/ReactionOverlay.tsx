"use client";

import { REACTIONS, type ReactionType } from "@eyeonchess/chess";

export interface ActiveReaction {
  id: string;
  reaction: ReactionType;
  fromOpponent: boolean;
  timestamp: number;
  xOffset: number;
}

interface ReactionOverlayProps {
  reactions: ActiveReaction[];
  onExpired: (id: string) => void;
}

/**
 * Renders floating, animated reaction emojis over the board during a live game.
 * Each reaction fades out via CSS animation and triggers {@link ReactionOverlayProps.onExpired} when done.
 *
 * @param props - {@link ReactionOverlayProps}
 * @returns A pointer-events-transparent overlay of animated reaction elements.
 */
export default function ReactionOverlay({ reactions, onExpired }: ReactionOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {reactions.map((r) => {
        const def = REACTIONS[r.reaction];
        return (
          <div
            key={r.id}
            className="absolute bottom-4 animate-reaction-float"
            style={{ left: `${r.xOffset}%` }}
            onAnimationEnd={() => onExpired(r.id)}
          >
            <div className="flex flex-col items-center">
              <span className="text-3xl drop-shadow-lg">{def.emoji}</span>
              <span className={`text-xs font-medium ${def.color} drop-shadow`}>{def.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
