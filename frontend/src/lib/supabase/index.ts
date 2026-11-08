// The app's one way into Supabase. Only the publishable key may live in frontend config.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Rows from a table through the REST API. Null when Supabase isn't configured or the request fails. */
export async function selectRows<T>(table: string, query: string): Promise<T[] | null> {
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: { apikey: key } });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** Public URL of a file in a public Storage bucket. */
export function publicFileUrl(bucket: string, path: string): string | null {
  return url ? `${url}/storage/v1/object/public/${bucket}/${path}` : null;
}
