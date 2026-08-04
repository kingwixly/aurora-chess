"use client";

import { useSettingsStore, BoardTheme, PieceSet } from "../stores/settings";

const BOARD_COLORS: Record<BoardTheme, { light: string; dark: string }> = {
  classic: { light: "#f0d9b5", dark: "#b58863" },
  wood: { light: "#e8c98e", dark: "#a67c52" },
  green: { light: "#ffffdd", dark: "#86a666" },
  blue: { light: "#dee3e6", dark: "#8ca2ad" },
  purple: { light: "#e8d0ff", dark: "#9070b0" },
  dark: { light: "#4b4847", dark: "#302e2b" },
};

const PIECE_FILTERS: Record<PieceSet, string> = {
  classic: "none",
  modern: "saturate(1.3) contrast(1.15) brightness(1.05)",
  minimal: "grayscale(0.4) contrast(1.4)",
};

function generateBoardSvg(light: string, dark: string): string {
  // Generate an 8x8 checkerboard SVG
  let rects = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const isLight = (x + y) % 2 === 0;
      const color = isLight ? light : dark;
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${rects}</svg>`;
  return `url('data:image/svg+xml;base64,${btoa(svg)}')`;
}

/**
 * Injects global CSS styles that apply the user's selected board theme colors
 * and piece set filter to the Chessground board elements.
 *
 * @returns A `<style>` element with dynamically generated CSS overrides.
 */
export default function BoardThemeStyles() {
  const boardTheme = useSettingsStore((s) => s.boardTheme);
  const pieceSet = useSettingsStore((s) => s.pieceSet);

  const colors = BOARD_COLORS[boardTheme] || BOARD_COLORS.classic;
  const filter = PIECE_FILTERS[pieceSet] || "none";
  const boardBg = generateBoardSvg(colors.light, colors.dark);

  return (
    <style jsx global>{`
      cg-board {
        background-color: ${colors.light} !important;
        background-image: ${boardBg} !important;
      }
      ${filter !== "none" ? `.cg-wrap piece { filter: ${filter} !important; }` : ""}
    `}</style>
  );
}
