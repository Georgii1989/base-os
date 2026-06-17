import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { Web3Providers } from "@/components/Web3Providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["500"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Base OS · your onchain command center",
  description:
    "Personal briefing, swap & bridge, tips, score, guard, analytics, and radar — one system for Base.",
  metadataBase: new URL("https://app-base-os.vercel.app"),
  other: {
    "base:app_id": "69f884af879b4ae3fa1c7162",
    "talentapp:project_verification":
      "da0ef8352b7fecf2bf4250ef438e7afa212d828dd53b4fb95f3edd98392a3144f50e3187a658b62a3044d294edcd7f456aab8404c8cc6c26b61757385957ec78",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)] text-[var(--color-ash)]">
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  );
}
