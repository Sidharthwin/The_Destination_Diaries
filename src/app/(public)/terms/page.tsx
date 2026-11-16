import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Terms of use" intro="The short version: we help you plan; you make the decisions and check the details." />
      <Prose>
        <p><em>This is a plain-language summary. Have it reviewed by a qualified professional before relying on it as your published terms.</em></p>
        <h2>A planning aid, not a guarantee</h2>
        <p>Itineraries, travel times and costs are estimates produced by software. Places close, roads flood, prices change. Confirm opening hours, prices, safety conditions and transport locally before you rely on a plan.</p>
        <h2>No bookings</h2>
        <p>We do not sell tickets, rooms or transport, and we do not show live availability or fares. Any cost shown is a planning estimate unless it is marked as verified or was entered by you.</p>
        <h2>Your account</h2>
        <p>Keep your sign-in details safe. You are responsible for what happens under your account. Do not misuse the service, attempt to access other people&apos;s trips, or overload it with automated requests.</p>
        <h2>Your content</h2>
        <p>Your trips are yours. Corrections and reports you submit about places may be used to improve the shared place data.</p>
        <h2>Place data</h2>
        <p>Place information may come from open datasets such as OpenStreetMap and is used under its respective licence. See <a href="/about#data">data sources and credits</a>.</p>
        <h2>Changes</h2>
        <p>We may update the service and these terms. Significant changes will be announced on this page.</p>
      </Prose>
    </>
  );
}
