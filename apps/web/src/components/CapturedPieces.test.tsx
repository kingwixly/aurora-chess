import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "../stores/settings";
import { render, screen } from "@testing-library/react";
import CapturedPieces from "./CapturedPieces";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("CapturedPieces", () => {
  // These assertions describe the over-the-board layout, so pin the setting
  // rather than depending on whatever the default happens to be.
  beforeEach(() => {
    useSettingsStore.setState({ materialStyle: "board" });
  });

  it("shows no pieces at the starting position, but reserves the row height", () => {
    // A spacer rather than nothing: the row keeps its height so the board does
    // not jump when the first capture happens.
    const { container } = render(<CapturedPieces fen={STARTING_FEN} color="white" />);
    expect(container.textContent).toBe("");
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
  });

  it("shows no pieces for black at the starting position", () => {
    const { container } = render(<CapturedPieces fen={STARTING_FEN} color="black" />);
    expect(container.textContent).toBe("");
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
    const spans = Array.from(container.querySelectorAll("span"));
    // Queen first, then two pawns. The trailing span is the numeric advantage,
    // which is a separate concern from capture order.
    const pieces = spans.filter((el) => !el.className.includes("font-mono"));
    expect(pieces).toHaveLength(3);
    expect(pieces[0].textContent).toBe("\u265B");
    expect(pieces[1].textContent).toBe("\u265F");
    expect(pieces[2].textContent).toBe("\u265F");
  });

  // Captured pieces are drawn with the installed piece artwork rather than
  // Unicode glyphs: the glyphs rendered inconsistently across platforms, the
  // same problem that made flags show as country codes on Windows. These tests
  // check the right image is used, which is what the colour classes used to be
  // standing in for.
  it("draws white's captures using the white piece artwork", () => {
    useSettingsStore.setState({ materialStyle: "board", pieceSet: "sleek" });
    const fen = "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const { container } = render(<CapturedPieces fen={fen} color="white" />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toMatch(/\/sleek\/w[QRBNP]\.png$/);
  });

  it("draws black's captures using the black piece artwork", () => {
    useSettingsStore.setState({ materialStyle: "board", pieceSet: "sleek" });
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1";
    const { container } = render(<CapturedPieces fen={fen} color="black" />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toMatch(/\/sleek\/b[QRBNP]\.png$/);
  });

  it("falls back to glyphs for the default set, which has no image files", () => {
    useSettingsStore.setState({ materialStyle: "board", pieceSet: "fontaine" });
    const fen = "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const { container } = render(<CapturedPieces fen={fen} color="white" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("\u265B");
  });
});
