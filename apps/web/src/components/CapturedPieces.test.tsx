import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CapturedPieces from "./CapturedPieces";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("CapturedPieces", () => {
  it("renders nothing when no pieces are captured (starting position)", () => {
    const { container } = render(<CapturedPieces fen={STARTING_FEN} color="white" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for black when no black pieces captured", () => {
    const { container } = render(<CapturedPieces fen={STARTING_FEN} color="black" />);
    expect(container.innerHTML).toBe("");
  });

  it("shows captured pieces when a black pawn is missing (white's captures)", () => {
    // Position with one black pawn removed
    const fen = "rnbqkbnr/ppppppp1/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    render(<CapturedPieces fen={fen} color="white" />);
    // White captured a black pawn, so pawn symbol should appear
    expect(screen.getByText("\u265F")).toBeInTheDocument();
  });

  it("shows captured queen symbol when black queen is missing", () => {
    // Position missing the black queen
    const fen = "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    render(<CapturedPieces fen={fen} color="white" />);
    expect(screen.getByText("\u265B")).toBeInTheDocument();
  });

  it("shows captured pieces for black (missing white pieces)", () => {
    // Position with white queen removed
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1";
    render(<CapturedPieces fen={fen} color="black" />);
    expect(screen.getByText("\u265B")).toBeInTheDocument();
  });

  it("shows multiple captured pieces in correct order (queen before pawns)", () => {
    // Missing black queen and 2 black pawns
    const fen = "rnb1kbnr/pppppp2/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const { container } = render(<CapturedPieces fen={fen} color="white" />);
    const spans = container.querySelectorAll("span");
    // Queen first, then 2 pawns
    expect(spans).toHaveLength(3);
    expect(spans[0].textContent).toBe("\u265B");
    expect(spans[1].textContent).toBe("\u265F");
    expect(spans[2].textContent).toBe("\u265F");
  });

  it("applies correct text class for white color", () => {
    const fen = "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const { container } = render(<CapturedPieces fen={fen} color="white" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("text-white");
  });

  it("applies correct text class for black color", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1";
    const { container } = render(<CapturedPieces fen={fen} color="black" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("text-gray-400");
  });
});
