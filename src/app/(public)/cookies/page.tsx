import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Cookies" intro="We use only the cookies the product needs to work." />
      <Prose>
        <h2>Essential cookies</h2>
        <ul>
          <li><strong>Sign-in session:</strong> cookies set by our authentication provider (Supabase) keep you signed in securely. Without them you would need to sign in on every page.</li>
        </ul>
        <h2>What we do not use</h2>
        <p>The application itself sets no advertising or cross-site tracking cookies.</p>
        <h2>Maps</h2>
        <p>Where the interactive map is enabled, Mapbox may store data in your browser to load map tiles efficiently. See Mapbox&apos;s own privacy policy for details.</p>
        <h2>Managing cookies</h2>
        <p>You can clear or block cookies in your browser settings. Blocking the session cookie will sign you out.</p>
      </Prose>
    </>
  );
}
