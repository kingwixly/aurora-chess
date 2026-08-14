import type { Config } from "tailwindcss";

/**
 * Aurora design tokens.
 *
 * The palette is sampled from the logo rather than invented: the ribbon's cyan
 * and violet, the piece's near-black navy, and the wordmark's indigo. Cyan and
 * violet are used as a *pair* — the aurora gradient is the brand, not a single
 * accent colour — which is also what keeps the two title tiers legible against
 * each other (federation titles amber, Aurora titles violet).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#05070E", // page background, darker than the logo's piece
          900: "#0A0F1C", // panel background — the logo's piece colour
          800: "#111a2e", // raised surface
          700: "#1b2740", // borders, dividers
          600: "#2a3a5c", // borders on raised surfaces, disabled states
          500: "#4d6289", // dimmest readable text
          400: "#8296b8", // secondary text -- the workhorse
          300: "#b6c4da", // emphasised secondary text
        },
        aurora: {
          cyan: "#18C0D8",
          teal: "#006090",
          violet: "#4830C0",
          indigo: "#183078",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        // The signature: the logo's ribbon, flattened into a line.
        aurora: "linear-gradient(90deg, #006090 0%, #18C0D8 35%, #4830C0 75%, #183078 100%)",
        "aurora-soft":
          "linear-gradient(135deg, rgba(24,192,216,0.14) 0%, rgba(72,48,192,0.14) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
