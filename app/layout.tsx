import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import NavBar from "./components/NavBar";

export const metadata: Metadata = {
  title: "FL Studio Beat Battles",
  description: "10-minute sample-based music battles",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
