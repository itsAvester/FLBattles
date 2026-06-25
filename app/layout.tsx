import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import NavBar from "./components/NavBar";
import SiteFooter from "./components/SiteFooter";
import { Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import RegisteredProducerCount from "./components/RegisteredProducerCount";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://flbattles.com"),
  applicationName: "FLBattles",
  title: {
    default: "FLBattles | Online Beat Battles for Music Producers",
    template: "%s | FLBattles",
  },
  description:
    "Join online beat battles, host custom producer battles, flip samples, vote on beats, and climb the FLBattles leaderboard.",
  keywords: [
    "beat battles",
    "beat battle",
    "online beat battles",
    "producer beat battles",
    "music producer battles",
    "ranked beat battles",
    "custom beat battles",
    "sample-based beat battles",
    "FL Studio beat battles",
    "FLBattles",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "FLBattles | Online Beat Battles for Music Producers",
    description:
      "Compete in ranked beat battles, host private custom lobbies, flip samples, vote on producers, and climb the leaderboard.",
    url: "https://flbattles.com",
    siteName: "FLBattles",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FLBattles | Online Beat Battles for Music Producers",
    description:
      "Join ranked beat battles, host custom producer battles, flip samples, vote, and climb the leaderboard.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <NavBar />

        <div className="beta-banner">
          <span className="beta-pill">LIVE BETA</span>
          <span>
            Host a private beat battle in seconds · Invite friends with a lobby
            link · <RegisteredProducerCount suffix="+ producers joined" />
          </span>
        </div>

        <main className="page">{children}</main>

        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}