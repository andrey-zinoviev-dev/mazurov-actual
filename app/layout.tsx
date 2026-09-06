import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Roboto_Condensed } from "next/font/google";
import { Container } from "@/components/Container/Container";
import "./globals.css";
import "@/styles/shop.css";

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Mazurov Rental",
  description: "Аренда техники Mazurov Rental",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${robotoCondensed.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <Container>{children}</Container>
      </body>
    </html>
  );
}
