import type { Metadata, Viewport } from "next";
import { CartProvider } from "@/components/CartProvider";
import { TabBar } from "@/components/TabBar";
import "./globals.css";

/**
 * Fonts are linked at runtime rather than fetched by `next/font` at build time.
 *
 * Why: `next/font/google` makes every production build depend on Google's CDN
 * being reachable from the build machine. That is a real CI fragility for one
 * round-trip of benefit. The stylesheet is preconnected so the cost is small.
 *
 * Phase 8 (performance) should self-host these as woff2 in /public/fonts and
 * switch to `next/font/local`, which removes the third-party request entirely.
 *
 * Playfair Display is chosen to match the logo: the "Mylapore" wordmark is a
 * high-contrast serif, and the headings should sound like the same voice.
 * Instrument Sans carries the UI and the letterspaced labels, echoing the
 * lockup text under the wordmark.
 */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Instrument+Sans:wght@400;500;600;700&display=swap";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://mylaporebites.com"),
  title: {
    default: "Mylapore Bites — Made Fresh. From Mylapore. To Your Door.",
    template: "%s — Mylapore Bites",
  },
  description:
    "Traditional South Indian podis, pickles, savouries and sweets, prepared fresh in Mylapore after you order and delivered to your home in Chennai.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Mylapore Bites", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Mylapore Bites",
    title: "Mylapore Bites — Made Fresh. From Mylapore. To Your Door.",
    description: "Traditional South Indian food, made fresh in Mylapore after you order.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#153017",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body>
        <CartProvider>
          {children}
          <TabBar />
        </CartProvider>
      </body>
    </html>
  );
}
