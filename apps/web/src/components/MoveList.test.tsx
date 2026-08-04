import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MoveList from "./MoveList";

describe("MoveList", () => {
  const moves = [
    { ply: 1, san: "e4" },
    { ply: 2, san: "e5" },
    { ply: 3, san: "Nf3" },
    { ply: 4, san: "Nc6" },
    { ply: 5, san: "Bb5" },
  ];

  it("should render all moves", () => {
    render(<MoveList moves={moves} currentPly={0} onGoToPly={() => {}} />);
    expect(screen.getByText("e4")).toBeInTheDocument();
    expect(screen.getByText("e5")).toBeInTheDocument();
    expect(screen.getByText("Nf3")).toBeInTheDocument();
    expect(screen.getByText("Nc6")).toBeInTheDocument();
    expect(screen.getByText("Bb5")).toBeInTheDocument();
  });

  it("should render move numbers", () => {
    render(<MoveList moves={moves} currentPly={0} onGoToPly={() => {}} />);
    expect(screen.getByText("1.")).toBeInTheDocument();
    expect(screen.getByText("2.")).toBeInTheDocument();
    expect(screen.getByText("3.")).toBeInTheDocument();
  });

  it("should show no moves message when empty", () => {
    render(<MoveList moves={[]} currentPly={0} onGoToPly={() => {}} />);
    expect(screen.getByText("No moves yet")).toBeInTheDocument();
  });

  it("should call onGoToPly when a move is clicked", () => {
    const onGoToPly = vi.fn();
    render(<MoveList moves={moves} currentPly={0} onGoToPly={onGoToPly} />);
    fireEvent.click(screen.getByText("Nf3"));
    expect(onGoToPly).toHaveBeenCalledWith(3);
  });

  it("should highlight the current move", () => {
    render(<MoveList moves={moves} currentPly={3} onGoToPly={() => {}} />);
    const nf3Button = screen.getByText("Nf3");
    expect(nf3Button.className).toContain("bg-blue-600");
  });

  it("should not highlight non-current moves", () => {
    render(<MoveList moves={moves} currentPly={3} onGoToPly={() => {}} />);
    const e4Button = screen.getByText("e4");
    expect(e4Button.className).not.toContain("bg-blue-600");
  });
});
