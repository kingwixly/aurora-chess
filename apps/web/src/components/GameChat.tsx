"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlayerName } from "@aurora/ui";
import api from "../lib/api";
import { getSocket } from "../lib/socket";
import { useSettingsStore } from "../stores/settings";

interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    title?: string | null;
    countryCode?: string | null;
  } | null;
}

/**
 * Chat during a game.
 *
 * Off by default and remembered per player. Most in-game chat is tilt, and the
 * people it lands on are the ones who quietly stop playing - so this is
 * something you turn on, not something you turn off after the first time it
 * ruins a game.
 */
export default function GameChat({ gameId }: { gameId: string }) {
  const chatEnabled = useSettingsStore((s) => s.gameChatEnabled);
  const setChatEnabled = useSettingsStore((s) => s.setGameChatEnabled);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [denied, setDenied] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  // Load history first, so a refresh mid-game does not empty the conversation.
  useEffect(() => {
    if (!chatEnabled) return;
    let cancelled = false;
    api
      .get(`/api/v1/games/${gameId}/chat`)
      .then(({ data }) => {
        if (!cancelled) setMessages(data.messages ?? []);
      })
      .catch(() => {
        // History is a convenience; live messages still work without it.
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, chatEnabled]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatEnabled) return;

    const onMessage = (m: ChatMessage) =>
      // Guard against a duplicate when history and the socket race.
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    const onDenied = ({ reason }: { reason: string }) => setDenied(reason);

    socket.on("game:chat", onMessage);
    socket.on("game:chat:denied", onDenied);
    return () => {
      socket.off("game:chat", onMessage);
      socket.off("game:chat:denied", onDenied);
    };
  }, [chatEnabled]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    getSocket()?.emit("game:chat", { gameId, body });
    setDraft("");
  }, [draft, gameId]);

  if (!chatEnabled) {
    return (
      <div className="rounded-xl bg-night-900 p-4 ring-1 ring-inset ring-night-700">
        <p className="text-sm text-night-400">Chat is off for this game.</p>
        <button
          onClick={() => setChatEnabled(true)}
          className="mt-2 text-sm font-medium text-aurora-cyan hover:underline"
        >
          Turn on chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex max-h-64 flex-col rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
      <div className="flex items-center justify-between border-b border-night-700 px-4 py-2">
        <h3 className="text-xs uppercase tracking-wider text-night-400">Chat</h3>
        <button
          onClick={() => setChatEnabled(false)}
          className="text-xs text-night-400 transition-colors hover:text-white"
        >
          Turn off
        </button>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-xs text-night-400">No messages.</p>
        ) : (
          messages.map((m) => (
            <p key={m.id} className="text-sm">
              {m.author && (
                <span className="mr-1.5 inline-flex align-middle">
                  <PlayerName
                    username={m.author.username}
                    title={m.author.title as never}
                    countryCode={m.author.countryCode}
                    size="sm"
                  />
                </span>
              )}
              <span className="break-words text-night-300">{m.body}</span>
            </p>
          ))
        )}
        <div ref={bottom} />
      </div>

      {denied && <p className="px-4 pb-1 text-xs text-red-300">{denied}</p>}

      <div className="flex gap-2 border-t border-night-700 p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          maxLength={200}
          placeholder="Say something"
          className="flex-1 rounded-lg border border-night-700 bg-night-800 px-3 py-2 text-sm outline-none focus:border-aurora-cyan"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          className="rounded-lg bg-aurora-cyan px-4 text-sm font-semibold text-night-950 disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
