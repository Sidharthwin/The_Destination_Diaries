import { headers } from "next/headers";
import { AppNav } from "@/components/layout/app-nav";
import { requireUserPage } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Server-side check on every request; the proxy redirect is only a convenience.
  const path = (await headers()).get("x-pathname") ?? "/dashboard";
  const user = await requireUserPage(path);
  return (
    <>
      <AppNav name={user.displayName ?? user.email} isAdmin={user.role === "ADMIN"} />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
