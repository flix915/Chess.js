import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useOnlineChessGame from '../hooks/useOnlineChessGame'
import ChessPiece from '../components/ChessPiece'
import { Send, Users, ShieldAlert, ArrowLeft, Clock, MessageSquare, AlertCircle } from 'lucide-react'
import './OnlineGame.css'

export default function OnlineGame() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  
  const chatBottomRef = useRef(null)
  const [chatInput, setChatInput] = useState('')

  const onlineGame = useOnlineChessGame(gameId)
  const {
    dbGame,
    currentUser,
    selectedSquare,
    legalSquares,
    whiteTime,
    blackTime,
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
  } = onlineGame

  // Rolar chat para o final ao receber novas mensagens
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSendChat = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    sendChatMessage(chatInput)
    setChatInput('')
  }

  const formatTime = (totalSeconds) => {
    const safeSeconds = Math.max(0, totalSeconds)
    const minutes = Math.floor(safeSeconds / 60)
    const seconds = safeSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const handleBoardSquareClick = (square) => {
    if (dbGame?.status !== 'playing') return

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

    // Se houver promoção de peão, aplicar por padrão Dama para simplificar no online,
    // ou podemos disparar a promoção se o lance exigir.
    const isPromotion = candidates.some((move) => move.promotion)
    const promotion = isPromotion ? 'q' : undefined

    handleSquareClick(square, promotion)
  }

  // Verificar presença online dos jogadores
  const isWhiteOnline = presenceUsers.some((u) => u.id === dbGame?.white_id)
  const isBlackOnline = presenceUsers.some((u) => u.id === dbGame?.black_id)

  if (!dbGame) {
    return <div className="online-loading">Carregando sala de jogo...</div>
  }

  return (
    <div className="online-game-container">
      <div className="online-game-header">
        <button type="button" className="back-lobby-btn" onClick={() => navigate('/lobby')}>
          <ArrowLeft size={16} />
          Voltar ao Lobby
        </button>
        <div>
          <h1>Partida Online</h1>
          <p className="subtitle">ID: {gameId}</p>
        </div>
      </div>

      <div className="online-layout">
        
        {/* Lado Esquerdo: Tabuleiro de Xadrez */}
        <div className="board-section-wrapper">
          
          <div className="game-controls">
            <button
              type="button"
              className="resign-btn"
              onClick={resign}
              disabled={dbGame.status !== 'playing' || !playerColor}
            >
              <ShieldAlert size={16} />
              Desistir
            </button>
            <div className="role-indicator">
              {playerColor ? (
                <span>Você joga de <strong>{playerColor === 'w' ? 'Brancas' : 'Pretas'}</strong></span>
              ) : (
                <span className="spectator-label">Modo: <strong>Espectador</strong></span>
              )}
            </div>
          </div>

          <div className="board-grid-wrapper">
            {/* Oponente no topo do tabuleiro */}
            <div className="player-bar opponent">
              <div className="player-bar-info">
                <span className={`connection-dot ${isFlipped ? (isWhiteOnline ? 'online' : 'offline') : (isBlackOnline ? 'online' : 'offline')}`}></span>
                <strong>
                  {isFlipped ? dbGame.white_name || 'Aguardando...' : dbGame.black_name || 'Aguardando...'}
                </strong>
              </div>
              <div className={`time-clock ${turn !== playerColor && dbGame.status === 'playing' ? 'active' : ''}`}>
                <Clock size={14} />
                <strong>{isFlipped ? formatTime(whiteTime) : formatTime(blackTime)}</strong>
              </div>
            </div>

            {/* A Grade do Tabuleiro */}
            <div className="board-panel">
              <div className="board-grid">
                {boardRows.map((rank, rankIndex) => (
                  <div key={rankIndex} className="board-row">
                    {rank.map((cell, cellIndex) => {
                      const isDark = (rankIndex + cellIndex) % 2 === 1
                      const isSelected = selectedSquare === cell.square
                      const isLegal = legalSquares.includes(cell.square)

                      // Coordenadas visuais para animação
                      const fileIndex = cell.square.charCodeAt(0) - 97
                      const rankNum = parseInt(cell.square[1], 10)
                      const visualCol = isFlipped ? 7 - fileIndex : fileIndex
                      const visualRow = isFlipped ? rankNum - 1 : 8 - rankNum

                      // Calcular slide do último lance
                      const lastMove = dbGame.moves && dbGame.moves.length > 0
                        ? dbGame.moves[dbGame.moves.length - 1]
                        : null
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
                      const pieceKey = cell.piece ? `${cell.square}-${cell.piece.color}${cell.piece.type}-${dbGame.moves?.length || 0}` : cell.square

                      return (
                        <button
                          key={cell.square}
                          type="button"
                          className={`square ${isDark ? 'dark' : 'light'} ${
                            isSelected ? 'selected' : ''
                          } ${isLegal ? 'legal' : ''} ${isCapture ? 'legal-capture' : ''}`}
                          onClick={() => handleBoardSquareClick(cell.square)}
                          disabled={!isMyTurn}
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
              </div>
            </div>

            {/* Jogador local no rodapé do tabuleiro */}
            <div className="player-bar local">
              <div className="player-bar-info">
                <span className={`connection-dot ${isFlipped ? (isBlackOnline ? 'online' : 'offline') : (isWhiteOnline ? 'online' : 'offline')}`}></span>
                <strong>
                  {isFlipped ? dbGame.black_name || 'Você' : dbGame.white_name || 'Você'}
                </strong>
              </div>
              <div className={`time-clock ${turn === playerColor && dbGame.status === 'playing' ? 'active' : ''}`}>
                <Clock size={14} />
                <strong>{isFlipped ? formatTime(blackTime) : formatTime(whiteTime)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Status da partida e Chat */}
        <div className="side-section-wrapper">
          
          <div className="status-card">
            <h2>Status da Partida</h2>
            <div className="status-content">
              <AlertCircle size={16} className="status-icon" />
              <span>{status}</span>
            </div>
          </div>

          <div className="chat-card">
            <div className="chat-header">
              <MessageSquare size={16} />
              <h3>Bate-papo da Partida</h3>
            </div>

            <div className="chat-messages-container">
              {chatMessages.length === 0 ? (
                <p className="no-messages">Nenhuma mensagem. Diga "Oi" para seu oponente!</p>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isOwn = msg.sender_id === currentUser?.id
                  return (
                    <div key={idx} className={`chat-message ${isOwn ? 'own' : 'other'}`}>
                      <span className="msg-sender">{msg.sender_name}</span>
                      <p className="msg-text">{msg.text}</p>
                    </div>
                  )
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendChat} className="chat-input-form">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                maxLength={120}
              />
              <button type="submit" className="chat-send-btn">
                <Send size={14} />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  )
}
