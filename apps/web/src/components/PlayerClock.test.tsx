import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PlayerClock from "./PlayerClock";

describe("PlayerClock", () => {
  it("should display formatted time", () => {
    render(<PlayerClock timeMs={600000} isActive={false} isRunning={false} />);
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("should display zero time", () => {
    render(<PlayerClock timeMs={0} isActive={false} isRunning={false} />);
    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("should display minutes and seconds correctly", () => {
    render(<PlayerClock timeMs={95000} isActive={false} isRunning={false} />);
    expect(screen.getByText("1:35")).toBeInTheDocument();
  });

  it("should pad seconds with zero", () => {
    render(<PlayerClock timeMs={305000} isActive={false} isRunning={false} />);
    // 305 seconds = 5:05
    expect(screen.getByText("5:05")).toBeInTheDocument();
  });

  it("should have red styling when time is low and active", () => {
    const { container } = render(<PlayerClock timeMs={20000} isActive={true} isRunning={true} />);
    const clockDiv = container.firstChild as HTMLElement;
    expect(clockDiv.className).toContain("bg-red-900");
  });

  it("should have normal styling when time is not low", () => {
    const { container } = render(<PlayerClock timeMs={120000} isActive={true} isRunning={true} />);
    const clockDiv = container.firstChild as HTMLElement;
    expect(clockDiv.className).toContain("bg-gray-700");
  });

  it("should have inactive styling when not active", () => {
    const { container } = render(<PlayerClock timeMs={120000} isActive={false} isRunning={true} />);
    const clockDiv = container.firstChild as HTMLElement;
    expect(clockDiv.className).toContain("bg-gray-800");
  });
});
