import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import NavBar from "./components/NavBar";
import { Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "FL Studio Beat Battles",
  description: "10-minute sample-based music battles",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <NavBar />
        <div className="w-full border-b border-orange-400/40 bg-orange-500/10 px-4 py-2 text-center text-sm font-semibold text-orange-300">
    🚧 In Beta — FL Battles is still in development. Bugs and changes are expected.
  </div>
        <main className="page">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}