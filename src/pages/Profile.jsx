import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/config'
import { getUserProfile, saveUserProfile, getUserGames } from '../services/dbService'
import ChessPiece from '../components/ChessPiece'
import { Award, Calendar, CheckCircle2, ChevronRight, Play, Trophy, Users } from 'lucide-react'
import './Profile.css'

const AVAILABLE_AVATARS = [
  { id: 'wK', label: 'Rei Branco', color: 'w', type: 'k' },
  { id: 'wQ', label: 'Dama Branca', color: 'w', type: 'q' },
  { id: 'wR', label: 'Torre Branca', color: 'w', type: 'r' },
  { id: 'wB', label: 'Bispo Branco', color: 'w', type: 'b' },
  { id: 'wN', label: 'Cavalo Branco', color: 'w', type: 'n' },
  { id: 'wP', label: 'Peão Branco', color: 'w', type: 'p' },
  { id: 'bK', label: 'Rei Negro', color: 'b', type: 'k' },
  { id: 'bQ', label: 'Dama Negra', color: 'b', type: 'q' },
  { id: 'bR', label: 'Torre Negra', color: 'b', type: 'r' },
  { id: 'bB', label: 'Bispo Negro', color: 'b', type: 'b' },
  { id: 'bN', label: 'Cavalo Negro', color: 'b', type: 'n' },
  { id: 'bP', label: 'Peão Negro', color: 'b', type: 'p' },
]

export default function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingAvatar, setUpdatingAvatar] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          navigate('/auth')
          return
        }

        const authUser = session.user
        setUser(authUser)

        const userProfile = await getUserProfile(authUser.id)
        setProfile(userProfile)

        const userGames = await getUserGames(authUser.id)
        setGames(userGames)
      } catch (err) {
        console.error('Erro ao carregar dados do perfil', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [navigate])

  const handleSelectAvatar = async (avatarId) => {
    if (!user || !profile) return
    setUpdatingAvatar(true)
    try {
      await saveUserProfile(user.id, {
        ...profile,
        avatar: avatarId,
      })
      setProfile((prev) => ({ ...prev, avatar: avatarId }))
    } catch (err) {
      console.error('Erro ao atualizar avatar', err)
    } finally {
      setUpdatingAvatar(false)
    }
  }

  if (loading) {
    return <div className="profile-loading">Carregando perfil...</div>
  }

  if (!profile) {
    return <div className="profile-error">Perfil não encontrado. Tente fazer login novamente.</div>
  }

  // Estatísticas
  const totalGames = games.length
  const wins = games.filter((g) => g.result === 'win').length
  const losses = games.filter((g) => g.result === 'loss').length
  const draws = games.filter((g) => g.result === 'draw').length
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

  return (
    <div className="profile-container">
      <div className="profile-grid">
        
        {/* Lado Esquerdo: Dados e Avatares */}
        <section className="profile-sidebar-card">
          <div className="profile-header-main">
            <div className="avatar-preview-container">
              {profile.avatar ? (
                <div className="large-avatar-wrapper">
                  <ChessPiece
                    color={profile.avatar[0]}
                    type={profile.avatar[1].toLowerCase()}
                    className="large-avatar"
                  />
                </div>
              ) : (
                <div className="large-avatar-placeholder">?</div>
              )}
            </div>
            <div className="profile-details-main">
              <h2>{profile.display_name}</h2>
              <p className="email-subtitle">{user.email}</p>
              <div className="rating-badge">
                <Trophy size={16} />
                <span>Rating: <strong>{profile.rating}</strong></span>
              </div>
            </div>
          </div>

          <div className="avatar-selection-section">
            <h3>Escolha seu Avatar</h3>
            <div className="avatar-options-grid">
              {AVAILABLE_AVATARS.map((avatar) => {
                const isSelected = profile.avatar === avatar.id
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    className={`avatar-option-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectAvatar(avatar.id)}
                    disabled={updatingAvatar}
                    title={avatar.label}
                  >
                    <ChessPiece color={avatar.color} type={avatar.type} />
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Lado Direito: Estatísticas e Histórico */}
        <div className="profile-main-content">
          
          {/* Estatísticas Individuais */}
          <section className="stats-section">
            <h2>Suas Estatísticas</h2>
            <div className="stats-cards-grid">
              <div className="stat-card">
                <span className="stat-label">Partidas</span>
                <strong className="stat-val">{totalGames}</strong>
              </div>
              <div className="stat-card win">
                <span className="stat-label">Vitórias</span>
                <strong className="stat-val">{wins}</strong>
              </div>
              <div className="stat-card loss">
                <span className="stat-label">Derrotas</span>
                <strong className="stat-val">{losses}</strong>
              </div>
              <div className="stat-card draw">
                <span className="stat-label">Empates</span>
                <strong className="stat-val">{draws}</strong>
              </div>
            </div>

            <div className="win-rate-progress-wrapper">
              <div className="win-rate-text">
                <span>Taxa de Vitória</span>
                <strong>{winRate}%</strong>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${winRate}%` }}></div>
              </div>
            </div>
          </section>

          {/* Histórico de Partidas */}
          <section className="history-section">
            <h2>Histórico de Partidas</h2>
            {games.length === 0 ? (
              <div className="no-games-card">
                <Award size={48} className="no-games-icon" />
                <p>Nenhuma partida registrada ainda. Vá para o tabuleiro e jogue contra a IA ou localmente!</p>
              </div>
            ) : (
              <div className="games-history-list">
                {games.map((game) => {
                  const dateStr = new Date(game.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                  
                  let resultClass = 'draw'
                  let resultLabel = 'Empate'
                  if (game.result === 'win') {
                    resultClass = 'win'
                    resultLabel = 'Vitória'
                  } else if (game.result === 'loss') {
                    resultClass = 'loss'
                    resultLabel = 'Derrota'
                  }

                  return (
                    <div key={game.id} className="history-item-card">
                      <div className="history-left">
                        <span className={`result-indicator ${resultClass}`}>{resultLabel}</span>
                        <div className="match-details">
                          <strong>vs {game.opponent_name || (game.ai_rating ? 'Stockfish' : 'Jogador Local')}</strong>
                          <span className="game-meta">
                            <Calendar size={12} />
                            {dateStr} • {game.is_online ? 'Partida Online' : game.ai_rating ? 'Contra Computador' : 'Local'}
                          </span>
                        </div>
                      </div>
                      <div className="history-right">
                        <div className="captures-summary">
                          <span>{game.player_score} vs {game.ai_score}</span>
                        </div>
                        <button
                          type="button"
                          className="replay-action-btn"
                          onClick={() => navigate(`/replay/${game.id}`)}
                          title="Reassistir partida"
                        >
                          <Play size={14} />
                          Replay
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </div>

      </div>
    </div>
  )
}
