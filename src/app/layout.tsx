import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import ConfirmProvider from "@/components/ConfirmProvider";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Household Budget",
  description: "A shared budget you keep together.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} font-sans antialiased`}
      >
        <NextTopLoader
          color="#0E7C66"
          height={3}
          shadow="0 0 8px #0E7C66"
          showSpinner={false}
        />
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
