import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/config'
import { getOnlineGames, createOnlineGame, getUserProfile } from '../services/dbService'
import { Play, Plus, Users, Clock, Shield, AlertTriangle } from 'lucide-react'
import './Lobby.css'

export default function Lobby() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [timeLimit, setTimeLimit] = useState(5) // em minutos
  const [preferredColor, setPreferredColor] = useState('random') // 'random' | 'white' | 'black'
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        navigate('/auth')
        return
      }
      setUser(session.user)
      const p = await getUserProfile(session.user.id)
      setProfile(p)
    }

    checkUser()
  }, [navigate])

  const loadRooms = async () => {
    try {
      const activeRooms = await getOnlineGames()
      setRooms(activeRooms)
    } catch (err) {
      console.error('Erro ao buscar salas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRooms()

    // Inscrever-se em tempo real para alteracoes nas salas de jogo
    const channel = supabase
      .channel('lobby_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'online_games' },
        () => {
          loadRooms()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    if (!user || !profile) return

    setSubmitting(true)
    setError('')

    try {
      // Determinar cores
      let whiteId = null
      let whiteName = null
      let blackId = null
      let blackName = null

      let chosenColor = preferredColor
      if (chosenColor === 'random') {
        chosenColor = Math.random() < 0.5 ? 'white' : 'black'
      }

      if (chosenColor === 'white') {
        whiteId = user.id
        whiteName = profile.display_name
      } else {
        blackId = user.id
        blackName = profile.display_name
      }

      const roomData = {
        white_id: whiteId,
        white_name: whiteName,
        black_id: blackId,
        black_name: blackName,
        time_limit: timeLimit * 60,
        white_time: timeLimit * 60,
        black_time: timeLimit * 60,
        status: 'waiting',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: [],
      }

      const newRoom = await createOnlineGame(roomData)
      navigate(`/game/online/${newRoom.id}`)
    } catch (err) {
      console.error('Erro ao criar sala', err)
      setError('Erro ao registrar a sala de jogo. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinRoom = async (room) => {
    if (!user || !profile) return

    // Se o usuario ja for um dos jogadores, apenas redireciona
    if (room.white_id === user.id || room.black_id === user.id) {
      navigate(`/game/online/${room.id}`)
      return
    }

    // Se a sala estiver cheia, nao permite entrar
    if (room.white_id && room.black_id) {
      alert('Esta sala ja esta cheia!')
      return
    }

    try {
      const updates = {
        status: 'playing',
        last_move_at: new Date().toISOString(),
      }

      if (!room.white_id) {
        updates.white_id = user.id
        updates.white_name = profile.display_name
      } else {
        updates.black_id = user.id
        updates.black_name = profile.display_name
      }

      const { error: updateError } = await supabase
        .from('online_games')
        .update(updates)
        .eq('id', room.id)

      if (updateError) throw updateError

      navigate(`/game/online/${room.id}`)
    } catch (err) {
      console.error('Erro ao entrar na sala', err)
      alert('Nao foi possivel entrar na partida. Alguem pode ter entrado antes.')
    }
  }

  const formatTimeLimit = (seconds) => {
    return `${Math.floor(seconds / 60)} min`
  }

  if (loading) {
    return <div className="lobby-loading">Buscando salas disponiveis...</div>
  }

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <div>
          <h1>Lobby Multiplayer</h1>
          <p className="subtitle">Jogue contra outros enxadristas em tempo real</p>
        </div>
        <button
          type="button"
          className="create-room-trigger"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} />
          Nova Sala
        </button>
      </div>

      <div className="rooms-grid">
        {rooms.length === 0 ? (
          <div className="no-rooms-card">
            <Users size={40} className="no-rooms-icon" />
            <p>Nenhuma sala aberta no momento.</p>
            <button
              type="button"
              className="create-room-btn-inline"
              onClick={() => setShowCreateModal(true)}
            >
              Criar primeira sala
            </button>
          </div>
        ) : (
          rooms.map((room) => {
            const isWhiteEmpty = !room.white_id
            const isBlackEmpty = !room.black_id
            const isFull = !isWhiteEmpty && !isBlackEmpty

            let statusLabel = 'Aguardando oponente'
            let statusClass = 'waiting'
            if (isFull) {
              statusLabel = 'Em jogo'
              statusClass = 'playing'
            }

            return (
              <div key={room.id} className="room-card">
                <div className="room-card-header">
                  <div className="time-badge">
                    <Clock size={14} />
                    <span>{formatTimeLimit(room.time_limit)}</span>
                  </div>
                  <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                </div>

                <div className="room-players">
                  <div className="player-slot">
                    <span className="color-dot white"></span>
                    <strong className={isWhiteEmpty ? 'empty' : ''}>
                      {room.white_name || 'Vaga Aberta'}
                    </strong>
                  </div>
                  <div className="vs-divider">VS</div>
                  <div className="player-slot">
                    <span className="color-dot black"></span>
                    <strong className={isBlackEmpty ? 'empty' : ''}>
                      {room.black_name || 'Vaga Aberta'}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className={`join-room-btn ${isFull ? 'spectate' : ''}`}
                  onClick={() => handleJoinRoom(room)}
                >
                  <Play size={14} />
                  {isFull ? 'Entrar (Ver)' : 'Jogar'}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de Criação de Sala */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Configurar Nova Sala</h2>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="modal-error">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="modal-form">
              <div className="form-group">
                <label>Tempo de Jogo (por jogador):</label>
                <div className="time-options-grid">
                  {[1, 3, 5, 10, 15].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      className={`time-option-btn ${timeLimit === mins ? 'active' : ''}`}
                      onClick={() => setTimeLimit(mins)}
                    >
                      {mins} {mins === 1 ? 'minuto' : 'minutos'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Preferência de Peças:</label>
                <div className="color-options">
                  <button
                    type="button"
                    className={`color-option white ${preferredColor === 'white' ? 'active' : ''}`}
                    onClick={() => setPreferredColor('white')}
                  >
                    Brancas
                  </button>
                  <button
                    type="button"
                    className={`color-option random ${preferredColor === 'random' ? 'active' : ''}`}
                    onClick={() => setPreferredColor('random')}
                  >
                    Aleatório
                  </button>
                  <button
                    type="button"
                    className={`color-option black ${preferredColor === 'black' ? 'active' : ''}`}
                    onClick={() => setPreferredColor('black')}
                  >
                    Pretas
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button type="submit" className="confirm-btn" disabled={submitting}>
                  {submitting ? 'Criando...' : 'Criar e Entrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
