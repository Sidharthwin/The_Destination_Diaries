import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser } from "@/server/auth/session";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact", description: "Send feedback, corrections or questions to the Destination Diaries team." };

export default async function ContactPage() {
  const user = await getCurrentUser();
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title={<>Tell us what we got <span className="italic">wrong</span> — or right</>}
        intro="Corrections to place data are especially welcome. Every message is read by a person."
      />
      <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
        <ContactForm defaultEmail={user?.email ?? ""} />
      </div>
    </>
  );
}
