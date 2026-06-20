import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getGameRecord } from '../services/dbService'
import ChessPiece from '../components/ChessPiece'
import { Chess } from 'chess.js'
import stockfishUrl from 'stockfish.js/stockfish.wasm.js?url'
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCw, Cpu, Award } from 'lucide-react'
import './Replay.css'

export default function Replay() {
  const { gameId } = useParams()
  const navigate = useNavigate()

  const [gameRecord, setGameRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  // IA Stockfish states
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [bestMoveSuggestion, setBestMoveSuggestion] = useState('')
  const stockfishRef = useRef(null)

  // Carregar registro da partida
  useEffect(() => {
    const loadGame = async () => {
      try {
        const record = await getGameRecord(gameId)
        setGameRecord(record)
      } catch (err) {
        console.error('Erro ao carregar partida de replay:', err)
      } finally {
        setLoading(false)
      }
    }
    loadGame()
  }, [gameId])

  // Gerar histórico de FENs e lances estruturados
  const { fens, parsedMoves } = useMemo(() => {
    if (!gameRecord || !gameRecord.moves) {
      return { fens: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'], parsedMoves: [] }
    }

    const tempGame = new Chess()
    const fenList = [tempGame.fen()]
    const movesList = []

    for (const rawMove of gameRecord.moves) {
      try {
        const moveDetails = tempGame.move(rawMove)
        if (moveDetails) {
          fenList.push(tempGame.fen())
          movesList.push({
            san: rawMove,
            from: moveDetails.from,
            to: moveDetails.to,
            color: moveDetails.color,
          })
        }
      } catch (e) {
        console.error('Erro ao parsing move:', rawMove, e)
      }
    }

    return { fens: fenList, parsedMoves: movesList }
  }, [gameRecord])

  // Obter FEN atual
  const currentFen = useMemo(() => {
    return fens[currentMoveIndex] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  }, [fens, currentMoveIndex])

  // Instanciar jogo para visualização
  const viewChess = useMemo(() => {
    return new Chess(currentFen)
  }, [currentFen])

  // Gerar linhas do tabuleiro visual
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
        const piece = viewChess.get(square)
        squares.push({ square, piece })
      }
      rows.push(squares)
    }

    return rows
  }, [viewChess, isFlipped])

  // Limpar análise da IA ao mudar de lance
  useEffect(() => {
    setBestMoveSuggestion('')
  }, [currentMoveIndex])

  // Limpeza do worker do Stockfish
  useEffect(() => {
    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate()
        stockfishRef.current = null
      }
    }
  }, [])

  // Solicitar análise da IA para a posição atual
  const handleAnalyzePosition = () => {
    if (aiAnalyzing) return

    setAiAnalyzing(true)
    setBestMoveSuggestion('')

    try {
      if (stockfishRef.current) {
        stockfishRef.current.terminate()
      }

      const worker = new Worker(stockfishUrl, { type: 'classic' })
      stockfishRef.current = worker

      worker.onmessage = (event) => {
        const message = event.data
        if (typeof message === 'string' && message.startsWith('bestmove')) {
          const parts = message.split(' ')
          const move = parts[1]
          setBestMoveSuggestion(move)
          setAiAnalyzing(false)
          worker.terminate()
          stockfishRef.current = null
        }
      }

      worker.postMessage('uci')
      worker.postMessage('isready')
      worker.postMessage(`position fen ${currentFen}`)
      // Ir rápido para retorno quase imediato
      worker.postMessage('go movetime 1500')
    } catch (error) {
      console.error('Falha ao analisar com Stockfish:', error)
      setAiAnalyzing(false)
    }
  }

  // Agrupar movimentos em pares de jogadas (Brancas e Pretas)
  const groupedMoves = useMemo(() => {
    const groups = []
    for (let i = 0; i < parsedMoves.length; i += 2) {
      groups.push({
        num: Math.floor(i / 2) + 1,
        white: { index: i + 1, san: parsedMoves[i].san },
        black: parsedMoves[i + 1] ? { index: i + 2, san: parsedMoves[i + 1].san } : null,
      })
    }
    return groups
  }, [parsedMoves])

  if (loading) {
    return <div className="replay-loading">Carregando análise da partida...</div>
  }

  if (!gameRecord) {
    return (
      <div className="replay-error">
        <p>Partida não encontrada.</p>
        <button type="button" onClick={() => navigate('/profile')}>Voltar</button>
      </div>
    )
  }

  // Verificar se há lances destacados para pintar no tabuleiro
  const lastPlayedMove = currentMoveIndex > 0 ? parsedMoves[currentMoveIndex - 1] : null

  return (
    <div className="replay-container">
      <div className="replay-header">
        <button type="button" className="back-profile-btn" onClick={() => navigate('/profile')}>
          <ArrowLeft size={16} />
          Voltar ao Perfil
        </button>
        <div>
          <h1>Análise da Partida</h1>
          <p className="subtitle">
            Você contra <strong>{gameRecord.opponent_name || 'IA'}</strong>
          </p>
        </div>
      </div>

      <div className="replay-layout">
        
        {/* Lado Esquerdo: Tabuleiro de visualização */}
        <div className="board-section-wrapper">
          
          <div className="board-toolbar">
            <button type="button" className="toolbar-btn" onClick={() => setIsFlipped(!isFlipped)}>
              <RotateCw size={14} />
              Girar Tabuleiro
            </button>
            <span className="current-move-badge">
              Lance: {currentMoveIndex} / {parsedMoves.length}
            </span>
          </div>

          <div className="board-panel">
            <div className="board-grid">
              {boardRows.map((rank, rankIndex) => (
                <div key={rankIndex} className="board-row">
                  {rank.map((cell, cellIndex) => {
                    const isDark = (rankIndex + cellIndex) % 2 === 1
                    
                    // Destacar origem e destino do último lance jogado
                    const isSourceHighlight = lastPlayedMove && lastPlayedMove.from === cell.square
                    const isTargetHighlight = lastPlayedMove && lastPlayedMove.to === cell.square

                    return (
                      <div
                        key={cell.square}
                        className={`square ${isDark ? 'dark' : 'light'} ${
                          isSourceHighlight ? 'highlight-src' : ''
                        } ${isTargetHighlight ? 'highlight-dst' : ''}`}
                      >
                        <span className="square-label">{cell.square}</span>
                        {cell.piece && (
                          <ChessPiece
                            color={cell.piece.color}
                            type={cell.piece.type}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Controles de Navegação */}
          <div className="navigation-controls">
            <button
              type="button"
              onClick={() => setCurrentMoveIndex(0)}
              disabled={currentMoveIndex === 0}
              title="Início"
            >
              <ChevronsLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMoveIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentMoveIndex === 0}
              title="Anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMoveIndex((prev) => Math.min(parsedMoves.length, prev + 1))}
              disabled={currentMoveIndex === parsedMoves.length}
              title="Próximo"
            >
              <ChevronRight size={20} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMoveIndex(parsedMoves.length)}
              disabled={currentMoveIndex === parsedMoves.length}
              title="Fim"
            >
              <ChevronsRight size={20} />
            </button>
          </div>

        </div>

        {/* Lado Direito: Metadata, Lances e IA */}
        <div className="side-section-wrapper">
          
          {/* Resultados e Info da Partida */}
          <div className="meta-card">
            <div className="card-header-icon">
              <Award size={18} />
              <h3>Resultado da Partida</h3>
            </div>
            <div className="meta-details">
              <p>Oponente: <strong>{gameRecord.opponent_name || 'Computador'}</strong></p>
              <p>Seu Resultado: <strong className={`res-${gameRecord.result}`}>{
                gameRecord.result === 'win' ? 'Vitória' : gameRecord.result === 'loss' ? 'Derrota' : 'Empate'
              }</strong></p>
              <p>Número de Lances: <strong>{parsedMoves.length}</strong></p>
            </div>
          </div>

          {/* Análise de Jogadas com IA (Stockfish) */}
          <div className="ai-analysis-card">
            <button
              type="button"
              className="analyze-btn"
              onClick={handleAnalyzePosition}
              disabled={aiAnalyzing}
            >
              <Cpu size={16} />
              {aiAnalyzing ? 'Analisando...' : 'Sugerir Melhor Jogada'}
            </button>

            {bestMoveSuggestion && (
              <div className="ai-result-box">
                <span className="ai-label">Recomendação Stockfish:</span>
                <p>O melhor lance nesta posição é <strong>{bestMoveSuggestion}</strong>.</p>
              </div>
            )}
          </div>

          {/* Lista de Movimentos */}
          <div className="moves-list-card">
            <h3>Lista de Lances</h3>
            <div className="moves-scroll-container">
              {groupedMoves.length === 0 ? (
                <p className="no-moves-msg">Nenhum lance foi efetuado.</p>
              ) : (
                groupedMoves.map((group) => {
                  const isWhiteActive = currentMoveIndex === group.white.index
                  const isBlackActive = group.black && currentMoveIndex === group.black.index

                  return (
                    <div key={group.num} className="moves-row">
                      <span className="move-number">{group.num}.</span>
                      <button
                        type="button"
                        className={`move-btn ${isWhiteActive ? 'active' : ''}`}
                        onClick={() => setCurrentMoveIndex(group.white.index)}
                      >
                        {group.white.san}
                      </button>
                      {group.black && (
                        <button
                          type="button"
                          className={`move-btn ${isBlackActive ? 'active' : ''}`}
                          onClick={() => setCurrentMoveIndex(group.black.index)}
                        >
                          {group.black.san}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
