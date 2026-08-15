"use client";

/**
 * Country flags, drawn as SVG.
 *
 * Emoji flags are regional-indicator pairs and **Windows has no glyphs for
 * them** — it renders the two letters instead, so "US" and "GB" showed as text
 * while every other platform showed a flag. No font fixes that.
 *
 * The first version of this only understood horizontal and vertical bands, so
 * anything with a canton, a cross, a disc or a triangle came out as a solid
 * rectangle. The United States as a plain red block is not a simplification,
 * it is wrong. Each flag is now an explicit list of shapes.
 *
 * Still simplified — no crests, no stars picked out individually, no Arabic
 * script — because these render at 14px beside a username where that detail is
 * invisible. Recognisable at a glance is the whole requirement.
 */

const FLAG_SHAPES: Record<string, string> = {
  AE: '<rect width="24" height="16" fill="#FFFFFF"/><rect width="24" height="5.33" fill="#00732F"/><rect y="10.67" width="24" height="5.33" fill="#000000"/><rect width="6.00" height="16" fill="#FF0000"/>',
  AM: '<rect y="0.00" width="24" height="5.33" fill="#D90012"/><rect y="5.33" width="24" height="5.33" fill="#0033A0"/><rect y="10.67" width="24" height="5.33" fill="#F2A800"/>',
  AR: '<rect y="0.00" width="24" height="5.33" fill="#74ACDF"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#74ACDF"/>',
  AT: '<rect y="0.00" width="24" height="5.33" fill="#ED2939"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#ED2939"/>',
  AU: '<rect width="24" height="16" fill="#00247D"/><rect width="12.00" height="8.00" fill="#012169"/><path d="M0,0 L12,8 M12,0 L0,8" stroke="#FFFFFF" stroke-width="1.6"/><rect y="3.2" width="12" height="1.6" fill="#FFFFFF"/><rect x="5.2" width="1.6" height="8" fill="#FFFFFF"/><circle cx="17" cy="11" r="1.2" fill="#FFFFFF"/>',
  AZ: '<rect y="0.00" width="24" height="5.33" fill="#0092BC"/><rect y="5.33" width="24" height="5.33" fill="#E4002B"/><rect y="10.67" width="24" height="5.33" fill="#00AF66"/>',
  BD: '<rect width="24" height="16" fill="#006A4E"/><circle cx="10.5" cy="8.0" r="4.2" fill="#F42A41"/>',
  BE: '<rect x="0.00" width="8.00" height="16" fill="#000000"/><rect x="8.00" width="8.00" height="16" fill="#FDDA24"/><rect x="16.00" width="8.00" height="16" fill="#EF3340"/>',
  BG: '<rect y="0.00" width="24" height="5.33" fill="#FFFFFF"/><rect y="5.33" width="24" height="5.33" fill="#00966E"/><rect y="10.67" width="24" height="5.33" fill="#D62612"/>',
  BR: '<rect width="24" height="16" fill="#009B3A"/><path d="M12.0,2 L21.5,8.0 L12.0,14 L2.5,8.0 Z" fill="#FEDF00"/><circle cx="12.0" cy="8.0" r="2.6" fill="#002776"/>',
  CA: '<rect x="0.00" width="8.00" height="16" fill="#FF0000"/><rect x="8.00" width="8.00" height="16" fill="#FFFFFF"/><rect x="16.00" width="8.00" height="16" fill="#FF0000"/>',
  CH: '<rect width="24" height="16" fill="#FF0000"/><rect x="10.4" y="3.6" width="3.2" height="8.8" fill="#FFFFFF"/><rect x="7.6" y="6.4" width="8.8" height="3.2" fill="#FFFFFF"/>',
  CL: '<rect y="0.00" width="24" height="5.33" fill="#FFFFFF"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#D52B1E"/>',
  CN: '<rect width="24" height="16" fill="#EE1C25"/><circle cx="5" cy="5" r="2.2" fill="#FFDE00"/><circle cx="9.5" cy="2.6" r="0.8" fill="#FFDE00"/><circle cx="11" cy="5" r="0.8" fill="#FFDE00"/><circle cx="9.5" cy="7.4" r="0.8" fill="#FFDE00"/>',
  CO: '<rect y="0.00" width="24" height="4.00" fill="#FCD116"/><rect y="4.00" width="24" height="4.00" fill="#FCD116"/><rect y="8.00" width="24" height="4.00" fill="#003893"/><rect y="12.00" width="24" height="4.00" fill="#CE1126"/>',
  CU: '<rect width="24" height="16" fill="#FFFFFF"/><rect y="0.00" width="24" height="3.20" fill="#002A8F"/><rect y="6.40" width="24" height="3.20" fill="#002A8F"/><rect y="12.80" width="24" height="3.20" fill="#002A8F"/><path d="M0,0 L10.08,8.0 L0,16 Z" fill="#CF142B"/>',
  CZ: '<rect width="24" height="8.0" fill="#FFFFFF"/><rect y="8.0" width="24" height="8.0" fill="#D7141A"/><path d="M0,0 L10.80,8.0 L0,16 Z" fill="#11457E"/>',
  DE: '<rect y="0.00" width="24" height="5.33" fill="#000000"/><rect y="5.33" width="24" height="5.33" fill="#DD0000"/><rect y="10.67" width="24" height="5.33" fill="#FFCE00"/>',
  DK: '<rect width="24" height="16" fill="#C60C30"/><rect x="7" width="3" height="16" fill="#FFFFFF"/><rect y="6.5" width="24" height="3" fill="#FFFFFF"/>',
  EE: '<rect y="0.00" width="24" height="5.33" fill="#0072CE"/><rect y="5.33" width="24" height="5.33" fill="#000000"/><rect y="10.67" width="24" height="5.33" fill="#FFFFFF"/>',
  EG: '<rect y="0.00" width="24" height="5.33" fill="#CE1126"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#000000"/>',
  ES: '<rect y="0.00" width="24" height="4.00" fill="#AA151B"/><rect y="4.00" width="24" height="4.00" fill="#F1BF00"/><rect y="8.00" width="24" height="4.00" fill="#F1BF00"/><rect y="12.00" width="24" height="4.00" fill="#AA151B"/>',
  FI: '<rect width="24" height="16" fill="#FFFFFF"/><rect x="7" width="3" height="16" fill="#003580"/><rect y="6.5" width="24" height="3" fill="#003580"/>',
  FR: '<rect x="0.00" width="8.00" height="16" fill="#002395"/><rect x="8.00" width="8.00" height="16" fill="#FFFFFF"/><rect x="16.00" width="8.00" height="16" fill="#ED2939"/>',
  GB: '<rect width="24" height="16" fill="#012169"/><path d="M0,0 L24,16 M24,0 L0,16" stroke="#FFFFFF" stroke-width="3.2"/><path d="M0,0 L24,16 M24,0 L0,16" stroke="#C8102E" stroke-width="1.8"/><rect y="5.6" width="24" height="4.8" fill="#FFFFFF"/><rect x="9.6" width="4.8" height="16" fill="#FFFFFF"/><rect y="6.6" width="24" height="2.8" fill="#C8102E"/><rect x="10.6" width="2.8" height="16" fill="#C8102E"/>',
  GE: '<rect width="24" height="16" fill="#FFFFFF"/><rect x="9.6" width="4.8" height="16" fill="#FF0000"/><rect y="5.6" width="24" height="4.8" fill="#FF0000"/>',
  GR: '<rect width="24" height="16" fill="#FFFFFF"/><rect y="0.00" width="24" height="1.78" fill="#0D5EAF"/><rect y="3.56" width="24" height="1.78" fill="#0D5EAF"/><rect y="7.11" width="24" height="1.78" fill="#0D5EAF"/><rect y="10.67" width="24" height="1.78" fill="#0D5EAF"/><rect y="14.22" width="24" height="1.78" fill="#0D5EAF"/><rect width="8.96" height="8.96" fill="#0D5EAF"/><rect x="3.2" width="2.4" height="8.96" fill="#FFFFFF"/><rect y="3.2" width="8.96" height="2.4" fill="#FFFFFF"/>',
  GT: '<rect x="0.00" width="8.00" height="16" fill="#4997D0"/><rect x="8.00" width="8.00" height="16" fill="#FFFFFF"/><rect x="16.00" width="8.00" height="16" fill="#4997D0"/>',
  HK: '<rect width="24" height="16" fill="#DE2910"/><circle cx="12.0" cy="8.0" r="3.2" fill="#FFFFFF"/>',
  HR: '<rect y="0.00" width="24" height="5.33" fill="#FF0000"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#171796"/>',
  HU: '<rect y="0.00" width="24" height="5.33" fill="#CE2939"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#477050"/>',
  ID: '<rect y="0.00" width="24" height="8.00" fill="#FF0000"/><rect y="8.00" width="24" height="8.00" fill="#FFFFFF"/>',
  IE: '<rect x="0.00" width="8.00" height="16" fill="#169B62"/><rect x="8.00" width="8.00" height="16" fill="#FFFFFF"/><rect x="16.00" width="8.00" height="16" fill="#FF883E"/>',
  IL: '<rect y="0.00" width="24" height="5.33" fill="#FFFFFF"/><rect y="5.33" width="24" height="5.33" fill="#0038B8"/><rect y="10.67" width="24" height="5.33" fill="#FFFFFF"/>',
  IN: '<rect y="0.00" width="24" height="5.33" fill="#FF9933"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#138808"/>',
  IR: '<rect y="0.00" width="24" height="5.33" fill="#239F40"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#DA0000"/>',
  IS: '<rect width="24" height="16" fill="#02529C"/><rect x="7" width="3" height="16" fill="#FFFFFF"/><rect y="6.5" width="24" height="3" fill="#FFFFFF"/><rect x="7.8" width="1.4" height="16" fill="#DC1E35"/><rect y="7.3" width="24" height="1.4" fill="#DC1E35"/>',
  IT: '<rect x="0.00" width="8.00" height="16" fill="#008C45"/><rect x="8.00" width="8.00" height="16" fill="#F4F5F0"/><rect x="16.00" width="8.00" height="16" fill="#CD212A"/>',
  JM: '<rect width="24" height="16" fill="#009B3A"/><path d="M0,0 L24,16 M24,0 L0,16" stroke="#FED100" stroke-width="2.4"/><path d="M0,0 L12.0,8.0 L0,16 Z" fill="#000000"/><path d="M24,0 L12.0,8.0 L24,16 Z" fill="#000000"/>',
  JP: '<rect width="24" height="16" fill="#FFFFFF"/><circle cx="12.0" cy="8.0" r="4.0" fill="#BC002D"/>',
  KR: '<rect width="24" height="16" fill="#FFFFFF"/><path d="M8.6,8.0 a3.4,3.4 0 0,1 6.8,0 Z" fill="#CD2E3A"/><path d="M8.6,8.0 a3.4,3.4 0 0,0 6.8,0 Z" fill="#0047A0"/>',
  KZ: '<rect width="24" height="16" fill="#00AFCA"/><circle cx="12.0" cy="7.5" r="2.6" fill="#FEC50C"/>',
  LR: '<rect width="24" height="16" fill="#FFFFFF"/><rect y="0.00" width="24" height="1.45" fill="#BF0A30"/><rect y="2.91" width="24" height="1.45" fill="#BF0A30"/><rect y="5.82" width="24" height="1.45" fill="#BF0A30"/><rect y="8.73" width="24" height="1.45" fill="#BF0A30"/><rect y="11.64" width="24" height="1.45" fill="#BF0A30"/><rect y="14.55" width="24" height="1.45" fill="#BF0A30"/><rect width="10.08" height="8.72" fill="#002868"/>',
  LT: '<rect y="0.00" width="24" height="5.33" fill="#FDB913"/><rect y="5.33" width="24" height="5.33" fill="#006A44"/><rect y="10.67" width="24" height="5.33" fill="#C1272D"/>',
  LU: '<rect y="0.00" width="24" height="5.33" fill="#ED2939"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#00A1DE"/>',
  LV: '<rect y="0.00" width="24" height="5.33" fill="#9E3039"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#9E3039"/>',
  MA: '<rect width="24" height="16" fill="#C1272D"/><circle cx="12.0" cy="8.0" r="3" fill="none" stroke="#006233" stroke-width="1"/>',
  MD: '<rect x="0.00" width="8.00" height="16" fill="#0033A0"/><rect x="8.00" width="8.00" height="16" fill="#FFD200"/><rect x="16.00" width="8.00" height="16" fill="#CC092F"/>',
  MN: '<rect x="0.00" width="8.00" height="16" fill="#C4272F"/><rect x="8.00" width="8.00" height="16" fill="#0066B3"/><rect x="16.00" width="8.00" height="16" fill="#C4272F"/>',
  MX: '<rect x="0.00" width="8.00" height="16" fill="#006847"/><rect x="8.00" width="8.00" height="16" fill="#FFFFFF"/><rect x="16.00" width="8.00" height="16" fill="#CE1126"/>',
  MY: '<rect width="24" height="16" fill="#FFFFFF"/><rect y="0.00" width="24" height="1.14" fill="#CC0001"/><rect y="2.29" width="24" height="1.14" fill="#CC0001"/><rect y="4.57" width="24" height="1.14" fill="#CC0001"/><rect y="6.86" width="24" height="1.14" fill="#CC0001"/><rect y="9.14" width="24" height="1.14" fill="#CC0001"/><rect y="11.43" width="24" height="1.14" fill="#CC0001"/><rect y="13.71" width="24" height="1.14" fill="#CC0001"/><rect width="12.00" height="8.00" fill="#010066"/>',
  NG: '<rect x="0.00" width="8.00" height="16" fill="#008751"/><rect x="8.00" width="8.00" height="16" fill="#FFFFFF"/><rect x="16.00" width="8.00" height="16" fill="#008751"/>',
  NI: '<rect y="0.00" width="24" height="5.33" fill="#0067C6"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#0067C6"/>',
  NL: '<rect y="0.00" width="24" height="5.33" fill="#AE1C28"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#21468B"/>',
  NO: '<rect width="24" height="16" fill="#BA0C2F"/><rect x="7" width="3" height="16" fill="#FFFFFF"/><rect y="6.5" width="24" height="3" fill="#FFFFFF"/><rect x="7.8" width="1.4" height="16" fill="#00205B"/><rect y="7.3" width="24" height="1.4" fill="#00205B"/>',
  NZ: '<rect width="24" height="16" fill="#00247D"/><rect width="12.00" height="8.00" fill="#012169"/><path d="M0,0 L12,8 M12,0 L0,8" stroke="#FFFFFF" stroke-width="1.6"/><rect y="3.2" width="12" height="1.6" fill="#FFFFFF"/><rect x="5.2" width="1.6" height="8" fill="#FFFFFF"/><circle cx="17" cy="6" r="1" fill="#C8102E"/><circle cx="19" cy="11" r="1" fill="#C8102E"/>',
  PE: '<rect x="0.00" width="8.00" height="16" fill="#D91023"/><rect x="8.00" width="8.00" height="16" fill="#FFFFFF"/><rect x="16.00" width="8.00" height="16" fill="#D91023"/>',
  PH: '<rect width="24" height="8.0" fill="#0038A8"/><rect y="8.0" width="24" height="8.0" fill="#CE1126"/><path d="M0,0 L10.80,8.0 L0,16 Z" fill="#FFFFFF"/>',
  PK: '<rect width="24" height="16" fill="#01411C"/><rect width="6.00" height="16" fill="#FFFFFF"/><circle cx="15" cy="8" r="3" fill="#FFFFFF"/><circle cx="16.2" cy="8" r="2.4" fill="#01411C"/>',
  PL: '<rect y="0.00" width="24" height="8.00" fill="#FFFFFF"/><rect y="8.00" width="24" height="8.00" fill="#DC143C"/>',
  PT: '<rect width="24" height="16" fill="#DA291C"/><rect width="9.60" height="16" fill="#046A38"/><circle cx="9.60" cy="8.0" r="2.6" fill="#FFE900"/>',
  PW: '<rect width="24" height="16" fill="#4AADD6"/><circle cx="10" cy="8.0" r="4.2" fill="#FFDE00"/>',
  RO: '<rect x="0.00" width="8.00" height="16" fill="#002B7F"/><rect x="8.00" width="8.00" height="16" fill="#FCD116"/><rect x="16.00" width="8.00" height="16" fill="#CE1126"/>',
  RS: '<rect y="0.00" width="24" height="5.33" fill="#C6363C"/><rect y="5.33" width="24" height="5.33" fill="#0C4076"/><rect y="10.67" width="24" height="5.33" fill="#FFFFFF"/>',
  RU: '<rect y="0.00" width="24" height="5.33" fill="#FFFFFF"/><rect y="5.33" width="24" height="5.33" fill="#0039A6"/><rect y="10.67" width="24" height="5.33" fill="#D52B1E"/>',
  SA: '<rect width="24" height="16" fill="#165D31"/><rect x="4" y="10" width="16" height="1.2" fill="#FFFFFF"/><rect x="4" y="5" width="16" height="1.6" fill="#FFFFFF"/>',
  SE: '<rect width="24" height="16" fill="#006AA7"/><rect x="7" width="3" height="16" fill="#FECC00"/><rect y="6.5" width="24" height="3" fill="#FECC00"/>',
  SG: '<rect width="24" height="16" fill="#FFFFFF"/><rect width="24" height="8.0" fill="#ED2939"/><circle cx="5" cy="4" r="2.4" fill="#FFFFFF"/><circle cx="6.4" cy="4" r="2.2" fill="#ED2939"/>',
  SI: '<rect y="0.00" width="24" height="5.33" fill="#FFFFFF"/><rect y="5.33" width="24" height="5.33" fill="#005CE6"/><rect y="10.67" width="24" height="5.33" fill="#ED1C24"/>',
  SK: '<rect y="0.00" width="24" height="5.33" fill="#FFFFFF"/><rect y="5.33" width="24" height="5.33" fill="#0B4EA2"/><rect y="10.67" width="24" height="5.33" fill="#EE1C25"/>',
  SY: '<rect y="0.00" width="24" height="5.33" fill="#CE1126"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#000000"/>',
  TH: '<rect y="0.00" width="24" height="3.20" fill="#A51931"/><rect y="3.20" width="24" height="3.20" fill="#F4F5F8"/><rect y="6.40" width="24" height="3.20" fill="#2D2A4A"/><rect y="9.60" width="24" height="3.20" fill="#F4F5F8"/><rect y="12.80" width="24" height="3.20" fill="#A51931"/>',
  TR: '<rect width="24" height="16" fill="#E30A17"/><circle cx="9" cy="8" r="3.4" fill="#FFFFFF"/><circle cx="10.3" cy="8" r="2.7" fill="#E30A17"/>',
  TW: '<rect width="24" height="16" fill="#FE0000"/><rect width="12.00" height="8.00" fill="#000095"/><circle cx="6" cy="4" r="1.8" fill="#FFFFFF"/>',
  UA: '<rect y="0.00" width="24" height="8.00" fill="#0057B7"/><rect y="8.00" width="24" height="8.00" fill="#FFD700"/>',
  US: '<rect width="24" height="16" fill="#FFFFFF"/><rect y="0.00" width="24" height="1.23" fill="#B22234"/><rect y="2.46" width="24" height="1.23" fill="#B22234"/><rect y="4.92" width="24" height="1.23" fill="#B22234"/><rect y="7.38" width="24" height="1.23" fill="#B22234"/><rect y="9.85" width="24" height="1.23" fill="#B22234"/><rect y="12.31" width="24" height="1.23" fill="#B22234"/><rect y="14.77" width="24" height="1.23" fill="#B22234"/><rect width="10.08" height="8.61" fill="#3C3B6E"/>',
  UY: '<rect width="24" height="16" fill="#FFFFFF"/><rect y="1.78" width="24" height="1.78" fill="#0038A8"/><rect y="5.33" width="24" height="1.78" fill="#0038A8"/><rect y="8.89" width="24" height="1.78" fill="#0038A8"/><rect y="12.44" width="24" height="1.78" fill="#0038A8"/><rect width="10.08" height="8.88" fill="#FFFFFF"/><circle cx="5" cy="4.4" r="2" fill="#FCD116"/>',
  VN: '<rect width="24" height="16" fill="#DA251D"/><circle cx="12.0" cy="8.0" r="2.8" fill="#FFFF00"/>',
  YE: '<rect y="0.00" width="24" height="5.33" fill="#CE1126"/><rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/><rect y="10.67" width="24" height="5.33" fill="#000000"/>',
  ZA: '<rect width="24" height="16" fill="#002395"/><rect width="24" height="8.0" fill="#DE3831"/><path d="M0,0 L10.80,8.0 L0,16 Z" fill="#007A4D"/><rect y="6.4" width="24" height="3.2" fill="#FFB612"/>',
};

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
  const shapes = FLAG_SHAPES[code.toUpperCase()];
  if (!shapes) return null;

  return (
    <svg
      width={size * 1.5}
      height={size}
      viewBox="0 0 24 16"
      role="img"
      aria-label={title ?? code}
      className="inline-block shrink-0 rounded-[2px] align-[-0.1em] ring-1 ring-inset ring-black/25"
      dangerouslySetInnerHTML={{
        // The shapes are a compile-time constant in this file, never user
        // input, so there is nothing here to inject.
        __html: `<title>${title ?? code}</title>${shapes}`,
      }}
    />
  );
}

