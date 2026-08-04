import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RatingChart from "./RatingChart";

describe("RatingChart", () => {
  it("shows placeholder when fewer than 2 data points", () => {
    render(<RatingChart history={[]} />);
    expect(screen.getByText("Play more rated games to see your rating chart")).toBeInTheDocument();
  });

  it("shows placeholder for single data point", () => {
    render(<RatingChart history={[{ date: "2025-01-01", rating: 1200 }]} />);
    expect(screen.getByText("Play more rated games to see your rating chart")).toBeInTheDocument();
  });

  it("renders SVG chart with 2+ data points", () => {
    const history = [
      { date: "2025-01-01", rating: 1200 },
      { date: "2025-01-15", rating: 1250 },
      { date: "2025-02-01", rating: 1300 },
    ];
    const { container } = render(<RatingChart history={history} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders Rating History heading", () => {
    const history = [
      { date: "2025-01-01", rating: 1200 },
      { date: "2025-02-01", rating: 1300 },
    ];
    render(<RatingChart history={history} />);
    expect(screen.getByText("Rating History")).toBeInTheDocument();
  });

  it("renders path elements for line and area", () => {
    const history = [
      { date: "2025-01-01", rating: 1200 },
      { date: "2025-02-01", rating: 1300 },
    ];
    const { container } = render(<RatingChart history={history} />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it("renders a circle for the end dot", () => {
    const history = [
      { date: "2025-01-01", rating: 1200 },
      { date: "2025-02-01", rating: 1300 },
    ];
    const { container } = render(<RatingChart history={history} />);
    expect(container.querySelector("circle")).not.toBeNull();
  });
});
