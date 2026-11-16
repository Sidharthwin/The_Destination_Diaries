import { NextResponse } from "next/server";
import { z, ZodError, type ZodType } from "zod";
import { ServiceError } from "@/server/errors";

/** Consistent success envelope. */
export function ok<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json({ data: serializeBigInt(data) }, responseInit);
}

/** Consistent error envelope: { error: { code, message, details? } } */
export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details: serializeBigInt(details) } : {}) } },
    { status },
  );
}

/** Wraps a route handler body: maps ServiceError and ZodError to HTTP responses. */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ServiceError) {
      return fail(err.code, err.message, err.status, err.details);
    }
    if (err instanceof ZodError) {
      return fail("VALIDATION", "Invalid input", 400, z.treeifyError(err));
    }
    console.error("[api] unhandled error:", err);
    return fail("INTERNAL", "Something went wrong", 500);
  }
}

/** Parse a request JSON body with a Zod schema (400 on failure via `handle`). */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ServiceError("VALIDATION", "Request body must be valid JSON");
  }
  return schema.parse(json);
}

/** Parse URL search params with a Zod schema. */
export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const url = new URL(req.url);
  return schema.parse(Object.fromEntries(url.searchParams));
}

/** JSON cannot carry BigInt — convert paise values to numbers at the boundary. */
function serializeBigInt<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
  ) as T;
}
