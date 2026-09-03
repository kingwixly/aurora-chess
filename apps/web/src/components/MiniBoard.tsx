"use client";

/**
 * A small static board drawn from a FEN.
 *
 * Uses the real piece images rather than Unicode glyphs. The glyph version
 * rendered every piece in the same colour, because the outline and filled
 * variants of a Unicode chess piece are separate characters and the text colour
 * overrode both - so a starting position looked like white had all 32 pieces.
 *
 * Decorative only: hidden from screen readers and not interactive.
 */
export default function MiniBoard({
  fen,
  set = "fatty",
  className = "",
}: {
  fen: string;
  set?: string;
  className?: string;
}) {
  const rows = fen.split(" ")[0].split("/");

  const squares: { piece: string | null; dark: boolean }[] = [];
  rows.forEach((row, rankIdx) => {
    let fileIdx = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch); i++) {
          squares.push({ piece: null, dark: (rankIdx + fileIdx) % 2 === 1 });
          fileIdx++;
        }
      } else {
        // Uppercase is white in FEN, lowercase black.
        const colour = ch === ch.toUpperCase() ? "w" : "b";
        squares.push({
          piece: `${colour}${ch.toUpperCase()}`,
          dark: (rankIdx + fileIdx) % 2 === 1,
        });
        fileIdx++;
      }
    }
  });

  return (
    <div
      aria-hidden="true"
      className={`grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg ${className}`}
    >
      {squares.map((sq, i) => (
        <div key={i} className={`relative ${sq.dark ? "bg-[#b58863]" : "bg-[#f0d9b5]"}`}>
          {sq.piece && (
            <img
              src={`/piece-sets/${set}/${sq.piece}.png`}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
        </div>
      ))}
    </div>
  );
}
