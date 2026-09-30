import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap", weight: ["500", "600"] });

export const metadata: Metadata = {
  title: "Reldro | Frontline safety operations",
  description:
    "Capture hazards and incidents quickly, coordinate the response, close corrective actions, and learn from recurring problems across sites.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body className="bg-ink-100 font-sans text-ink-900 antialiased">{children}</body>
    </html>
  );
}
