import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { MotionProvider } from "@/components/motion/motion-provider";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants/travel";
import { siteUrl } from "@/lib/supabase/config";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description:
    "Plan trips across India with day-wise itineraries built by an optimization engine: real travel times, honest budgets, and plans you can edit and replan.",
  openGraph: { siteName: SITE_NAME, type: "website" },
};

export const viewport: Viewport = { themeColor: "#173d32" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${dmSerif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
