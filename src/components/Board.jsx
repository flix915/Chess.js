import { useEffect, useRef, useState } from 'react'
import useChessGame from '../hooks/useChessGame'
import useStockfishAI from '../hooks/useStockfishAI'
import { supabase } from '../supabase/config'
import { saveGameResult } from '../services/dbService'
import ChessPiece from './ChessPiece'

const pieceSymbols = {
  wp: '♟',
  wr: '♜',
  wn: '♞',
  wb: '♝',
  wq: '♛',
  wk: '♚',
  bp: '♟',
  br: '♜',
  bn: '♞',
  bb: '♝',
  bq: '♛',
  bk: '♚',
}

export default function Board({ user }) {
  const chessGame = useChessGame()

  const {
    fen,
    selectedSquare,
    legalSquares,
    history,
    whiteScore,
    blackScore,
    gameStarted,
    whiteTime,
    blackTime,
    matchPoints,
    aiThinking,
    isFlipped,
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
    setAutoFlip,
    startGame,
    handleSquareClick,
    getLegalMoves,
    makeEngineMove,
    undoLastMove,
    resign,
    rematch,
    formatTime,
  } = chessGame


  const [promotionOptions, setPromotionOptions] = useState([])
  const [promotionTarget, setPromotionTarget] = useState(null)

  const promotionLabels = {
    q: 'Dama',
    r: 'Torre',
    b: 'Bispo',
    n: 'Cavalo',
  }

  const clearPromotion = () => {
    setPromotionOptions([])
    setPromotionTarget(null)
  }

  const choosePromotion = (promotion) => {
    if (!promotionTarget) return
    handleSquareClick(promotionTarget, promotion)
    clearPromotion()
  }

  const handleBoardSquareClick = (square) => {
    if (!selectedSquare) {
      handleSquareClick(square)
      return
    }

    if (selectedSquare === square) {
      handleSquareClick(square)
      return
    }

    const moves = getLegalMoves(selectedSquare)
    const candidates = moves.filter((move) => move.to === square)
    const promotionCards = [...new Set(candidates.filter((move) => move.promotion).map((move) => move.promotion))]

    if (promotionCards.length > 0) {
      setPromotionOptions(promotionCards)
      setPromotionTarget(square)
      return
    }

    if (candidates.length === 1) {
      const promotion = candidates[0].promotion || 'q'
      handleSquareClick(square, promotion)
      return
    }

    handleSquareClick(square)
  }

  // Setup screen local states
  const [setupGameMode, setSetupGameMode] = useState('ai') // 'ai' | 'local'
  const [setupAiRating, setSetupAiRating] = useState(aiRating)
  const [setupTimerMinutes, setSetupTimerMinutes] = useState(timerMinutes)
  const [setupWhiteName, setSetupWhiteName] = useState('Jogador 1')
  const [setupBlackName, setSetupBlackName] = useState('Jogador 2')
  const [setupAutoFlip, setSetupAutoFlip] = useState(false)

  const [showHistory, setShowHistory] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const boardRef = useRef(null)
  const previousFlipped = useRef(isFlipped)
  const rotateTimeout = useRef(null)

  useEffect(() => {
    if (previousFlipped.current !== isFlipped && boardRef.current) {
      boardRef.current.querySelector('.board-grid')?.classList.add('rotating')
      rotateTimeout.current = window.setTimeout(() => {
        boardRef.current.querySelector('.board-grid')?.classList.remove('rotating')
      }, 1000)
      previousFlipped.current = isFlipped
    }

    return () => {
      if (rotateTimeout.current) {
        window.clearTimeout(rotateTimeout.current)
      }
    }
  }, [isFlipped])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === boardRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])


  // Salvar resultado automaticamente ao fim do jogo
  const savedRef = useRef(null)
  useEffect(() => {
    if (gameStarted && isGameOver && user && savedRef.current !== fen) {
      savedRef.current = fen
      
      const pgnMoves = history.map((m, idx) => {
        return m.color === 'w' ? `${Math.ceil((idx + 1) / 2)}. ${m.san}` : m.san
      }).join(' ')
      
      let finalResult = 'draw'
      if (chessGame.winnerByTime) {
        finalResult = chessGame.winnerByTime === 'w' ? 'win' : 'loss'
      } else if (status.toLowerCase().includes('brancas venceram')) {
        finalResult = 'win'
      } else if (status.toLowerCase().includes('pretas venceram')) {
        finalResult = 'loss'
      }

      const opponent = gameMode === 'ai' ? `Stockfish (Nivel ${aiRating})` : blackPlayerName

      saveGameResult(user.id, {
        result: finalResult,
        aiRating: gameMode === 'ai' ? aiRating : null,
        playerScore: whiteScore,
        aiScore: blackScore,
        matchPoints: matchPoints,
        moves: history.map(m => m.san),
        finalFen: fen,
        opponentName: opponent,
        isOnline: false,
        pgn: pgnMoves,
        durationSeconds: Math.max(0, (timerMinutes * 60) - whiteTime)
      }).then(() => {
        console.log('Partida local salva no banco de dados!')
      }).catch(err => {
        console.error('Erro ao salvar partida:', err)
      })
    }
  }, [gameStarted, isGameOver, user, fen, history, gameMode, aiRating, whiteScore, blackScore, matchPoints, status, timerMinutes, whiteTime, blackPlayerName, chessGame.winnerByTime])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && boardRef.current) {
        await boardRef.current.requestFullscreen()
      } else if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('Erro ao alternar tela cheia', error)
    }
  }

  // Plug Stockfish AI
  useStockfishAI({
    gameMode,
    gameStarted,
    isGameOver,
    fen,
    turn,
    aiRating,
    aiThinking,
    setAiThinking,
    makeEngineMove,
  })

  function renderPiece(piece) {
    if (!piece) {
      return null
    }
    return pieceSymbols[`${piece.color}${piece.type}`] || null
  }

  // Calculate visual layout for Chess.com style promotion overlay
  let promotionOverlay = null
  if (promotionOptions.length > 0 && promotionTarget) {
    const fileIndex = promotionTarget.charCodeAt(0) - 97
    const rank = parseInt(promotionTarget[1], 10)
    const visualCol = isFlipped ? 7 - fileIndex : fileIndex
    const visualRow = isFlipped ? rank - 1 : 8 - rank
    
    // Ordered options to match chess.com
    const orderedOptions = ['q', 'n', 'r', 'b'].filter(opt => promotionOptions.includes(opt))
    const promotionColor = turn
    
    promotionOverlay = (
      <div 
        className={`promotion-overlay ${visualRow === 0 ? 'top-row' : 'bottom-row'}`}
        style={{ gridColumn: visualCol + 1 }}
      >
        {orderedOptions.map((option) => (
          <button
            key={option}
            type="button"
            className="promotion-overlay-btn"
            onClick={() => choosePromotion(option)}
          >
            <span className={`piece ${promotionColor}`}>
              {pieceSymbols[`${promotionColor}${option}`]}
            </span>
          </button>
        ))}
        <button 
          type="button" 
          className="promotion-overlay-btn cancel-btn" 
          onClick={clearPromotion}
          title="Cancelar"
        >
          <span className="promotion-cancel-icon">×</span>
        </button>
      </div>
    )
  }

  return (
    <div className="board-page">
      {!gameStarted ? (
        <div className="setup-screen">
          <h1>Configurar Partida</h1>
          
          <div className="mode-tabs">
            <button
              type="button"
              className={`mode-tab ${setupGameMode === 'ai' ? 'active' : ''}`}
              onClick={() => setSetupGameMode('ai')}
            >
              Contra Computador (IA)
            </button>
            <button
              type="button"
              className={`mode-tab ${setupGameMode === 'local' ? 'active' : ''}`}
              onClick={() => setSetupGameMode('local')}
            >
              2 Jogadores (Local)
            </button>
          </div>

          {setupGameMode === 'ai' ? (
            <div className="rating-control">
              <label>Rating da IA: {setupAiRating}</label>
              <input
                type="range"
                min="200"
                max="2000"
                step="100"
                value={setupAiRating}
                onChange={(e) => setSetupAiRating(Number(e.target.value))}
              />
              <p>Rating baixo = IA fraca, alto = IA forte</p>
            </div>
          ) : (
            <div className="names-control">
              <div className="input-group">
                <label htmlFor="white-name-input">Nome das Brancas (Jogador 1):</label>
                <input
                  id="white-name-input"
                  type="text"
                  value={setupWhiteName}
                  onChange={(e) => setSetupWhiteName(e.target.value)}
                  placeholder="Jogador 1"
                  maxLength={15}
                />
              </div>
              <div className="input-group">
                <label htmlFor="black-name-input">Nome das Pretas (Jogador 2):</label>
                <input
                  id="black-name-input"
                  type="text"
                  value={setupBlackName}
                  onChange={(e) => setSetupBlackName(e.target.value)}
                  placeholder="Jogador 2"
                  maxLength={15}
                />
              </div>
              <label className="checkbox-control">
                <input
                  type="checkbox"
                  checked={setupAutoFlip}
                  onChange={(e) => setSetupAutoFlip(e.target.checked)}
                />
                Girar tabuleiro automaticamente a cada turno
              </label>
            </div>
          )}

          <div className="timer-control">
            <label htmlFor="match-timer">Tempo por lado: {setupTimerMinutes} min</label>
            <input
              id="match-timer"
              type="range"
              min="1"
              max="15"
              step="1"
              value={setupTimerMinutes}
              onChange={(e) => setSetupTimerMinutes(Number(e.target.value))}
            />
          </div>

          <button 
            type="button"
            onClick={() => {
              setAutoFlip(setupAutoFlip)
              startGame({
                gameMode: setupGameMode,
                aiRating: setupAiRating,
                timerMinutes: setupTimerMinutes,
                whitePlayerName: setupGameMode === 'ai' ? 'Jogador' : setupWhiteName || 'Jogador 1',
                blackPlayerName: setupGameMode === 'ai' ? 'IA' : setupBlackName || 'Jogador 2',
              })
            }} 
            className="start-button"
          >
            Começar Jogo
          </button>
        </div>
      ) : (
        <>
          <div className="game-controls">
            <button type="button" onClick={undoLastMove} disabled={aiThinking}>
              Voltar lance
            </button>
            <button type="button" onClick={resign}>
              Desistir
            </button>
            <button type="button" onClick={rematch}>
              Revanche
            </button>
            <button
              type="button"
              className="fullscreen-button"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            </button>
          </div>
          <div className="board-wrapper" ref={boardRef}>
            <section className="board-panel">
              <div className="board-grid">
                {boardRows.map((rank, rankIndex) => (
                  <div key={rankIndex} className="board-row">
                    {rank.map((cell, cellIndex) => {
                      const isDark = (rankIndex + cellIndex) % 2 === 1
                      const isSelected = selectedSquare === cell.square
                      const isLegal = legalSquares.includes(cell.square)

                      // Obter coordenadas visuais para animacao
                      const fileIndex = cell.square.charCodeAt(0) - 97
                      const rankNum = parseInt(cell.square[1], 10)
                      const visualCol = isFlipped ? 7 - fileIndex : fileIndex
                      const visualRow = isFlipped ? rankNum - 1 : 8 - rankNum

                      // Verificar se e a peca que se moveu por ultimo
                      const lastMove = history[history.length - 1]
                      const isLastMoveTarget = lastMove && lastMove.to === cell.square
                      let moveStyles = {}
                      let moveClass = ''

                      if (isLastMoveTarget) {
                        const fromFile = lastMove.from.charCodeAt(0) - 97
                        const fromRankNum = parseInt(lastMove.from[1], 10)
                        const fromVisualCol = isFlipped ? 7 - fromFile : fromFile
                        const fromVisualRow = isFlipped ? fromRankNum - 1 : 8 - fromRankNum

                        const dx = (fromVisualCol - visualCol) * 100
                        const dy = (fromVisualRow - visualRow) * 100
                        moveStyles = {
                          '--dx': `${dx}%`,
                          '--dy': `${dy}%`,
                        }
                        moveClass = 'just-moved'
                      }

                      const isCapture = isLegal && cell.piece && cell.piece.color !== turn
                      const pieceKey = cell.piece ? `${cell.square}-${cell.piece.color}${cell.piece.type}-${history.length}` : cell.square

                      return (
                        <button
                          key={cell.square}
                          type="button"
                          className={`square ${isDark ? 'dark' : 'light'} ${
                            isSelected ? 'selected' : ''
                          } ${isLegal ? 'legal' : ''} ${isCapture ? 'legal-capture' : ''}`}
                          onClick={() => handleBoardSquareClick(cell.square)}
                        >
                          <span className="square-label">{cell.square}</span>
                          {cell.piece && (
                            <ChessPiece
                              key={pieceKey}
                              color={cell.piece.color}
                              type={cell.piece.type}
                              className={moveClass}
                              style={moveStyles}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
                {promotionOverlay}
              </div>
            </section>

            <section className="info-panel">
              <div className="score-card">
                <h2>Pontos</h2>
                <div className="score-values">
                  <div className="score-block player-score">
                    <span>Capturas {whitePlayerName}</span>
                    <strong>{whiteScore}</strong>
                  </div>
                  <div className="score-block ai-score">
                    <span>Capturas {blackPlayerName}</span>
                    <strong>{blackScore}</strong>
                  </div>
                </div>
                {gameMode === 'ai' && (
                  <div className="match-points">
                    <span>Pontos de Partida</span>
                    <strong>{matchPoints}</strong>
                  </div>
                )}
              </div>

              <div className="status-card">
                <h2>Status</h2>
                <p>{status}</p>
                <div className="timer-grid">
                  <div className="timer-item">
                    <span>Tempo de {whitePlayerName}</span>
                    <strong>{formatTime(whiteTime)}</strong>
                  </div>
                  <div className="timer-item">
                    <span>Tempo de {blackPlayerName}</span>
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
