"use client";

/**
 * Country flags, from a responsive sprite.
 *
 * Emoji flags have no glyphs on Windows — they render as the two letters — so
 * they cannot be used. An earlier version drew flags as SVG band
 * constructions, which was fine for tricolours and wrong for anything with a
 * canton, cross or crest.
 *
 * This uses SlavkoPekaric's responsive flag sprite: a single-column strip
 * positioned by percentage, so one sheet scales to any size without a separate
 * asset per resolution. Rounded corners come with the artwork.
 *
 * Sprite and source notes live in /public/flags.
 */

/** Vertical background-position, as a percentage of the strip. */
const SPRITE: Record<string, number> = {
  AE: 0.826446,
  AM: 2.892562,
  AR: 4.545455,
  AT: 5.371901,
  AU: 5.785124,
  AZ: 6.61157,
  BA: 7.024793,
  BD: 7.85124,
  BE: 8.264463,
  BG: 9.090909,
  BR: 11.983471,
  BY: 14.049587,
  CA: 14.876033,
  CH: 16.942149,
  CL: 18.181818,
  CN: 19.008264,
  CO: 19.421488,
  CU: 20.247934,
  CZ: 21.900826,
  DE: 22.31405,
  DK: 23.140496,
  DZ: 24.380165,
  EC: 24.793388,
  EE: 25.206612,
  EG: 25.619835,
  ES: 26.859504,
  ET: 27.272727,
  FI: 27.68595,
  FR: 29.752066,
  GB: 92.561983,
  GE: 30.991736,
  GH: 31.818182,
  GR: 34.710744,
  GT: 35.53719,
  HK: 37.190083,
  HR: 38.429752,
  HU: 39.256198,
  ID: 39.669421,
  IE: 40.082645,
  IL: 40.495868,
  IN: 40.909091,
  IQ: 41.735537,
  IR: 42.14876,
  IS: 42.561983,
  IT: 42.975207,
  JM: 43.38843,
  JO: 43.801653,
  JP: 44.214876,
  KE: 44.628099,
  KG: 45.041322,
  KR: 47.520661,
  KZ: 48.760331,
  LB: 49.586777,
  LK: 50.826446,
  LT: 52.066116,
  LU: 52.479339,
  LV: 52.892562,
  MA: 53.719008,
  MD: 54.545455,
  ME: 54.958678,
  MK: 56.198347,
  MN: 57.438017,
  MX: 61.570248,
  MY: 61.983471,
  NG: 64.46281,
  NL: 65.289256,
  NO: 65.702479,
  NP: 66.115702,
  NZ: 67.355372,
  PE: 68.595041,
  PH: 69.834711,
  PK: 70.247934,
  PL: 70.661157,
  PR: 71.900826,
  PT: 72.31405,
  PY: 73.140496,
  QA: 73.553719,
  RO: 74.380165,
  RS: 74.793388,
  RU: 75.206612,
  SA: 76.033058,
  SE: 77.68595,
  SG: 78.099174,
  SI: 78.92562,
  SK: 79.752066,
  SY: 83.471074,
  TH: 85.950413,
  TN: 88.016529,
  TR: 89.256198,
  TW: 90.495868,
  UA: 91.735537,
  US: 93.38843,
  UY: 93.801653,
  UZ: 94.214876,
  VE: 95.454545,
  VN: 96.694215,
  ZA: 98.760331,
  ZM: 99.173554,
  ZW: 100.0,
};

/** The artwork's own aspect ratio — 44x30 per cell. */
const RATIO = 44 / 30;

export function Flag({
  code,
  title,
  size = 14,
}: {
  code?: string | null;
  /** Accessible label; falls back to the country code. */
  title?: string;
  /** Height in pixels. Width follows the flag's aspect ratio. */
  size?: number;
}) {
  if (!code) return null;
  const y = SPRITE[code.toUpperCase()];
  if (y === undefined) return null;

  return (
    <span
      role="img"
      aria-label={title ?? code}
      title={title ?? code}
      className="inline-block shrink-0 align-[-0.15em]"
      style={{
        width: Math.round(size * RATIO),
        height: size,
        backgroundImage: "url(/flags/flags.png)",
        // Percentage positioning is what makes one strip work at every size:
        // the browser scales the whole sheet, so no per-size asset is needed.
        backgroundPosition: `0 ${y}%`,
        backgroundSize: "100% auto",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

/** Countries with artwork, so the picker cannot offer one that will not render. */
export const FLAG_COUNTRIES: { code: string; name: string }[] = [
  { code: "AE", name: "United Arab Emirates" },
  { code: "AM", name: "Armenia" },
  { code: "AR", name: "Argentina" },
  { code: "AT", name: "Austria" },
  { code: "AU", name: "Australia" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "BR", name: "Brazil" },
  { code: "BY", name: "Belarus" },
  { code: "CA", name: "Canada" },
  { code: "CH", name: "Switzerland" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CU", name: "Cuba" },
  { code: "CZ", name: "Czechia" },
  { code: "DE", name: "Germany" },
  { code: "DK", name: "Denmark" },
  { code: "DZ", name: "Algeria" },
  { code: "EC", name: "Ecuador" },
  { code: "EE", name: "Estonia" },
  { code: "EG", name: "Egypt" },
  { code: "ES", name: "Spain" },
  { code: "ET", name: "Ethiopia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "GE", name: "Georgia" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GT", name: "Guatemala" },
  { code: "HK", name: "Hong Kong" },
  { code: "HR", name: "Croatia" },
  { code: "HU", name: "Hungary" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IN", name: "India" },
  { code: "IQ", name: "Iraq" },
  { code: "IR", name: "Iran" },
  { code: "IS", name: "Iceland" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JO", name: "Jordan" },
  { code: "JP", name: "Japan" },
  { code: "KE", name: "Kenya" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "KR", name: "South Korea" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "LB", name: "Lebanon" },
  { code: "LK", name: "Sri Lanka" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "LV", name: "Latvia" },
  { code: "MA", name: "Morocco" },
  { code: "MD", name: "Moldova" },
  { code: "ME", name: "Montenegro" },
  { code: "MK", name: "North Macedonia" },
  { code: "MN", name: "Mongolia" },
  { code: "MX", name: "Mexico" },
  { code: "MY", name: "Malaysia" },
  { code: "NG", name: "Nigeria" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "NP", name: "Nepal" },
  { code: "NZ", name: "New Zealand" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PK", name: "Pakistan" },
  { code: "PL", name: "Poland" },
  { code: "PR", name: "Puerto Rico" },
  { code: "PT", name: "Portugal" },
  { code: "PY", name: "Paraguay" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RS", name: "Serbia" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SE", name: "Sweden" },
  { code: "SG", name: "Singapore" },
  { code: "SI", name: "Slovenia" },
  { code: "SK", name: "Slovakia" },
  { code: "SY", name: "Syria" },
  { code: "TH", name: "Thailand" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Türkiye" },
  { code: "TW", name: "Taiwan" },
  { code: "UA", name: "Ukraine" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "ZA", name: "South Africa" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];
