import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL, websiteJsonLd } from "@/lib/seo";

const OFFICIAL_LOGO_URL =
  "https://blogger.googleusercontent.com/img/a/AVvXsEhJ3O2ALVPRaVh4xa5sjb5cak1NEUvqzGOAVMb6_pKdZtiafHPuuXuO4IJU13NasgeXor5zyzIWviKh8bZ5yAS4A36CoJ24lxyF8EsIubyouuUyCQIa9eIif8ggVe8Xkua8sg6Tn-KafGLP6ZcB2GSOtA8_uaHZcosg_WJXtm-FyJ2fVglkrqMTdqvnyqw=s676";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: { icon: [{ url: "/favicon-white.svg", type: "image/svg+xml" }] },
  title: {
    default: "Dweep Tulika — A Truthful & Unbiased Perspective",
    template: "%s | Dweep Tulika",
  },
  description:
    "Dweep Tulika — island-centric news, public affairs, culture and stories from Andaman & Nicobar Islands.",
  alternates: { canonical: "/" },
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
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
