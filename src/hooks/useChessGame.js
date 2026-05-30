import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chess } from 'chess.js'

const pieceValues = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}

export default function useChessGame() {
  const [gameMode, setGameMode] = useState('ai') 
  const [whitePlayerName, setWhitePlayerName] = useState('Jogador 1')
  const [blackPlayerName, setBlackPlayerName] = useState('IA')
  const [aiRating, setAiRating] = useState(1000)
  const [timerMinutes, setTimerMinutes] = useState(5)

  const [fen, setFen] = useState(new Chess().fen())
  const [fenHistory, setFenHistory] = useState([new Chess().fen()])
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [legalSquares, setLegalSquares] = useState([])
  const [history, setHistory] = useState([])
  const [whiteScore, setWhiteScore] = useState(0)
  const [blackScore, setBlackScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [whiteTime, setWhiteTime] = useState(5 * 60)
  const [blackTime, setBlackTime] = useState(5 * 60)
  const [matchPoints, setMatchPoints] = useState(0)
  const [winnerByTime, setWinnerByTime] = useState(null)
  const [aiThinking, setAiThinking] = useState(false)
  
  
  const [isFlipped, setIsFlipped] = useState(false)
  const [autoFlip, setAutoFlip] = useState(false)

  const fenRef = useRef(fen)
  const resultRecordedRef = useRef(false)

  useEffect(() => {
    fenRef.current = fen
  }, [fen])

  const game = useMemo(() => new Chess(fen), [fen])
  const isGameOver = useMemo(() => game.isGameOver() || winnerByTime !== null, [game, winnerByTime])
  const turn = useMemo(() => game.turn(), [game])

  const displayedFlipped = useMemo(() => {
    if (gameMode === 'local' && autoFlip && gameStarted && !isGameOver) {
      return game.turn() === 'b'
    }
    return isFlipped
  }, [gameMode, autoFlip, gameStarted, isGameOver, game, isFlipped])

  const applyCaptureScore = useCallback((move) => {
    if (!move || !move.captured) return
    const value = pieceValues[move.captured] || 0
    if (move.color === 'w') {
      setWhiteScore((prev) => prev + value)
    } else {
      setBlackScore((prev) => prev + value)
    }
  }, [])

  const applyMatchPoints = useCallback((result) => {
    if (gameMode !== 'ai') return
    setMatchPoints((prev) => {
      if (result === 'win') return prev + 3
      if (result === 'draw') return prev + 1
      return Math.max(0, prev - 2)
    })
  }, [gameMode])

  const awardResultIfFinished = useCallback((position) => {
    if (resultRecordedRef.current) return true

    if (position.isCheckmate()) {
      const playerWon = position.turn() === 'b'
      applyMatchPoints(playerWon ? 'win' : 'loss')
      resultRecordedRef.current = true
      return true
    }

    if (position.isDraw()) {
      applyMatchPoints('draw')
      resultRecordedRef.current = true
      return true
    }

    return false
  }, [applyMatchPoints])

  
  useEffect(() => {
    if (!gameStarted || isGameOver) return undefined

    const intervalId = setInterval(() => {
      if (game.turn() === 'w') {
        setWhiteTime((prev) => {
          const next = Math.max(0, prev - 1)
          if (next === 0) {
            setWinnerByTime('b')
            setAiThinking(false)
            if (!resultRecordedRef.current) {
              applyMatchPoints('loss')
              resultRecordedRef.current = true
            }
          }
          return next
        })
      } else {
        setBlackTime((prev) => {
          const next = Math.max(0, prev - 1)
          if (next === 0) {
            setWinnerByTime('w')
            setAiThinking(false)
            if (!resultRecordedRef.current) {
              applyMatchPoints('win')
              resultRecordedRef.current = true
            }
          }
          return next
        })
      }
    }, 1000)

    return () => clearInterval(intervalId)
  }, [applyMatchPoints, game, gameStarted, isGameOver])

  


  const startGame = useCallback((settings = {}) => {
    const mode = settings.gameMode ?? gameMode
    const rating = settings.aiRating ?? aiRating
    const minutes = settings.timerMinutes ?? timerMinutes
    const wName = settings.whitePlayerName ?? (mode === 'ai' ? 'Jogador' : 'Jogador 1')
    const bName = settings.blackPlayerName ?? (mode === 'ai' ? 'IA' : 'Jogador 2')

    setGameMode(mode)
    setAiRating(rating)
    setTimerMinutes(minutes)
    setWhitePlayerName(wName)
    setBlackPlayerName(bName)

    const initialSeconds = minutes * 60
    const newChess = new Chess()
    const startFen = newChess.fen()

    setFen(startFen)
    setFenHistory([startFen])
    setSelectedSquare(null)
    setLegalSquares([])
    setHistory([])
    setWhiteScore(0)
    setBlackScore(0)
    setWinnerByTime(null)
    setAiThinking(false)
    setWhiteTime(initialSeconds)
    setBlackTime(initialSeconds)
    resultRecordedRef.current = false
    setIsFlipped(false)
    setGameStarted(true)
  }, [gameMode, aiRating, timerMinutes])

  const handleSquareClick = useCallback((square) => {
    if (!gameStarted || isGameOver) return

    // If game mode is vs AI, human can only move during white's turn
    if (gameMode === 'ai' && game.turn() === 'b') return

    const piece = game.get(square)

    // Selection or switching piece of the same color
    if (selectedSquare && piece && piece.color === game.turn()) {
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

    // Making a move
    if (selectedSquare) {
      const move = game.move({ from: selectedSquare, to: square, promotion: 'q' })
      if (move) {
        const newFen = game.fen()
        setSelectedSquare(null)
        setLegalSquares([])
        setFen(newFen)
        setFenHistory((prev) => [...prev, newFen])
        applyCaptureScore(move)
        setHistory((prev) => [...prev, move])
        awardResultIfFinished(game)
        return
      }
    }

    // Initial select
    if (piece && piece.color === game.turn()) {
      const moves = game.moves({ square, verbose: true })
      setSelectedSquare(square)
      setLegalSquares(moves.map((move) => move.to))
    } else {
      setSelectedSquare(null)
      setLegalSquares([])
    }
  }, [game, gameStarted, isGameOver, gameMode, selectedSquare, applyCaptureScore, awardResultIfFinished])

  const makeEngineMove = useCallback((bestMove) => {
    if (!gameStarted || isGameOver || game.turn() !== 'b' || gameMode !== 'ai') return

    const move = game.move(bestMove)
    if (move) {
      const newFen = game.fen()
      setSelectedSquare(null)
      setLegalSquares([])
      setFen(newFen)
      setFenHistory((prev) => [...prev, newFen])
      applyCaptureScore(move)
      setHistory((prev) => [...prev, move])
      awardResultIfFinished(game)
    }
    setAiThinking(false)
  }, [game, gameStarted, isGameOver, gameMode, applyCaptureScore, awardResultIfFinished])

  const undoLastMove = useCallback(() => {
    if (aiThinking) return

    // In AI mode, we undo BOTH AI move and player's move so player gets their turn back.
    // In local mode, we undo exactly 1 move at a time.
    const undoCount = gameMode === 'ai' ? 2 : 1

    if (fenHistory.length <= undoCount) return

    const previousHistory = fenHistory.slice(0, -undoCount)
    const newFen = previousHistory[previousHistory.length - 1]

    setFen(newFen)
    setFenHistory(previousHistory)
    setSelectedSquare(null)
    setLegalSquares([])
    setWinnerByTime(null)
    resultRecordedRef.current = false
    setAiThinking(false)

    // Recalculate move history from the FEN history
    const tempGame = new Chess()
    const recalculatedHistory = []
    const tempWhiteScore = { val: 0 }
    const tempBlackScore = { val: 0 }

    // Reconstruct move and score state from scratch for consistency
    for (let i = 1; i < previousHistory.length; i++) {
      const currentFen = previousHistory[i]
      const moves = tempGame.moves({ verbose: true })
      // Find the move that leads from the current tempGame state to the next FEN
      let matchedMove = null
      for (const m of moves) {
        tempGame.move(m)
        if (tempGame.fen() === currentFen) {
          matchedMove = m
          break
        }
        tempGame.undo() // rollback if didn't match
      }

      if (matchedMove) {
        recalculatedHistory.push(matchedMove)
        if (matchedMove.captured) {
          const value = pieceValues[matchedMove.captured] || 0
          if (matchedMove.color === 'w') {
            tempWhiteScore.val += value
          } else {
            tempBlackScore.val += value
          }
        }
      }
    }

    setHistory(recalculatedHistory)
    setWhiteScore(tempWhiteScore.val)
    setBlackScore(tempBlackScore.val)
  }, [gameMode, fenHistory, aiThinking])

  const resign = useCallback(() => {
    if (!gameStarted || isGameOver) return
    const activeTurn = game.turn()
    // The resigning color loses, so the winner is the opposite side
    setWinnerByTime(activeTurn === 'w' ? 'b' : 'w')
    setAiThinking(false)
    if (!resultRecordedRef.current) {
      applyMatchPoints(activeTurn === 'w' ? 'loss' : 'win')
      resultRecordedRef.current = true
    }
  }, [game, gameStarted, isGameOver, applyMatchPoints])

  const rematch = useCallback(() => {
    startGame()
  }, [startGame])

  const formatTime = useCallback((totalSeconds) => {
    const safeSeconds = Math.max(0, totalSeconds)
    const minutes = Math.floor(safeSeconds / 60)
    const seconds = safeSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [])

  const status = useMemo(() => {
    if (winnerByTime === 'w') {
      return `Tempo esgotado das pretas — ${whitePlayerName} venceu`
    }

    if (winnerByTime === 'b') {
      return `Tempo esgotado das brancas — ${blackPlayerName} venceu`
    }

    if (game.isCheckmate()) {
      return game.turn() === 'w'
        ? `Xeque-mate — ${blackPlayerName} venceu`
        : `Xeque-mate — ${whitePlayerName} venceu`
    }

    if (game.isDraw()) {
      return 'Empate'
    }

    if (game.isCheck()) {
      const activePlayer = game.turn() === 'w' ? whitePlayerName : blackPlayerName
      return `Vez de ${activePlayer} — Xeque!`
    }

    const activePlayer = game.turn() === 'w' ? whitePlayerName : blackPlayerName
    return `Vez de ${activePlayer}`
  }, [game, winnerByTime, whitePlayerName, blackPlayerName])

  const boardRows = useMemo(() => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const rows = []

    const rankSequence = displayedFlipped
      ? [1, 2, 3, 4, 5, 6, 7, 8]
      : [8, 7, 6, 5, 4, 3, 2, 1]

    const fileSequence = displayedFlipped
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
  }, [game, displayedFlipped])

  return {
    fen,
    fenHistory,
    selectedSquare,
    legalSquares,
    history,
    whiteScore,
    blackScore,
    gameStarted,
    whiteTime,
    blackTime,
    matchPoints,
    winnerByTime,
    aiThinking,
    isFlipped: displayedFlipped,
    autoFlip,
    isGameOver,
    turn,
    boardRows,
    status,
    gameMode,
    aiRating,
    timerMinutes,
    whitePlayerName,
    blackPlayerName,
    setAiThinking,
    setIsFlipped,
    setAutoFlip,
    startGame,
    handleSquareClick,
    makeEngineMove,
    undoLastMove,
    resign,
    rematch,
    formatTime,
  }
}
