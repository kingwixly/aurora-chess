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

const PIECE_ROLES = [
  ["king", "K"],
  ["queen", "Q"],
  ["rook", "R"],
  ["bishop", "B"],
  ["knight", "N"],
  ["pawn", "P"],
] as const;

/**
 * CSS mapping each Chessground piece class to an image.
 *
 * Chessground renders pieces as `<piece class="white king">` and paints them
 * with a background image, so a piece set is a stylesheet rather than a
 * component swap. `fontaine` returns nothing, leaving the library default.
 */
/**
 * Rotate pieces without rotating the board.
 *
 * Chessground positions pieces by transform, so this composes with its own
 * translation rather than replacing it - hence `rotate(180deg)` applied to the
 * piece element while Chessground keeps owning placement.
 */
const ROTATED_PIECES_CSS = [
  '[data-rotate-pieces="true"] .cg-wrap piece {',
  "  transform: rotate(180deg);",
  "  transform-origin: center;",
  "}",
  /* Coordinates and the last-move highlight belong to the board, not the
     pieces, so they deliberately stay put. */
  '[data-rotate-pieces="true"] .cg-wrap coords {',
  "  transform: none;",
  "}",
].join("\n");

function pieceSetCss(set: PieceSet): string {
  if (set === "fontaine") return "";
  return PIECE_ROLES.map(([role, code]) =>
    ["white", "black"]
      .map(
        (colour) =>
          `.cg-wrap piece.${colour}.${role} {` +
          ` background-image: url("/piece-sets/${set}/${colour === "white" ? "w" : "b"}${code}.png") !important;` +
          ` background-size: contain; background-repeat: no-repeat; background-position: center; }`
      )
      .join("\n")
  ).join("\n");
}

/**
 * Injects global CSS applying the user's board colours to Chessground.
 *
 * Piece sets are deliberately absent: the previous implementation applied a CSS
 * filter to the same pieces, which changed their tint without changing the
 * pieces. Real sets need actual SVG assets, so the control was removed rather
 * than left pretending.
 *
 * @returns A `<style>` element with dynamically generated CSS overrides.
 */
export default function BoardThemeStyles() {
  const boardTheme = useSettingsStore((s) => s.boardTheme);
  const pieceSet = useSettingsStore((s) => s.pieceSet);

  const colors = BOARD_COLORS[boardTheme] || BOARD_COLORS.classic;
  const boardBg = generateBoardSvg(colors.light, colors.dark);

  return (
    <style jsx global>{`
      cg-board {
        background-color: ${colors.light} !important;
        background-image: ${boardBg} !important;
      }
      ${pieceSetCss(pieceSet)}
      ${ROTATED_PIECES_CSS}
    `}</style>
  );
}
