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
        pine: "#1F3A2E",
        stone: "#BFB5A3",
        danger: "#A33828",
        surface: { DEFAULT: "#F7F4EC", raised: "#FFFFFF", sunken: "#E6E1D3", inverse: "#2A0A0C" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["var(--font-inter-tight)", "var(--font-inter)", "-apple-system", "sans-serif"],
        wordmark: ["var(--font-parkinsans)", "var(--font-inter)", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      borderRadius: {
        none: "0px",
        sm: "5px",
        DEFAULT: "5px",
        md: "5px",
        lg: "5px",
        xl: "5px",
        "2xl": "5px",
        "3xl": "5px",
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
