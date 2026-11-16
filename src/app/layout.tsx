import type { Metadata, Viewport } from "next";
import { Caveat, Cormorant_Garamond, Manrope } from "next/font/google";
import { MotionProvider } from "@/components/motion/motion-provider";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants/travel";
import { siteUrl } from "@/lib/supabase/config";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description:
    "Turn your journeys across India into beautiful travel diaries you can read like a book — and plan the next one with an itinerary engine that does the sums.",
  openGraph: { siteName: SITE_NAME, type: "website" },
};

export const viewport: Viewport = { themeColor: "#173d32" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${cormorant.variable} ${caveat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
