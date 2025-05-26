import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Define a type for backward compatibility
// Will be removed when we fully migrate to async cookies API
type UnsafeUnwrappedCookies = {
  get: (name: string) => { name: string; value: string } | undefined
  getAll: () => { name: string; value: string }[]
  set: (name: string, value: string, options?: any) => void
  delete: (name: string) => boolean
  has: (name: string) => boolean
  clear: () => void
  toString: () => string
}

// This function creates a Supabase client for use in Next.js server components (app directory only)
export async function createClient() {
  // Using the recommended pattern from Supabase docs for Next.js App Router
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Rely on createServerClient's default cookie handling with next/headers/cookies
      cookies: {
        get: (name: string) => cookies().get(name)?.value,
        set: (name: string, value: string, options: object) => cookies().set(name, value, options),
        remove: (name: string, options: object) => cookies().set(name, '', { ...options, maxAge: -1 }),
      },
      auth: {
        persistSession: true,
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    }
  )
}

// This function creates a Supabase client with admin privileges using the service role key
export async function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
  }
  
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
} 