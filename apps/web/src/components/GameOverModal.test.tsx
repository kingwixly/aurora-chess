import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GameOverModal from "./GameOverModal";

const defaultProps = {
  gameOver: {
    result: "1-0",
    termination: "CHECKMATE",
    ratingChange: { white: 12, black: -12 },
  },
  rematchIncoming: false,
  rematchOffered: false,
  onRematchOffer: vi.fn(),
  onRematchAccept: vi.fn(),
  onRematchDecline: vi.fn(),
  onClose: vi.fn(),
  resultLabel: "White wins by checkmate",
  playerColor: "white" as const,
  gameId: "game-1",
};

function renderModal(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<GameOverModal {...props} />);
}

describe("GameOverModal", () => {
  it("leads with the outcome from the viewer's side", () => {
    // "Game Over" told you nothing you did not already know; the headline is
    // now the result as it applies to you.
    renderModal();
    expect(screen.getByText("You won")).toBeInTheDocument();
    expect(screen.getByText("by checkmate")).toBeInTheDocument();
  });

  it("shows the neutral result for a spectator", () => {
    renderModal({ playerColor: null });
    expect(screen.queryByText("You won")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "White wins by checkmate" })).toBeInTheDocument();
  });

  it("shows only the viewer's rating change", () => {
    // Both deltas were shown before, which made you hunt for your own.
    renderModal();
    expect(screen.getByText("+12")).toBeInTheDocument();
    expect(screen.queryByText("-12")).not.toBeInTheDocument();
  });

  it("shows the loser's delta when viewing as black", () => {
    renderModal({ playerColor: "black" });
    expect(screen.getByText("-12")).toBeInTheDocument();
  });

  it("colours a gain green and a loss red", () => {
    renderModal();
    expect(screen.getByText("+12").className).toContain("text-emerald-400");
    renderModal({ playerColor: "black" });
    expect(screen.getByText("-12").className).toContain("text-red-400");
  });

  it("rematch button calls onRematchOffer", () => {
    const onRematchOffer = vi.fn();
    renderModal({ onRematchOffer });
    fireEvent.click(screen.getByText("Play again"));
    expect(onRematchOffer).toHaveBeenCalledOnce();
  });

  it("shows Accept Rematch and Decline when rematchIncoming=true", () => {
    renderModal({ rematchIncoming: true });
    expect(screen.getByText("Accept rematch")).toBeInTheDocument();
    expect(screen.getByText("Decline")).toBeInTheDocument();
  });

  it("Accept Rematch calls onRematchAccept", () => {
    const onRematchAccept = vi.fn();
    renderModal({ rematchIncoming: true, onRematchAccept });
    fireEvent.click(screen.getByText("Accept rematch"));
    expect(onRematchAccept).toHaveBeenCalledOnce();
  });

  it("Decline calls onRematchDecline", () => {
    const onRematchDecline = vi.fn();
    renderModal({ rematchIncoming: true, onRematchDecline });
    fireEvent.click(screen.getByText("Decline"));
    expect(onRematchDecline).toHaveBeenCalledOnce();
  });

  it("shows waiting state when rematchOffered=true", () => {
    renderModal({ rematchOffered: true });
    expect(screen.getByText("Waiting for your opponent")).toBeInTheDocument();
    expect(screen.queryByText("Rematch")).not.toBeInTheDocument();
  });

  it("rematch button replaced by waiting indicator when rematchOffered=true", () => {
    renderModal({ rematchOffered: true });
    expect(screen.getByText("Waiting for your opponent")).toBeInTheDocument();
  });

  it("Back button calls onClose", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("Back to the board"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
