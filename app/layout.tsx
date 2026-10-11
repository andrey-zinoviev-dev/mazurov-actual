import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Roboto_Condensed } from "next/font/google";
import { Container } from "@/components/Container/Container";
import { JsonLd } from "@/components/JsonLd/JsonLd";
import { localBusinessJsonLd } from "@/lib/seo-jsonld";
import { getSiteUrl, SITE } from "@/lib/site";
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
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE.defaultTitle,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.defaultDescription,
  openGraph: {
    type: "website",
    locale: SITE.locale,
    siteName: SITE.name,
    title: SITE.defaultTitle,
    description: SITE.defaultDescription,
    images: [{ url: SITE.defaultOgImagePath }],
  },
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
        <JsonLd data={localBusinessJsonLd()} />
        <Container>{children}</Container>
      </body>
    </html>
  );
}
