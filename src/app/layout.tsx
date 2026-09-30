import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter is the product typeface. Weights 400 to 700 are loaded as one variable font; everything else falls back through the stack in tailwind.config.ts.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Reldro | Frontline safety operations",
  description:
    "Capture hazards and incidents quickly, coordinate the response, close corrective actions, and learn from recurring problems across sites.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-ink-100 font-sans text-ink-900 antialiased">{children}</body>
    </html>
  );
}
