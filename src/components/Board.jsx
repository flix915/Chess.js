import { useState } from 'react'
import useChessGame from '../hooks/useChessGame'
import useStockfishAI from '../hooks/useStockfishAI'

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

export default function Board() {
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
    setIsFlipped,
    setAutoFlip,
    startGame,
    handleSquareClick,
    makeEngineMove,
    undoLastMove,
    resign,
    rematch,
    formatTime,
  } = chessGame

  // Setup screen local states
  const [setupGameMode, setSetupGameMode] = useState('ai') // 'ai' | 'local'
  const [setupAiRating, setSetupAiRating] = useState(aiRating)
  const [setupTimerMinutes, setSetupTimerMinutes] = useState(timerMinutes)
  const [setupWhiteName, setSetupWhiteName] = useState('Jogador 1')
  const [setupBlackName, setSetupBlackName] = useState('Jogador 2')
  const [setupAutoFlip, setSetupAutoFlip] = useState(false)

  const [showHistory, setShowHistory] = useState(false)

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
            {gameMode === 'local' && (
              <button 
                type="button" 
                className="flip-button"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                Inverter Tabuleiro
              </button>
            )}
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
                          <span className={`piece ${cell.piece?.color || ''}`}>
                            {renderPiece(cell.piece)}
                          </span>
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
