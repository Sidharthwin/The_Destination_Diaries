import { vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { ServiceError } from "@/server/errors";

export interface TestUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
}

export const USER_A: TestUser = { id: "11111111-1111-4111-8111-111111111111", email: "a@test.local", displayName: "Test A", avatarUrl: null, role: "USER" };
export const USER_B: TestUser = { id: "22222222-2222-4222-8222-222222222222", email: "b@test.local", displayName: "Test B", avatarUrl: null, role: "USER" };
export const ADMIN: TestUser = { id: "33333333-3333-4333-8333-333333333333", email: "admin@test.local", displayName: "Test Admin", avatarUrl: null, role: "ADMIN" };

const state: { user: TestUser | null } = { user: null };

/** The session layer is the only thing faked: everything below it is real. */
export const sessionMock = {
  getCurrentUser: vi.fn(async () => state.user),
  requireUser: vi.fn(async () => {
    if (!state.user) throw new ServiceError("UNAUTHORIZED", "Authentication required");
    return state.user;
  }),
  requireAdmin: vi.fn(async () => {
    if (!state.user) throw new ServiceError("UNAUTHORIZED", "Authentication required");
    if (state.user.role !== "ADMIN") throw new ServiceError("FORBIDDEN", "Administrator access required");
    return state.user;
  }),
};

export function signInAs(user: TestUser | null) {
  state.user = user;
}

export async function resetTestData() {
  const ids = [USER_A.id, USER_B.id, ADMIN.id];
  await prisma.trip.updateMany({ where: { ownerId: { in: ids } }, data: { activeVersionId: null } });
  await prisma.trip.deleteMany({ where: { ownerId: { in: ids } } });
  await prisma.feedback.deleteMany({ where: { topic: { startsWith: "[test]" } } });
  await prisma.placeReport.deleteMany({ where: { reporterId: { in: ids } } });
  await prisma.profile.deleteMany({ where: { id: { in: ids } } });
  for (const u of [USER_A, USER_B, ADMIN]) {
    await prisma.profile.create({
      data: { id: u.id, email: u.email, displayName: u.displayName, role: u.role, preference: { create: {} } },
    });
  }
}

export function jsonRequest(method: string, url: string, body?: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

export async function body<T = any>(res: Response): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (await res.json()) as T;
}

export async function cityId(slug: string): Promise<string> {
  return (await prisma.city.findUniqueOrThrow({ where: { slug } })).id;
}
