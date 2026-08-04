import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ActivityChart from "./ActivityChart";

describe("ActivityChart", () => {
  it("shows 'No recent games' when activity is empty", () => {
    render(<ActivityChart activity={[]} />);
    expect(screen.getByText("No recent games")).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(<ActivityChart activity={[{ date: "2025-01-01", count: 3 }]} />);
    expect(screen.getByText("Activity (30 days)")).toBeInTheDocument();
  });

  it("renders bar elements for each day", () => {
    const activity = [
      { date: "2025-01-01", count: 2 },
      { date: "2025-01-02", count: 5 },
      { date: "2025-01-03", count: 0 },
    ];
    const { container } = render(<ActivityChart activity={activity} />);
    // Each day gets a flex-1 group div
    const bars = container.querySelectorAll(".group");
    expect(bars).toHaveLength(3);
  });

  it("renders bars with height based on count", () => {
    const activity = [
      { date: "2025-01-01", count: 5 },
      { date: "2025-01-02", count: 10 },
    ];
    const { container } = render(<ActivityChart activity={activity} />);
    const barDivs = container.querySelectorAll(".bg-blue-500");
    expect(barDivs).toHaveLength(2);
    // Max count bar should have 100% height
    expect(barDivs[1].getAttribute("style")).toContain("100%");
  });

  it("renders heading even when empty", () => {
    render(<ActivityChart activity={[]} />);
    expect(screen.getByText("Activity (30 days)")).toBeInTheDocument();
  });
});