/** Every country with a flag, so the picker cannot offer one that will not render. */
export const FLAG_COUNTRIES: { code: string; name: string }[] = [
  { code: "AE", name: "United Arab Emirates" },
  { code: "AM", name: "Armenia" },
  { code: "AR", name: "Argentina" },
  { code: "AT", name: "Austria" },
  { code: "AU", name: "Australia" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CH", name: "Switzerland" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CU", name: "Cuba" },
  { code: "CZ", name: "Czechia" },
  { code: "DE", name: "Germany" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "EG", name: "Egypt" },
  { code: "ES", name: "Spain" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "GE", name: "Georgia" },
  { code: "GR", name: "Greece" },
  { code: "GT", name: "Guatemala" },
  { code: "HK", name: "Hong Kong" },
  { code: "HR", name: "Croatia" },
  { code: "HU", name: "Hungary" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IN", name: "India" },
  { code: "IR", name: "Iran" },
  { code: "IS", name: "Iceland" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "LR", name: "Liberia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "LV", name: "Latvia" },
  { code: "MA", name: "Morocco" },
  { code: "MD", name: "Moldova" },
  { code: "MN", name: "Mongolia" },
  { code: "MX", name: "Mexico" },
  { code: "MY", name: "Malaysia" },
  { code: "NG", name: "Nigeria" },
  { code: "NI", name: "Nicaragua" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "NZ", name: "New Zealand" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PK", name: "Pakistan" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "PW", name: "Palau" },
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
  { code: "TR", name: "T\u00fcrkiye" },
  { code: "TW", name: "Taiwan" },
  { code: "UA", name: "Ukraine" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZA", name: "South Africa" },
];
