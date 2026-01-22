import type { Metadata } from "next";
import { Orbitron, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import LifnuxLauncher from "@/components/LifnuxLauncher";
import MusicPlayerProvider from "@/components/music/MusicPlayerProvider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Lifnux",
  description: "Lifnux personal OS shell",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${spaceMono.variable} ${orbitron.variable} antialiased`}
      >
        <MusicPlayerProvider>
          {children}
          <LifnuxLauncher />
        </MusicPlayerProvider>
      </body>
    </html>
  );
}
