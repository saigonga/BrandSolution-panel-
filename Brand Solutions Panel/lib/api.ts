// Client-side fetch helper. Throws an Error carrying the server's message.
export async function api<T = unknown>(path: string, method: string = "GET", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `Request failed (${res.status}).`;
    throw new Error(msg);
  }
  return data as T;
}

// Today's date in IST as YYYY-MM-DD, for date inputs.
export function todayKeyIST(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

export function keyFromISO(iso: string | null): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export function digitsOnly(s: string): string {
  return s.replace(/[^\d]/g, "");
}
