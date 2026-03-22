import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: "400",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-accent-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LiftProof — Geo-Testing for Marketing Incrementality",
  description: "Measure the true incremental impact of your marketing with causal inference and synthetic control methods. Free forever.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSerifDisplay.variable} ${instrumentSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
