import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import NavBar from "./components/NavBar";
import { Manrope } from "next/font/google";

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
        <main className="page">{children}</main>
      </body>
    </html>
  );
}