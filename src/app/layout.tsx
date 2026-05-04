import type { Metadata } from "next";
import "./globals.css";
import { Ready } from "@/components/Ready";

export const metadata: Metadata = {
  title: 'Crazy Vika - Save Georgiy',
  description: 'A Base mini app platformer where Crazy Vika tries to reach Georgiy in the castle.',
  other: {
    'base:app_id': '69f884af879b4ae3fa1c7162',
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: 'https://crazy-vika-game.vercel.app/logo.svg',
      button: {
        title: 'Play Now',
        action: {
          type: 'launch_miniapp',
          name: 'Crazy Vika - Save Georgiy',
          url: 'https://crazy-vika-game.vercel.app',
          splashImageUrl: 'https://crazy-vika-game.vercel.app/logo.svg',
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Ready />
        {children}
      </body>
    </html>
  );
}
