import type { Metadata } from "next";
import { headers } from "next/headers";
import { AppNav } from "@/components/layout/app-nav";
import { requireAdminPage } from "@/server/auth/session";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/admin";
  const user = await requireAdminPage(path);
  return (
    <>
      <AppNav name={user.displayName ?? user.email} isAdmin />
      <div className="mx-auto grid w-full max-w-[90rem] flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <AdminNav />
        <main className="min-w-0">{children}</main>
      </div>
    </>
  );
}
