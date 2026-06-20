import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'
import { supabase } from '../supabase/config'
import { saveGameResult } from '../services/dbService'

export default function useOnlineChessGame(gameId) {
  const [dbGame, setDbGame] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [legalSquares, setLegalSquares] = useState([])
  const [localWhiteTime, setLocalWhiteTime] = useState(300)
  const [localBlackTime, setLocalBlackTime] = useState(300)

  // Mensagens do chat
  const [chatMessages, setChatMessages] = useState([])
  // Conectados na sala (Presence)
  const [presenceUsers, setPresenceUsers] = useState([])

  const channelRef = useRef(null)
  const resultLoggedRef = useRef(false)

  // Buscar usuário logado
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
    })
  }, [])

  // Buscar dados iniciais da partida
  useEffect(() => {
    if (!gameId) return

    const fetchInitialGame = async () => {
      const { data, error } = await supabase
        .from('online_games')
        .select('*')
        .eq('id', gameId)
        .single()

      if (!error && data) {
        setDbGame(data)
        setLocalWhiteTime(data.white_time)
        setLocalBlackTime(data.black_time)
      }
    }

    fetchInitialGame()
  }, [gameId])

  // Instanciar o motor do chess.js com base no FEN do banco de dados
  const game = useMemo(() => {
    return new Chess(dbGame?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  }, [dbGame?.fen])

  const turn = useMemo(() => game.turn(), [game])
  const isGameOver = useMemo(() => {
    return dbGame?.status === 'finished' || game.isGameOver()
  }, [dbGame?.status, game])

  const isFlipped = useMemo(() => {
    // Se o jogador logado for o Preto, girar o tabuleiro
    return currentUser && dbGame?.black_id === currentUser.id
  }, [currentUser, dbGame?.black_id])

  // Papéis do jogador
  const playerColor = useMemo(() => {
    if (!currentUser || !dbGame) return null
    if (dbGame.white_id === currentUser.id) return 'w'
    if (dbGame.black_id === currentUser.id) return 'b'
    return null // Espectador
  }, [currentUser, dbGame])

  const isMyTurn = useMemo(() => {
    if (dbGame?.status !== 'playing') return false
    return playerColor !== null && turn === playerColor
  }, [dbGame?.status, playerColor, turn])

  // Configurar Canal Realtime (Postgres Changes + Broadcast + Presence)
  useEffect(() => {
    if (!gameId || !currentUser) return undefined

    const channel = supabase.channel(`online_game:${gameId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    })

    // 1. Escutar alterações na partida (lances)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'online_games',
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        const updated = payload.new
        setDbGame(updated)
        setLocalWhiteTime(updated.white_time)
        setLocalBlackTime(updated.black_time)
      }
    )

    // 2. Escutar mensagens do Chat via Broadcast
    channel.on('broadcast', { event: 'chat' }, (payload) => {
      setChatMessages((prev) => [...prev, payload.payload])
    })

    // 3. Escutar sinais de derrota por tempo ou propostas de empate
    channel.on('broadcast', { event: 'game_event' }, (payload) => {
      const { type, sender } = payload.payload
      if (type === 'resign' && sender !== currentUser.id) {
        console.log('O oponente desistiu.')
      }
    })

    // 4. Presence: Quem está online na sala
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = []
        Object.keys(state).forEach((key) => {
          users.push({
            id: key,
            presence: state[key][0],
          })
        })
        setPresenceUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Entrar no Presence enviando metadados do jogador
          await channel.track({
            display_name: currentUser.user_metadata?.display_name || currentUser.email,
            online_at: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [gameId, currentUser])

  // Enviar mensagem no chat
  const sendChatMessage = useCallback((text) => {
    if (!channelRef.current || !currentUser || !text.trim()) return

    const message = {
      sender_id: currentUser.id,
      sender_name: currentUser.user_metadata?.display_name || currentUser.email,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    }

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat',
      payload: message,
    })

    // Adiciona localmente também
    setChatMessages((prev) => [...prev, message])
  }, [currentUser])

  // Descontar tempo localmente
  useEffect(() => {
    if (dbGame?.status !== 'playing' || isGameOver) return undefined

    const intervalId = setInterval(() => {
      if (turn === 'w') {
        setLocalWhiteTime((prev) => {
          const next = Math.max(0, prev - 1)
          if (next === 0 && isMyTurn) {
            handleTimeoutDefeat('w')
          }
          return next
        })
      } else {
        setLocalBlackTime((prev) => {
          const next = Math.max(0, prev - 1)
          if (next === 0 && isMyTurn) {
            handleTimeoutDefeat('b')
          }
          return next
        })
      }
    }, 1000)

    return () => clearInterval(intervalId)
  }, [dbGame?.status, turn, isGameOver, isMyTurn])

  // Processar derrota por tempo do lado ativo
  const handleTimeoutDefeat = async (losingColor) => {
    if (!dbGame || dbGame.status !== 'playing') return

    const winnerId = losingColor === 'w' ? dbGame.black_id : dbGame.white_id

    try {
      await supabase
        .from('online_games')
        .update({
          status: 'finished',
          winner_id: winnerId,
          reason: 'timeout',
          white_time: losingColor === 'w' ? 0 : localWhiteTime,
          black_time: losingColor === 'b' ? 0 : localBlackTime,
        })
        .eq('id', gameId)
    } catch (err) {
      console.error('Erro ao submeter derrota por tempo:', err)
    }
  }

  // Efetuar lance no tabuleiro online
  const handleSquareClick = useCallback(async (square, promotion = 'q') => {
    if (dbGame?.status !== 'playing' || isGameOver || !isMyTurn) return

    const piece = game.get(square)

    // Seleção ou troca de peça do mesmo lado
    if (selectedSquare && piece && piece.color === playerColor) {
      if (selectedSquare === square) {
        setSelectedSquare(null)
        setLegalSquares([])
        return
      }

      const moves = game.moves({ square, verbose: true })
      setSelectedSquare(square)
      setLegalSquares(moves.map((move) => move.to))
      return
    }

    // Tentar fazer movimento
    if (selectedSquare) {
      const move = game.move({ from: selectedSquare, to: square, promotion })
      if (move) {
        setSelectedSquare(null)
        setLegalSquares([])

        // Calcular tempo restante do jogador atual
        const now = new Date()
        const lastMoveAt = new Date(dbGame.last_move_at)
        const secondsSpent = Math.max(0, Math.floor((now.getTime() - lastMoveAt.getTime()) / 1000))

        let newWhiteTime = dbGame.white_time
        let newBlackTime = dbGame.black_time

        if (playerColor === 'w') {
          newWhiteTime = Math.max(0, dbGame.white_time - secondsSpent)
        } else {
          newBlackTime = Math.max(0, dbGame.black_time - secondsSpent)
        }

        const newFen = game.fen()
        const newMoves = [...(dbGame.moves || []), move]

        // Preparar atualizações de fim de jogo se aplicável
        let gameStatus = 'playing'
        let winnerId = null
        let draw = false
        let reason = null

        if (game.isCheckmate()) {
          gameStatus = 'finished'
          winnerId = playerColor === 'w' ? dbGame.white_id : dbGame.black_id
          reason = 'checkmate'
        } else if (game.isDraw()) {
          gameStatus = 'finished'
          draw = true
          reason = 'draw'
        }

        try {
          const { error } = await supabase
            .from('online_games')
            .update({
              fen: newFen,
              moves: newMoves,
              white_time: newWhiteTime,
              black_time: newBlackTime,
              last_move_at: now.toISOString(),
              status: gameStatus,
              winner_id: winnerId,
              draw,
              reason,
            })
            .eq('id', gameId)

          if (error) throw error
        } catch (err) {
          console.error('Erro ao enviar jogada:', err)
          // Reverter localmente em caso de falha de conexão
          game.undo()
          alert('Erro ao enviar movimento. Verifique sua conexao.')
        }
        return
      }
    }

    // Seleção inicial
    if (piece && piece.color === playerColor) {
      const moves = game.moves({ square, verbose: true })
      setSelectedSquare(square)
      setLegalSquares(moves.map((move) => move.to))
    } else {
      setSelectedSquare(null)
      setLegalSquares([])
    }
  }, [game, dbGame, isGameOver, isMyTurn, selectedSquare, playerColor, gameId])

  // Desistir da partida
  const resign = useCallback(async () => {
    if (!dbGame || dbGame.status !== 'playing' || !playerColor) return

    const opponentId = playerColor === 'w' ? dbGame.black_id : dbGame.white_id

    try {
      await supabase
        .from('online_games')
        .update({
          status: 'finished',
          winner_id: opponentId,
          reason: 'resign',
        })
        .eq('id', gameId)
    } catch (err) {
      console.error('Erro ao desistir do jogo:', err)
    }
  }, [dbGame, playerColor, gameId])

  // Gravar resultado final unificado no histórico pessoal do usuário logado
  useEffect(() => {
    if (
      dbGame?.status === 'finished' &&
      currentUser &&
      !resultLoggedRef.current &&
      (dbGame.white_id === currentUser.id || dbGame.black_id === currentUser.id)
    ) {
      resultLoggedRef.current = true

      const isWhite = dbGame.white_id === currentUser.id
      const myResult = dbGame.draw
        ? 'draw'
        : dbGame.winner_id === currentUser.id
        ? 'win'
        : 'loss'

      const opponentName = isWhite
        ? dbGame.black_name || 'Oponente'
        : dbGame.white_name || 'Oponente'

      const pgnMoves = (dbGame.moves || [])
        .map((m, idx) => {
          return m.color === 'w' ? `${Math.ceil((idx + 1) / 2)}. ${m.san}` : m.san
        })
        .join(' ')

      saveGameResult(currentUser.id, {
        result: myResult,
        aiRating: null, // indica partida PvP online
        playerScore: isWhite ? 1 : 0, // marcador ilustrativo
        aiScore: isWhite ? 0 : 1,
        matchPoints: myResult === 'win' ? 3 : myResult === 'draw' ? 1 : 0,
        moves: (dbGame.moves || []).map((m) => m.san),
        finalFen: dbGame.fen,
        opponentName: opponentName,
        isOnline: true,
        pgn: pgnMoves,
        durationSeconds: dbGame.time_limit - (isWhite ? localWhiteTime : localBlackTime),
      })
        .then(() => {
          console.log('Resultado da partida online gravado no perfil!')
          
          // Se vencemos, atualizar o rating do perfil localmente no banco
          if (myResult === 'win') {
            supabase
              .from('profiles')
              .select('rating')
              .eq('id', currentUser.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  supabase
                    .from('profiles')
                    .update({ rating: data.rating + 15 })
                    .eq('id', currentUser.id)
                    .then(() => console.log('Rating atualizado (+15)'))
                }
              })
          } else if (myResult === 'loss') {
            supabase
              .from('profiles')
              .select('rating')
              .eq('id', currentUser.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  supabase
                    .from('profiles')
                    .update({ rating: Math.max(200, data.rating - 12) })
                    .eq('id', currentUser.id)
                    .then(() => console.log('Rating atualizado (-12)'))
                }
              })
          }
        })
        .catch((err) => {
          console.error('Erro ao gravar resultado no perfil:', err)
        })
    }
  }, [dbGame, currentUser, localWhiteTime, localBlackTime])

  // Status visual da partida
  const status = useMemo(() => {
    if (!dbGame) return 'Conectando...'
    
    if (dbGame.status === 'waiting') {
      return 'Aguardando oponente entrar...'
    }

    if (dbGame.status === 'finished') {
      const winnerName =
        dbGame.winner_id === dbGame.white_id ? dbGame.white_name : dbGame.black_name
      
      if (dbGame.draw) return 'Empate'
      
      const reasonLabel =
        dbGame.reason === 'timeout'
          ? 'por tempo'
          : dbGame.reason === 'resign'
          ? 'por desistencia'
          : 'por xeque mate'
      
      return `${winnerName} venceu ${reasonLabel}!`
    }

    if (game.isCheck()) {
      const activePlayer = turn === 'w' ? dbGame.white_name : dbGame.black_name
      return `Vez de ${activePlayer} — Xeque!`
    }

    const activePlayer = turn === 'w' ? dbGame.white_name : dbGame.black_name
    return `Vez de ${activePlayer}`
  }, [dbGame, game, turn])

  // Representar linhas do tabuleiro com suporte a inversão de cores
  const boardRows = useMemo(() => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const rows = []

    const rankSequence = isFlipped
      ? [1, 2, 3, 4, 5, 6, 7, 8]
      : [8, 7, 6, 5, 4, 3, 2, 1]

    const fileSequence = isFlipped
      ? [7, 6, 5, 4, 3, 2, 1, 0]
      : [0, 1, 2, 3, 4, 5, 6, 7]

    for (const rank of rankSequence) {
      const squares = []
      for (const fileIndex of fileSequence) {
        const square = `${files[fileIndex]}${rank}`
        const piece = game.get(square)
        squares.push({ square, piece })
      }
      rows.push(squares)
    }

    return rows
  }, [game, isFlipped])

  const getLegalMoves = useCallback((square) => {
    if (!square) return []
    return game.moves({ square, verbose: true })
  }, [game])

  return {
    game,
    dbGame,
    currentUser,
    selectedSquare,
    legalSquares,
    whiteTime: localWhiteTime,
    blackTime: localBlackTime,
    isGameOver,
    isFlipped,
    turn,
    boardRows,
    status,
    chatMessages,
    presenceUsers,
    isMyTurn,
    playerColor,
    handleSquareClick,
    getLegalMoves,
    resign,
    sendChatMessage,
  }
}
