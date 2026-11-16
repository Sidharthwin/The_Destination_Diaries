import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Privacy" intro="What we collect, why, and the choices you have. Written to be read." />
      <Prose>
        <p><em>This is a plain-language summary of how the product handles data. Have it reviewed by a qualified professional before relying on it as your published policy.</em></p>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account details:</strong> your email address and, if you sign in with Google, your name and profile picture. Passwords are handled by our authentication provider (Supabase) and are never stored by us in readable form.</li>
          <li><strong>Trip details:</strong> the destinations, dates, budgets, preferences, itineraries and expenses you enter.</li>
          <li><strong>Saved places and feedback:</strong> places you bookmark, reports you file and messages you send us.</li>
          <li><strong>Operational logs:</strong> technical records of itinerary generation and third-party service calls, used to keep the service reliable.</li>
        </ul>
        <h2>How we use it</h2>
        <p>To build and store your itineraries, to keep your account secure, and to improve the accuracy of place data. We do not sell personal data.</p>
        <h2>Services we rely on</h2>
        <ul>
          <li><strong>Supabase</strong> — database and sign-in.</li>
          <li><strong>Mapbox</strong> — map display and, where enabled, route measurement. Coordinates of places on your route are sent to Mapbox for this.</li>
          <li><strong>An AI model provider</strong> — where AI features are enabled, your trip preferences and the places in your plan are sent to generate descriptions. We do not send your name or email address.</li>
        </ul>
        <h2>Sharing a trip</h2>
        <p>A trip is private unless you turn on its share link. Anyone with the link can then view the itinerary, but not your budget, notes on special requirements, or account details. You can turn the link off at any time.</p>
        <h2>Your choices</h2>
        <p>You can edit or delete your trips at any time. To delete your account and associated data, <a href="/contact">contact us</a>.</p>
      </Prose>
    </>
  );
}
