import { supabase } from '../supabase/config'

/**
 * Perfis de Usuários
 */

export async function saveUserProfile(uid, profile) {
  const mappedProfile = {
    id: uid,
    display_name: profile.displayName || profile.display_name,
    avatar: profile.avatar,
    rating: profile.rating,
  }
  // Remove campos não informados (undefined) para não sobrescrever dados
  Object.keys(mappedProfile).forEach(
    (key) => mappedProfile[key] === undefined && delete mappedProfile[key]
  )

  const { error } = await supabase
    .from('profiles')
    .upsert(mappedProfile)
  if (error) throw error
}

export async function getUserProfile(uid) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

/**
 * Histórico de Partidas (Locais e Online)
 */

export async function saveGameResult(uid, gameData) {
  const { error } = await supabase
    .from('games')
    .insert([{
      user_id: uid,
      result: gameData.result, // 'win' | 'loss' | 'draw'
      ai_rating: gameData.aiRating, // null para PvP
      player_score: gameData.playerScore ?? 0,
      ai_score: gameData.aiScore ?? 0,
      match_points: gameData.matchPoints ?? 0,
      moves: gameData.moves || [],
      final_fen: gameData.finalFen,
      duration_seconds: gameData.durationSeconds ?? 0,
      opponent_name: gameData.opponentName, // Nome da IA ou do oponente online
      is_online: gameData.isOnline ?? false,
      pgn: gameData.pgn || null,
      created_at: new Date().toISOString()
    }])
  if (error) throw error
}

export async function getUserGames(uid) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getGameRecord(gameId) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()
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
    .eq('user_id', uid)
  if (gamesError) throw gamesError

  const { error: userError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', uid)
  if (userError) throw userError
}

/**
 * Classificação / Ranking Global
 */

export async function getGlobalRanking() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, rating, avatar')
    .order('rating', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

/**
 * Partidas Online (Realtime / Matchmaking)
 */

export async function getOnlineGames() {
  const { data, error } = await supabase
    .from('online_games')
    .select('*')
    .in('status', ['waiting', 'playing'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getOnlineGame(gameId) {
  const { data, error } = await supabase
    .from('online_games')
    .select('*')
    .eq('id', gameId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function createOnlineGame(gameData) {
  const { data, error } = await supabase
    .from('online_games')
    .insert([gameData])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateOnlineGame(gameId, updateData) {
  const { data, error } = await supabase
    .from('online_games')
    .update(updateData)
    .eq('id', gameId)
    .select()
    .single()
  if (error) throw error
  return data
}