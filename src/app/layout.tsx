import type { Metadata } from "next";
import "./globals.css";
import { Web3Providers } from "@/components/Web3Providers";

export const metadata: Metadata = {
  title: "Base OS · tips, apps & safety",
  description: "Tips, curated Base apps, tracked wallets, and simple safety tools — wallet optional.",
  metadataBase: new URL("https://base-tips.vercel.app"),
  other: {
    "base:app_id": "69f884af879b4ae3fa1c7162",
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
