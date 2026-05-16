import { supabase } from '../supabase/config'

export async function saveUserProfile(uid, profile) {
  const { error } = await supabase
    .from('users')
    .upsert({ id: uid, ...profile }) 
  if (error) throw error
}

export async function getUserProfile(uid) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function saveGameResult(uid, gameData) {
  const { error } = await supabase
    .from('games')
    .insert([{ uid, ...gameData, created_at: new Date().toISOString() }])
  if (error) throw error
}

export async function getUserGames(uid) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('uid', uid)
  if (error) throw error
  return data
}

export async function deleteGameRecord(gameId) {
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId)
  if (error) throw error
}

export async function deleteUserData(uid) {
  const { error: gamesError } = await supabase
    .from('games')
    .delete()
    .eq('uid', uid)
  if (gamesError) throw gamesError

  const { error: userError } = await supabase
    .from('users')
    .delete()
    .eq('id', uid)
  if (userError) throw userError
}