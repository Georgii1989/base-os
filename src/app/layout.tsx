import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Crazy Vika - Save Georgiy',
  description: 'A Base mini app platformer where Crazy Vika tries to reach Georgiy in the castle.',
  other: {
    'base:app_id': 'replace-with-your-base-app-id',
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: 'https://crazy-vika-game-npr52quix-georgiys-projects-fe3daf9b.vercel.app/logo.svg',
      button: {
        title: 'Play Now',
        action: {
          type: 'launch_miniapp',
          name: 'Crazy Vika - Save Georgiy',
          url: 'https://crazy-vika-game-npr52quix-georgiys-projects-fe3daf9b.vercel.app',
          splashImageUrl: 'https://crazy-vika-game-npr52quix-georgiys-projects-fe3daf9b.vercel.app/logo.svg',
          splashBackgroundColor: '#09051A',
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
