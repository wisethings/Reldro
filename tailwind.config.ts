import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2fb",
          100: "#dde4f6",
          200: "#b9c9ec",
          300: "#93a9e0",
          400: "#6785d1",
          500: "#4666c2",
          600: "#3552a8",
          700: "#2c4386",
          800: "#26386c",
          900: "#212f58",
          950: "#161e3a",
        },
        ink: {
          50: "#f7f8fa",
          100: "#eef0f3",
          200: "#dde1e7",
          300: "#c3c9d3",
          400: "#9aa3b2",
          500: "#767f91",
          600: "#5b6375",
          700: "#494f5f",
          800: "#2b2e37",
          900: "#1b1d24",
          950: "#101116",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
