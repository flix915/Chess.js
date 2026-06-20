import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fblvjpopkoqdbbykzsxm.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibHZqcG9wa29xZGJieWt6c3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDY0MTAsImV4cCI6MjA5MzkyMjQxMH0.Bpk3WncNrctSnVJZGK8g3llzC34aN7rlovMgQLYGrMk'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variaveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao necessarias.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
