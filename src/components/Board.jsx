import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'

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
  const [fen, setFen] = useState(new Chess().fen())
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [legalSquares, setLegalSquares] = useState([])
  const [history, setHistory] = useState([])

  const game = useMemo(() => new Chess(fen), [fen])

  const status = useMemo(() => {
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
  }, [game])

  function handleSquareClick(square) {
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
        setSelectedSquare(null)
        setLegalSquares([])
        setFen(game.fen())
        setHistory(prev => [...prev, move])
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
          <div className="status-card">
            <h2>Status</h2>
            <p>{status}</p>
          </div>

          <div className="history-card">
            <h2>Histórico</h2>
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
        </section>
      </div>
    </div>
  )
}
