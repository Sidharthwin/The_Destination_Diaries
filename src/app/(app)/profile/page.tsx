import type { Metadata } from "next";
import { requireUserPage } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUserPage("/profile");
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: user.id }, include: { preference: true } });
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
      <p className="eyebrow">Profile</p>
      <h1 className="mt-3 text-5xl sm:text-6xl">You and how you travel</h1>
      <p className="mt-4 text-ink-soft">Signed in as <strong className="text-ink">{profile.email}</strong>. Your preferences pre-fill new trips.</p>
      <ProfileForm
        initial={{
          displayName: profile.displayName ?? "",
          homeCity: profile.homeCity ?? "",
          travelStyle: profile.preference?.travelStyle ?? "",
          interests: profile.preference?.interests ?? [],
          dietary: profile.preference?.dietary ?? "",
          pacePreference: profile.preference?.pacePreference ?? "",
        }}
      />
    </div>
  );
}
