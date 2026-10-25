import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://celtivo.com"),
  title: {
    default: "Celtivo — group travel, minus the admin",
    template: "%s · Celtivo",
  },
  description:
    "One place to find a place everyone actually agrees on, book it, and collect everyone's share — without fronting the money or becoming the group treasurer.",
  openGraph: {
    siteName: "Celtivo",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3f5fe",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
