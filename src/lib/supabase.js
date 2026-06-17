// src/lib/supabase.js
// Supabase client — reads from env variables set in Vercel dashboard
// VITE_ prefix makes them available in the browser bundle

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing env variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file and Vercel dashboard.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)
