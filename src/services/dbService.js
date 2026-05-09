import { supabase } from '../supabase/config'

export async function saveUserProfile(userId, profile) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profile, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveGameResult(userId, gameData) {
  const { data, error } = await supabase
    .from('games')
    .insert({ user_id: userId, ...gameData })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getUserGames(userId) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteGameRecord(gameId) {
  const { error } = await supabase.from('games').delete().eq('id', gameId)
  if (error) throw error
}

export async function deleteUserData(userId) {
  const { error: gamesError } = await supabase.from('games').delete().eq('user_id', userId)
  if (gamesError) throw gamesError
  const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId)
  if (profileError) throw profileError
}
