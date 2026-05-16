import { supabase } from '../supabase/config'

export async function registerUser(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  })
  if (error) throw error
  return data.user
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data.user
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function listenAuthState(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
  return () => {
    if (data && data.subscription) {
      data.subscription.unsubscribe()
    }
  }
}

export async function removeCurrentUser() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.user) {
    throw new Error('Nenhum usuário autenticado')
  }
  
  throw new Error('A exclusão de usuário via client no Supabase requer uma configuração específica (Edge Function ou RPC). Contate o administrador.')
}
