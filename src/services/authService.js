import { supabase } from '../supabase/config'

export async function registerUser(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  })
  if (error) throw error
  return data.user
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function loginWithProvider(provider, redirectTo = window.location.origin) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  })
  if (error) throw error
  return data
}

export async function loginWithGoogle(redirectTo) {
  return loginWithProvider('google', redirectTo)
}

export async function loginWithGithub(redirectTo) {
  return loginWithProvider('github', redirectTo)
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function listenAuthState(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
  return () => data.subscription.unsubscribe()
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function removeCurrentUser() {
  throw new Error(
    'Exclusão de conta exige uma Edge Function com a service_role key. Implemente em supabase/functions/delete-user e chame via supabase.functions.invoke.',
  )
}
