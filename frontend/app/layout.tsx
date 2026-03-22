import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
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
    <html lang="en">
      <body
        className={`${dmSerif.variable} ${dmSans.variable} antialiased`}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
