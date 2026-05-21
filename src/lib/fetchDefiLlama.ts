const DEFAULT_TIMEOUT_MS = 28_000;

export async function fetchDefiLlamaJson<T>(
  url: string,
  revalidateSeconds = 300,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: revalidateSeconds },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
