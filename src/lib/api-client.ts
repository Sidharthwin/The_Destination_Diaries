export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string, readonly details?: unknown) {
    super(message);
  }
}

/** Calls a JSON API route and unwraps the `{ data }` / `{ error }` envelope. */
export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError("You appear to be offline. Check your connection and try again.", 0, "NETWORK");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const fallback = res.status === 401 ? "Your session has expired. Please sign in again." : "Something went wrong. Please try again.";
    throw new ApiError(json?.error?.message ?? fallback, res.status, json?.error?.code ?? "ERROR", json?.error?.details);
  }
  return json.data as T;
}
