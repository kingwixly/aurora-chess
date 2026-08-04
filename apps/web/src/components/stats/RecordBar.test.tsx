import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RecordBar from "./RecordBar";

describe("RecordBar", () => {
  it("shows 'No games' when total is 0", () => {
    render(<RecordBar label="Overall" wins={0} losses={0} draws={0} />);
    expect(screen.getByText("No games")).toBeInTheDocument();
  });

  it("renders the label", () => {
    render(<RecordBar label="Overall" wins={5} losses={3} draws={2} />);
    expect(screen.getByText("Overall")).toBeInTheDocument();
  });

  it("renders W/D/L counts", () => {
    render(<RecordBar label="Overall" wins={5} losses={3} draws={2} />);
    expect(screen.getByText("5W")).toBeInTheDocument();
    expect(screen.getByText("2D")).toBeInTheDocument();
    expect(screen.getByText("3L")).toBeInTheDocument();
  });

  it("renders the bar container", () => {
    const { container } = render(<RecordBar label="Vs Humans" wins={10} losses={5} draws={1} />);
    // The stacked bar has colored divs
    const bar = container.querySelector(".bg-green-500");
    expect(bar).not.toBeNull();
  });

  it("renders all three bar segments when all non-zero", () => {
    const { container } = render(<RecordBar label="Test" wins={3} losses={2} draws={1} />);
    expect(container.querySelector(".bg-green-500")).not.toBeNull();
    expect(container.querySelector(".bg-gray-500")).not.toBeNull();
    expect(container.querySelector(".bg-red-500")).not.toBeNull();
  });
});
