import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a dummy client during build if variables are not set
    // This is safe because client-side code won't execute during build
    return {
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
    } as any
  }

  return createBrowserClient(url, key)
}
