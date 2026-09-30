import type { Config } from "tailwindcss";

// Reldro UI Kit tokens — six-colour palette (oxblood, orchid, sage, bone,
// coral, olive) plus pine (from Sierra). See the Reldro design-system
// artifact for the full brand book. `ink` and `brand` keep their old
// 50-950 numeric scale so every existing `text-ink-500` / `bg-brand-700`
// class site-wide picks up the new palette without per-file edits; the
// named tokens (orchid, coral, sage, olive, pine, stone, surface, etc.)
// are for new code.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ink: warm neutral ramp anchored on oxblood (kit's "ink") and
        // ink-muted; 50-400 are surface/border stops, 500-950 are text.
        ink: {
          50: "#F7F4EC",
          100: "#EFEBE0",
          200: "#DCD5C6",
          300: "#8C7F6C",
          400: "#7A6A65",
          500: "#6B5A55",
          600: "#56403D",
          700: "#402525",
          800: "#341617",
          900: "#2A0A0C",
          950: "#1A0708",
          muted: "#6B5A55",
          subtle: "#7A6A65",
          inverse: "#EFEBE0",
        },
        // brand: primary CTA (700/800 = oxblood, matches action-primary)
        // and selection/highlight/focus tints (50-600 = orchid family).
        brand: {
          DEFAULT: "#2A0A0C",
          50: "#F3DDEE",
          100: "#F3DDEE",
          200: "#E5B9DD",
          300: "#D896CC",
          400: "#B87CAD",
          500: "#8A4A7E",
          600: "#8A4A7E",
          700: "#2A0A0C",
          800: "#45181B",
          900: "#2A0A0C",
        },
        oxblood: "#2A0A0C",
        bone: "#EFEBE0",
        orchid: { DEFAULT: "#D896CC", soft: "#F3DDEE", deep: "#8A4A7E" },
        coral: { DEFAULT: "#E8827A", soft: "#FADAD5" },
        sage: { DEFAULT: "#E4EDD3", deep: "#3D5A3A" },
        olive: { DEFAULT: "#755F2F", soft: "#EDE3C9" },
        // Alert and icon hues. Each means one thing so two neighbouring badges never look alike:
        // coral/danger = urgent, amber = serious or overdue, gold = moderate or expiring, sky = new or informational,
        // teal = in progress or prevention, indigo = corrective work, orchid = review, sage = done.
        amber: { soft: "#FBE0BF", deep: "#8F4A0A" },
        gold: { soft: "#F6EBB4", deep: "#665300" },
        sky: { soft: "#DCE8F5", deep: "#2A5A8C" },
        teal: { soft: "#D2EBE7", deep: "#1B615C" },
        indigo: { soft: "#E1E3F7", deep: "#3D479A" },
        pine: "#1F3A2E",
        stone: "#BFB5A3",
        danger: "#A33828",
        surface: { DEFAULT: "#F7F4EC", raised: "#FFFFFF", sunken: "#E6E1D3", inverse: "#2A0A0C", muted: "#F7F6F3", hover: "#E8E8E4" },
      },
      // One typeface for the whole product. Inter first, with the standard system fallbacks after it.
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Open Sans", "Helvetica Neue", "sans-serif"],
      },
      borderRadius: {
        none: "0px",
        // Slightly softer than the original 5px so panels, tables and inputs read as calm and
        // modern; pills (`full`) and the palette are unchanged.
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "10px",
        "2xl": "14px",
        "3xl": "18px",
        // `full` is left at Tailwind's default (9999px) so pills — buttons,
        // badges, chips, avatars — stay pill-shaped and are unaffected.
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(42 10 12 / 0.06), 0 1px 3px 0 rgb(42 10 12 / 0.05)",
        DEFAULT: "0 1px 2px 0 rgb(42 10 12 / 0.06)",
        md: "0 4px 16px rgb(42 10 12 / 0.08), 0 1px 2px rgb(42 10 12 / 0.05)",
        lg: "0 24px 48px rgb(42 10 12 / 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
