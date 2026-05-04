import type { Metadata } from "next";
import "./globals.css";
import { Web3Providers } from "@/components/Web3Providers";

export const metadata: Metadata = {
  title: "Base Tip",
  description: "A standard Base web app with SIWE auth and onchain tipping.",
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
