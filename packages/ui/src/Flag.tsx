"use client";

/**
 * Country flags, drawn rather than typed.
 *
 * Emoji flags are regional-indicator pairs, and **Windows has no flag glyphs**
 * — it renders them as the two letters, so "US" and "GB" appeared as text while
 * every other platform showed a flag. There is no font fix for that.
 *
 * These are simplified band constructions: correct colours and orientation, no
 * crests or devices. At the 16px this renders at, detail is invisible anyway,
 * and drawing them avoids both an 80-file asset dump and any question about
 * reproducing someone's artwork.
 */

/** Colour bands per country, in order. */
const BANDS: Record<string, string[]> = {
  AE: ["#00732F", "#FFFFFF", "#000000"], // h
  AM: ["#D90012", "#0033A0", "#F2A800"], // h
  AR: ["#74ACDF", "#FFFFFF", "#74ACDF"], // h
  AT: ["#ED2939", "#FFFFFF", "#ED2939"], // h
  AU: ["#00247D"],
  AZ: ["#0092BC", "#E4002B", "#00AF66"], // h
  BA: ["#002F6C"],
  BD: ["#006A4E"],
  BE: ["#000000", "#FDDA24", "#EF3340"], // v
  BG: ["#FFFFFF", "#00966E", "#D62612"], // h
  BR: ["#009B3A"],
  BY: ["#CE1720", "#CE1720", "#4AA657"], // h
  CA: ["#FF0000", "#FFFFFF", "#FF0000"], // v
  CH: ["#FF0000"],
  CL: ["#FFFFFF", "#FFFFFF", "#D52B1E"], // h
  CN: ["#EE1C25"],
  CO: ["#FCD116", "#003893", "#CE1126"], // h
  CU: ["#002A8F", "#FFFFFF", "#002A8F"], // h
  CZ: ["#FFFFFF", "#FFFFFF", "#D7141A"], // h
  DE: ["#000000", "#DD0000", "#FFCE00"], // h
  DK: ["#C60C30"],
  EE: ["#0072CE", "#000000", "#FFFFFF"], // h
  EG: ["#CE1126", "#FFFFFF", "#000000"], // h
  ES: ["#AA151B", "#F1BF00", "#AA151B"], // h
  FI: ["#FFFFFF"],
  FR: ["#002395", "#FFFFFF", "#ED2939"], // v
  GB: ["#012169"],
  GE: ["#FFFFFF"],
  GR: ["#0D5EAF", "#FFFFFF", "#0D5EAF"], // h
  HK: ["#DE2910"],
  HR: ["#FF0000", "#FFFFFF", "#171796"], // h
  HU: ["#CE2939", "#FFFFFF", "#477050"], // h
  ID: ["#FF0000", "#FF0000", "#FFFFFF"], // h
  IE: ["#169B62", "#FFFFFF", "#FF883E"], // v
  IL: ["#FFFFFF", "#0038B8", "#FFFFFF"], // h
  IN: ["#FF9933", "#FFFFFF", "#138808"], // h
  IR: ["#239F40", "#FFFFFF", "#DA0000"], // h
  IS: ["#02529C"],
  IT: ["#008C45", "#F4F5F0", "#CD212A"], // v
  JM: ["#009B3A"],
  JP: ["#FFFFFF"],
  KE: ["#000000", "#BB0000", "#006600"], // h
  KR: ["#FFFFFF"],
  KZ: ["#00AFCA"],
  LK: ["#8D2029"],
  LT: ["#FDB913", "#006A44", "#C1272D"], // h
  LV: ["#9E3039", "#FFFFFF", "#9E3039"], // h
  MA: ["#C1272D"],
  MD: ["#0033A0", "#FFD200", "#CC092F"], // v
  ME: ["#C40308"],
  MK: ["#D20000"],
  MN: ["#C4272F", "#0066B3", "#C4272F"], // v
  MX: ["#006847", "#FFFFFF", "#CE1126"], // v
  MY: ["#CC0001"],
  NG: ["#008751", "#FFFFFF", "#008751"], // v
  NL: ["#AE1C28", "#FFFFFF", "#21468B"], // h
  NO: ["#BA0C2F"],
  NZ: ["#00247D"],
  PE: ["#D91023", "#FFFFFF", "#D91023"], // v
  PH: ["#0038A8", "#0038A8", "#CE1126"], // h
  PK: ["#01411C"],
  PL: ["#FFFFFF", "#FFFFFF", "#DC143C"], // h
  PT: ["#046A38", "#046A38", "#DA291C"], // v
  QA: ["#8A1538"],
  RO: ["#002B7F", "#FCD116", "#CE1126"], // v
  RS: ["#C6363C", "#0C4076", "#FFFFFF"], // h
  RU: ["#FFFFFF", "#0039A6", "#D52B1E"], // h
  SA: ["#165D31"],
  SE: ["#006AA7"],
  SG: ["#ED2939", "#ED2939", "#FFFFFF"], // h
  SI: ["#FFFFFF", "#005CE6", "#ED1C24"], // h
  SK: ["#FFFFFF", "#0B4EA2", "#EE1C25"], // h
  TH: ["#A51931", "#2D2A4A", "#A51931"], // h
  TR: ["#E30A17"],
  TW: ["#FE0000"],
  UA: ["#0057B7", "#0057B7", "#FFD700"], // h
  US: ["#B22234"],
  UY: ["#FFFFFF"],
  UZ: ["#0099B5", "#FFFFFF", "#1EB53A"], // h
  VE: ["#FFCC00", "#00247D", "#CF142B"], // h
  VN: ["#DA251D"],
  ZA: ["#007A4D"],
};

/** Countries whose bands run vertically rather than horizontally. */
const VERTICAL = new Set(["BE", "CA", "FR", "IE", "IT", "MD", "MN", "MX", "NG", "PE", "PT", "RO"]);

export function Flag({
  code,
  title,
  size = 14,
}: {
  code?: string | null;
  title?: string;
  size?: number;
}) {
  if (!code) return null;
  const bands = BANDS[code.toUpperCase()];
  if (!bands) return null;

  const w = size * 1.5;
  const h = size;
  const vertical = VERTICAL.has(code.toUpperCase());
  const n = bands.length;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={title ?? code}
      className="inline-block shrink-0 rounded-[2px] align-[-0.1em] ring-1 ring-inset ring-black/20"
    >
      <title>{title ?? code}</title>
      {bands.map((c, i) =>
        vertical ? (
          <rect key={i} x={(i * w) / n} width={w / n} height={h} fill={c} />
        ) : (
          <rect key={i} y={(i * h) / n} width={w} height={h / n} fill={c} />
        )
      )}
    </svg>
  );
}
