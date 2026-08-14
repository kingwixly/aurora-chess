import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ActivityFeed from "./ActivityFeed";

vi.mock("../lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import api from "../lib/api";
const mockGet = vi.mocked(api.get);

describe("ActivityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while loading", () => {
    // Never resolve the promise so it stays in loading state
    mockGet.mockReturnValue(new Promise(() => {}));
    const { container } = render(<ActivityFeed />);
    // Component returns null while loading
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when events list is empty", async () => {
    mockGet.mockResolvedValue({ data: { events: [] } });
    const { container } = render(<ActivityFeed />);
    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("renders events after fetch", async () => {
    const now = new Date().toISOString();
    mockGet.mockResolvedValue({
      data: {
        events: [
          { type: "game_won", message: "You won against Alice", timestamp: now, link: "/game/1" },
          { type: "game_lost", message: "You lost to Bob", timestamp: now, link: null },
        ],
      },
    });

    render(<ActivityFeed />);

    await waitFor(() => {
      expect(screen.getByText("You won against Alice")).toBeInTheDocument();
      expect(screen.getByText("You lost to Bob")).toBeInTheDocument();
    });
  });

  it("shows Recent Activity header", async () => {
    const now = new Date().toISOString();
    mockGet.mockResolvedValue({
      data: {
        events: [{ type: "game_won", message: "Win!", timestamp: now, link: null }],
      },
    });

    render(<ActivityFeed />);

    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });
  });

  it("shows relative time for events", async () => {
    // Timestamp 5 minutes ago
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    mockGet.mockResolvedValue({
      data: {
        events: [{ type: "game_won", message: "Win!", timestamp: fiveMinAgo, link: null }],
      },
    });

    render(<ActivityFeed />);

    await waitFor(() => {
      expect(screen.getByText("5m ago")).toBeInTheDocument();
    });
  });

  it("shows 'now' for very recent events", async () => {
    const justNow = new Date().toISOString();
    mockGet.mockResolvedValue({
      data: {
        events: [{ type: "game_draw", message: "Draw", timestamp: justNow, link: null }],
      },
    });

    render(<ActivityFeed />);

    await waitFor(() => {
      expect(screen.getByText("now")).toBeInTheDocument();
    });
  });

  it("renders links for events with a link", async () => {
    const now = new Date().toISOString();
    mockGet.mockResolvedValue({
      data: {
        events: [{ type: "game_won", message: "Won game", timestamp: now, link: "/game/123" }],
      },
    });

    render(<ActivityFeed />);

    await waitFor(() => {
      const link = screen.getByText("Won game").closest("a");
      expect(link).toHaveAttribute("href", "/game/123");
    });
  });
});
