import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import BoardThemeStyles from "./BoardThemeStyles";

vi.mock("../stores/settings", () => ({
  useSettingsStore: (selector: (s: Record<string, string>) => string) =>
    selector({ boardTheme: "classic", pieceSet: "classic" }),
}));

describe("BoardThemeStyles", () => {
  it("renders a style element or style content", () => {
    const { container } = render(<BoardThemeStyles />);
    // styled-jsx may render as <style> or the content may appear differently
    const html = container.innerHTML;
    // The component should produce some output containing CSS
    expect(html.length).toBeGreaterThan(0);
  });

  it("contains board color CSS for cg-board", () => {
    const { container } = render(<BoardThemeStyles />);
    const html = container.innerHTML;
    expect(html).toContain("cg-board");
  });

  it("contains the classic light color", () => {
    const { container } = render(<BoardThemeStyles />);
    const html = container.innerHTML;
    expect(html).toContain("#f0d9b5");
  });

  it("contains background-image or background-color", () => {
    const { container } = render(<BoardThemeStyles />);
    const html = container.innerHTML;
    expect(html).toContain("background");
  });
});
