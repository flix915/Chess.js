import { useState } from 'react'

const pieceUnicodeSymbols = {
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

export default function ChessPiece({ color, type, className = '', style }) {
  const [loadError, setLoadError] = useState(false)
  
  if (!color || !type) return null

  const pieceCode = `${color}${type}`.toLowerCase()
  const unicodeChar = pieceUnicodeSymbols[pieceCode] || ''

  // Lichess cburnett theme URLs: wP, wR, wN, wB, wQ, wK, bP, bR, bN, bB, bQ, bK
  const pieceLetter = type === 'p' ? 'P' : type.toUpperCase()
  const imgUrl = `https://lichess1.org/assets/piece/cburnett/${color}${pieceLetter}.svg`

  if (loadError) {
    return (
      <span className={`piece ${color} ${className}`} style={style} aria-label={pieceCode}>
        {unicodeChar}
      </span>
    )
  }

  return (
    <img
      src={imgUrl}
      alt={pieceCode}
      className={`piece-img ${className}`}
      style={style}
      onError={() => {
        console.warn(`Erro ao carregar peca online: ${imgUrl}. Usando fallback unicode.`)
        setLoadError(true)
      }}
      draggable="false"
    />
  )
}
