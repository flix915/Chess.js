import { useEffect, useRef } from 'react'
import stockfishUrl from 'stockfish.js/stockfish.wasm.js?url'

export default function useStockfishAI({
  gameMode,
  gameStarted,
  isGameOver,
  fen,
  turn,
  aiRating,
  aiThinking,
  setAiThinking,
  makeEngineMove,
}) {
  const stockfishRef = useRef(null)
  const engineReadyRef = useRef(false)

  // Initialize Stockfish worker only if gameMode is 'ai' and game has started
  useEffect(() => {
    if (gameMode !== 'ai' || !gameStarted || isGameOver) {
      if (stockfishRef.current) {
        stockfishRef.current.terminate()
        stockfishRef.current = null
        engineReadyRef.current = false
      }
      return undefined
    }

    if (stockfishRef.current) return undefined

    let worker = null
    try {
      worker = new Worker(stockfishUrl, { type: 'classic' })
      worker.onmessage = (event) => {
        const message = event.data
        if (typeof message !== 'string') return

        if (message === 'uciok' || message === 'readyok') {
          engineReadyRef.current = true
        }

        if (message.startsWith('bestmove')) {
          const bestMove = message.split(' ')[1]
          makeEngineMove(bestMove)
        }
      }

      worker.postMessage('uci')
      worker.postMessage('isready')
      stockfishRef.current = worker
    } catch (error) {
      console.error('Falha ao inicializar o Stockfish:', error)
    }

    return () => {
      if (worker) {
        worker.terminate()
        stockfishRef.current = null
        engineReadyRef.current = false
      }
    }
  }, [gameMode, gameStarted, isGameOver, makeEngineMove])

  // Get AI skill level mapping
  const getSkillLevel = (rating) => {
    if (rating <= 400) return 0
    if (rating <= 600) return Math.floor((rating - 400) / 50) + 1
    if (rating <= 1200) return Math.floor((rating - 600) / 100) + 6
    if (rating <= 2000) return Math.floor((rating - 1200) / 100) + 13
    return 20
  }

  // Trigger AI move when it's black's turn
  useEffect(() => {
    if (
      gameMode === 'ai' &&
      gameStarted &&
      !isGameOver &&
      turn === 'b' &&
      stockfishRef.current &&
      engineReadyRef.current &&
      !aiThinking
    ) {
      setAiThinking(true)
      const skillLevel = getSkillLevel(aiRating)
      stockfishRef.current.postMessage(`setoption name Skill Level value ${skillLevel}`)
      stockfishRef.current.postMessage(`position fen ${fen}`)
      stockfishRef.current.postMessage('go movetime 1000')
    }
  }, [gameMode, gameStarted, isGameOver, fen, turn, aiRating, aiThinking, setAiThinking])
}
