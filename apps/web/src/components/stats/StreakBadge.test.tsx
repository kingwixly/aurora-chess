import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StreakBadge from "./StreakBadge";

describe("StreakBadge", () => {
  it("renders Streaks heading", () => {
    render(<StreakBadge current={{ type: "none", count: 0 }} bestWin={5} />);
    expect(screen.getByText("Streaks")).toBeInTheDocument();
  });

  it("shows win streak info", () => {
    render(<StreakBadge current={{ type: "win", count: 3 }} bestWin={7} />);
    expect(screen.getByText("3 win streak")).toBeInTheDocument();
  });

  it("shows loss streak info", () => {
    render(<StreakBadge current={{ type: "loss", count: 2 }} bestWin={5} />);
    expect(screen.getByText("2 loss streak")).toBeInTheDocument();
  });

  it("shows no active streak", () => {
    render(<StreakBadge current={{ type: "none", count: 0 }} bestWin={5} />);
    expect(screen.getByText("No active streak")).toBeInTheDocument();
  });

  it("shows best win streak value", () => {
    render(<StreakBadge current={{ type: "none", count: 0 }} bestWin={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Best Win Streak")).toBeInTheDocument();
  });

  it("shows Current label", () => {
    render(<StreakBadge current={{ type: "win", count: 1 }} bestWin={3} />);
    expect(screen.getByText("Current")).toBeInTheDocument();
  });
});
