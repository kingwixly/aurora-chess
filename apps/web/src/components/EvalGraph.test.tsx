import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import EvalGraph from "./EvalGraph";

describe("EvalGraph", () => {
  const onClickPly = vi.fn();

  it("renders null when points array is empty", () => {
    const { container } = render(<EvalGraph points={[]} currentPly={0} onClickPly={onClickPly} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders an SVG element with data points", () => {
    const points = [
      { ply: 0, eval: 0, mate: null },
      { ply: 1, eval: 50, mate: null },
      { ply: 2, eval: -30, mate: null },
    ];
    const { container } = render(
      <EvalGraph points={points} currentPly={1} onClickPly={onClickPly} />
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("renders path elements for the eval line and area fills", () => {
    const points = [
      { ply: 0, eval: 100, mate: null },
      { ply: 1, eval: -100, mate: null },
    ];
    const { container } = render(
      <EvalGraph points={points} currentPly={0} onClickPly={onClickPly} />
    );
    const paths = container.querySelectorAll("path");
    // Should have white area, black area, and eval line paths
    expect(paths.length).toBeGreaterThanOrEqual(3);
  });

  it("renders Y-axis labels (+5, 0, -5)", () => {
    const points = [
      { ply: 0, eval: 0, mate: null },
      { ply: 1, eval: 200, mate: null },
    ];
    const { container } = render(
      <EvalGraph points={points} currentPly={0} onClickPly={onClickPly} />
    );
    const texts = container.querySelectorAll("text");
    const textContents = Array.from(texts).map((t) => t.textContent?.trim());
    expect(textContents).toContain("+5");
    expect(textContents).toContain("0");
    expect(textContents).toContain("-5");
  });

  it("renders a current ply marker line when currentPly > 0", () => {
    const points = [
      { ply: 0, eval: 0, mate: null },
      { ply: 1, eval: 100, mate: null },
      { ply: 2, eval: 50, mate: null },
    ];
    const { container } = render(
      <EvalGraph points={points} currentPly={2} onClickPly={onClickPly} />
    );
    const lines = container.querySelectorAll("line");
    // Should have at least the zero line and the current ply marker
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it("handles mate evaluations", () => {
    const points = [
      { ply: 0, eval: 0, mate: null },
      { ply: 1, eval: 0, mate: 3 },
    ];
    const { container } = render(
      <EvalGraph points={points} currentPly={0} onClickPly={onClickPly} />
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });
});
