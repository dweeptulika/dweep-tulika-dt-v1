import type { Metadata } from "next";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL, websiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dweep Tulika | Andaman & Nicobar News",
    template: "%s | Dweep Tulika",
  },
  description:
    "Latest news from the Andaman and Nicobar Islands, including local affairs, governance, culture, education, business and public-interest reporting from Dweep Tulika.",
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon-logo-white.jpg", type: "image/jpeg" }],
  },
  openGraph: { siteName: "Dweep Tulika", type: "website", locale: "en_IN" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = websiteJsonLd();

  return (
    <html lang="en">
      <body>
        <Script
          id="google-adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2226471364050801"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <GoogleAnalytics gaId="G-LJQ10J2V3X" />
      </body>
    </html>
  );
}
