import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MoveFeedbackPopup from "./MoveFeedbackPopup";

describe("MoveFeedbackPopup", () => {
  it("renders null when classification is null", () => {
    const { container } = render(<MoveFeedbackPopup classification={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders null when classification is unknown", () => {
    const { container } = render(<MoveFeedbackPopup classification="UNKNOWN_TYPE" />);
    expect(container.innerHTML).toBe("");
  });

  it("shows Brilliant!! text for BRILLIANT classification", () => {
    render(<MoveFeedbackPopup classification="BRILLIANT" />);
    expect(screen.getByText("Brilliant!!")).toBeInTheDocument();
  });

  it("shows Blunder! text for BLUNDER classification", () => {
    render(<MoveFeedbackPopup classification="BLUNDER" />);
    expect(screen.getByText("Blunder!")).toBeInTheDocument();
  });

  it("shows Book Move text for BOOK classification", () => {
    render(<MoveFeedbackPopup classification="BOOK" />);
    expect(screen.getByText("Book Move")).toBeInTheDocument();
  });

  it("shows Inaccuracy text for INACCURACY classification", () => {
    render(<MoveFeedbackPopup classification="INACCURACY" />);
    expect(screen.getByText("Inaccuracy")).toBeInTheDocument();
  });

  it("applies correct color class for BRILLIANT", () => {
    render(<MoveFeedbackPopup classification="BRILLIANT" />);
    const text = screen.getByText("Brilliant!!");
    expect(text.className).toContain("text-cyan-400");
  });

  it("applies correct color class for BLUNDER", () => {
    render(<MoveFeedbackPopup classification="BLUNDER" />);
    const text = screen.getByText("Blunder!");
    expect(text.className).toContain("text-red-400");
  });

  it("applies correct color class for BEST", () => {
    render(<MoveFeedbackPopup classification="BEST" />);
    const text = screen.getByText("Best Move");
    expect(text.className).toContain("text-green-400");
  });

  it("shows Great Move! for GREAT classification", () => {
    render(<MoveFeedbackPopup classification="GREAT" />);
    expect(screen.getByText("Great Move!")).toBeInTheDocument();
  });
});
