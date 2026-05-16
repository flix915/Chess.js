import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import stockfishUrl from 'stockfish.js/stockfish.wasm.js?url'

const pieceSymbols = {
  wp: '♙',
  wr: '♖',
  wn: '♘',
  wb: '♗',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  br: '♜',
  bn: '♞',
  bb: '♝',
  bq: '♛',
  bk: '♚',
}

const pieceValues = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}

export default function Board() {
  const [fen, setFen] = useState(new Chess().fen())
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [legalSquares, setLegalSquares] = useState([])
  const [history, setHistory] = useState([])
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)
  const [aiThinking, setAiThinking] = useState(false)
  const [aiRating, setAiRating] = useState(1000)
  const [stockfish, setStockfish] = useState(null)
  const [engineReady, setEngineReady] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(5)
  const [whiteTime, setWhiteTime] = useState(5 * 60)
  const [blackTime, setBlackTime] = useState(5 * 60)
  const [matchPoints, setMatchPoints] = useState(0)
  const [winnerByTime, setWinnerByTime] = useState(null)
  const [fenHistory, setFenHistory] = useState([new Chess().fen()])
  const [showHistory, setShowHistory] = useState(false)
  const fenRef = useRef(fen)
  const resultRecordedRef = useRef(false)

  useEffect(() => {
    fenRef.current = fen
  }, [fen])

  const game = useMemo(() => new Chess(fen), [fen])
  const isGameOver = useMemo(() => game.isGameOver() || winnerByTime !== null, [game, winnerByTime])

  const getSkillLevel = (rating) => {
    if (rating <= 400) return 0
    if (rating <= 600) return Math.floor((rating - 400) / 50) + 1
    if (rating <= 1200) return Math.floor((rating - 600) / 100) + 6
    if (rating <= 2000) return Math.floor((rating - 1200) / 100) + 13
    return 20
  }

  const applyCaptureScore = useCallback((move) => {
    if (!move || !move.captured) return
    const value = pieceValues[move.captured] || 0
    if (move.color === 'w') {
      setPlayerScore((prev) => prev + value)
    } else {
      setAiScore((prev) => prev + value)
    }
  }, [])

  const formatTime = (totalSeconds) => {
    const safeSeconds = Math.max(0, totalSeconds)
    const minutes = Math.floor(safeSeconds / 60)
    const seconds = safeSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const applyMatchPoints = useCallback((result) => {
    setMatchPoints((prev) => {
      if (result === 'win') return prev + 3
      if (result === 'draw') return prev + 1
      return Math.max(0, prev - 2)
    })
  }, [])

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
    let worker = null

    const initStockfishWorker = async () => {
      try {
        worker = new Worker(stockfishUrl, { type: 'classic' })
        worker.onmessage = (event) => {
          const message = event.data
          if (typeof message !== 'string') return

          if (message === 'uciok' || message === 'readyok') {
            setEngineReady(true)
          }

          if (message.startsWith('bestmove')) {
            const bestMove = message.split(' ')[1]
            const gameCopy = new Chess(fenRef.current)
            const move = gameCopy.move(bestMove, { sloppy: true })
            if (move) {
              applyCaptureScore(move)
              const aiFen = gameCopy.fen()
              setFen(aiFen)
              setFenHistory((prev) => [...prev, aiFen])
              setHistory((prev) => [...prev, move])
              awardResultIfFinished(gameCopy)
              setAiThinking(false)
            } else {
              setAiThinking(false)
            }
          }
        }

        worker.postMessage('uci')
        worker.postMessage('isready')
        setStockfish(worker)
      } catch (error) {
        console.error('Falha ao inicializar o Stockfish:', error)
      }
    }

    initStockfishWorker()

    return () => {
      if (worker) {
        worker.terminate()
      }
    }
  }, [applyCaptureScore, awardResultIfFinished])

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

  const makeAIMove = (positionFen = fen) => {
    if (stockfish && engineReady && gameStarted && game.turn() === 'b' && !aiThinking && !isGameOver) {
      setAiThinking(true)
      const skillLevel = getSkillLevel(aiRating)
      stockfish.postMessage(`setoption name Skill Level value ${skillLevel}`)
      stockfish.postMessage(`position fen ${positionFen}`)
      stockfish.postMessage('go movetime 1000')
    }
  }

  const status = useMemo(() => {
    if (winnerByTime === 'w') {
      return 'Tempo esgotado das pretas — brancas venceram'
    }

    if (winnerByTime === 'b') {
      return 'Seu tempo acabou — pretas venceram'
    }

    if (game.isCheckmate()) {
      return game.turn() === 'w'
        ? 'Xeque-mate — pretas venceram'
        : 'Xeque-mate — brancas venceram'
    }

    if (game.isDraw()) {
      return 'Empate'
    }

    if (game.isCheck()) {
      return `${game.turn() === 'w' ? 'Vez das brancas' : 'Vez das pretas'} — Xeque!`
    }

    return game.turn() === 'w' ? 'Vez das brancas' : 'Vez das pretas'
  }, [game, winnerByTime])

  function handleSquareClick(square) {
    if (!gameStarted || game.turn() === 'b' || isGameOver) return // Só permite cliques quando for vez das brancas

    const piece = game.get(square)

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
        const gameEnded = awardResultIfFinished(game)
        if (!gameEnded) {
          makeAIMove(newFen)
        }
        return
      }
    }

    if (piece && piece.color === game.turn()) {
      const moves = game.moves({ square, verbose: true })
      setSelectedSquare(square)
      setLegalSquares(moves.map((move) => move.to))
    } else {
      setSelectedSquare(null)
      setLegalSquares([])
    }
  }
  const startGame = () => {
    const initialSeconds = timerMinutes * 60
    setFen(new Chess().fen())
    setFenHistory([new Chess().fen()])
    setSelectedSquare(null)
    setLegalSquares([])
    setHistory([])
    setPlayerScore(0)
    setAiScore(0)
    setWinnerByTime(null)
    setAiThinking(false)
    setWhiteTime(initialSeconds)
    setBlackTime(initialSeconds)
    resultRecordedRef.current = false
    setGameStarted(true)
  }

  const undoLastMove = () => {
    if (fenHistory.length <= 1 || aiThinking) return
    const previousHistory = fenHistory.slice(0, -1)
    setFen(previousHistory[previousHistory.length - 1])
    setFenHistory(previousHistory)
    setSelectedSquare(null)
    setLegalSquares([])
    setWinnerByTime(null)
    resultRecordedRef.current = false
    setAiThinking(false)
  }

  const resign = () => {
    if (!gameStarted || isGameOver) return
    setWinnerByTime('b')
    setAiThinking(false)
    if (!resultRecordedRef.current) {
      applyMatchPoints('loss')
      resultRecordedRef.current = true
    }
  }

  const rematch = () => {
    startGame()
  }

  const boardRows = useMemo(() => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const rows = []

    for (let rank = 8; rank >= 1; rank -= 1) {
      const squares = []
      for (let file = 0; file < 8; file += 1) {
        const square = `${files[file]}${rank}`
        const piece = game.get(square)
        squares.push({ square, piece })
      }
      rows.push(squares)
    }

    return rows
  }, [game])

  function renderPiece(piece) {
    if (!piece) {
      return null
    }

    return pieceSymbols[`${piece.color}${piece.type}`] || null
  }

  return (
    <div className="board-page">
      {!gameStarted ? (
        <div className="setup-screen">
          <h1>Configurar Partida vs IA</h1>
          <div className="rating-control">
            <label>Rating da IA: {aiRating}</label>
            <input
              type="range"
              min="200"
              max="2000"
              step="100"
              value={aiRating}
              onChange={(e) => setAiRating(Number(e.target.value))}
            />
            <p>Rating baixo = IA fraca, alto = IA forte</p>
          </div>
          <div className="timer-control">
            <label htmlFor="match-timer">Tempo por lado: {timerMinutes} min</label>
            <input
              id="match-timer"
              type="range"
              min="1"
              max="15"
              step="1"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(Number(e.target.value))}
            />
          </div>
          <button onClick={startGame} className="start-button">
            Começar Jogo
          </button>
        </div>
      ) : (
        <>
          <div className="game-controls">
            <button type="button" onClick={undoLastMove}>
              Voltar lance
            </button>
            <button type="button" onClick={resign}>
              Desistir
            </button>
            <button type="button" onClick={rematch}>
              Revanche
            </button>
          </div>
          <div className="board-wrapper">
            <section className="board-panel">
              <div className="board-grid">
                {boardRows.map((rank, rankIndex) => (
                  <div key={rankIndex} className="board-row">
                    {rank.map((cell, cellIndex) => {
                      const isDark = (rankIndex + cellIndex) % 2 === 1
                      const isSelected = selectedSquare === cell.square
                      const isLegal = legalSquares.includes(cell.square)

                      return (
                        <button
                          key={cell.square}
                          type="button"
                          className={`square ${isDark ? 'dark' : 'light'} ${
                            isSelected ? 'selected' : ''
                          } ${isLegal ? 'legal' : ''}`}
                          onClick={() => handleSquareClick(cell.square)}
                        >
                          <span className="square-label">{cell.square}</span>
                          <span className={`piece ${cell.piece?.color || ''}`}>{renderPiece(cell.piece)}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </section>

            <section className="info-panel">
              <div className="score-card">
                <h2>Pontos</h2>
                <div className="score-values">
                  <div className="score-block player-score">
                    <span>Capturas Jogador</span>
                    <strong>{playerScore}</strong>
                  </div>
                  <div className="score-block ai-score">
                    <span>Capturas IA</span>
                    <strong>{aiScore}</strong>
                  </div>
                </div>
                <div className="match-points">
                  <span>Pontos de Partida</span>
                  <strong>{matchPoints}</strong>
                </div>
              </div>

              <div className="status-card">
                <h2>Status</h2>
                <p>{status}</p>
                <div className="timer-grid">
                  <div className="timer-item">
                    <span>Seu tempo</span>
                    <strong>{formatTime(whiteTime)}</strong>
                  </div>
                  <div className="timer-item">
                    <span>Tempo da IA</span>
                    <strong>{formatTime(blackTime)}</strong>
                  </div>
                </div>
              </div>

              <div className="history-card">
                <button 
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="toggle-history-btn"
                >
                  {showHistory ? 'Esconder Histórico' : 'Ver Histórico'}
                </button>
                {showHistory && (
                  <div className="history-content">
                    {history.length === 0 ? (
                      <p>Nenhum movimento feito ainda.</p>
                    ) : (
                      <ol>
                        {history.map((move, index) => (
                          <li key={`${move.from}-${move.to}-${index}`}>
                            {move.color === 'w' ? `${Math.ceil((index + 1) / 2)}. ` : ''}
                            {move.san}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
