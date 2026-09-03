import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./api";
import { useToast } from "@aurora/ui";

let socket: Socket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let wasDisconnected = false;
/**
 * When the disconnect happened.
 *
 * Navigating between pages tears the socket down and rebuilds it, so every tab
 * change counted as a reconnection and fired a toast. A real network drop lasts
 * seconds; a route change is over in milliseconds.
 */
let disconnectedAt = 0;

/** Only announce a reconnection if the outage was long enough to notice. */
const RECONNECT_NOTICE_THRESHOLD_MS = 3000;

/**
 * Establishes a Socket.IO connection to the API server.
 *
 * Configured with resilient reconnection:
 * - Auth token refreshed on each reconnect attempt (handles JWT expiry)
 * - Exponential backoff: 1s → 10s cap, up to 10 attempts
 * - Heartbeat every 20s to maintain online presence
 */
export function connectSocket() {
  const token = getAccessToken();
  if (!token) return;

  if (socket?.connected) return;

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost";

  socket = io(apiUrl, {
    // Auth as function - called on each reconnect to get fresh token
    auth: (cb) => {
      cb({ token: getAccessToken() || token });
    },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on("connect", () => {
    if (wasDisconnected) {
      // Silent unless the connection was actually gone for a moment. Telling
      // someone they reconnected when they merely clicked a link is noise, and
      // noise trains people to ignore the toast that matters.
      // Opt-in. Even with a threshold, a toast nobody asked for during a game
      // is worse than recovering quietly - the reconnection already happened,
      // and there is nothing for the player to do about it.
      let wanted = false;
      try {
        wanted = localStorage.getItem("aurora-reconnect-notices") === "true";
      } catch {
        wanted = false;
      }
      if (wanted && Date.now() - disconnectedAt > RECONNECT_NOTICE_THRESHOLD_MS) {
        useToast.getState().show("Reconnected", "success");
      }
      wasDisconnected = false;
    }
    // Start heartbeat
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      socket?.emit("heartbeat");
    }, 20_000);
  });

  socket.on("disconnect", () => {
    wasDisconnected = true;
    disconnectedAt = Date.now();
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  // Handle auth errors on reconnect - try refreshing token
  socket.on("connect_error", async (err) => {
    if (err.message === "Invalid token" || err.message === "Missing token") {
      try {
        const api = (await import("./api")).default;
        await api.post("/api/v1/auth/refresh");
      } catch {
        // Token refresh failed - user will need to re-login
      }
    }
  });
}

/**
 * Disconnects the active Socket.IO connection and clears the heartbeat interval.
 */
export function disconnectSocket() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Returns the current Socket.IO client instance, or null if not connected.
 *
 * @returns The active socket instance or null.
 */
export function getSocket(): Socket | null {
  return socket;
}
