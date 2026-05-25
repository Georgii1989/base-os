import type { Metadata } from "next";
import "./globals.css";
import { Web3Providers } from "@/components/Web3Providers";

export const metadata: Metadata = {
  title: "Base OS · your onchain command center",
  description:
    "Personal briefing, swap & bridge, tips, score, guard, analytics, and radar — one system for Base.",
  metadataBase: new URL("https://app-base-os.vercel.app"),
  other: {
    "base:app_id": "69f884af879b4ae3fa1c7162",
    "talentapp:project_verification":
      "da0ef8352b7fecf2bf4250ef438e7afa212d828dd53b4fb95f3edd98392a3144f50e3187a658b62a3044d294edcd7f456aab8404c",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  );
}
