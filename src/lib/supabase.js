import { createClient } from '@supabase/supabase-js'

if (typeof window !== 'undefined' && window.location.hash.includes('type=signup')) {
  window.history.replaceState(null, '', '#/login')
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Create .env from .env.example')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
