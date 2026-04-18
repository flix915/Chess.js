import Board from '../components/Board'

export default function Game() {
  return (
    <div className="game-page">
      <div className="game-header">
        <div>
          <p className="eyebrow">Jogo local</p>
          <br />
          <h1>Chess.js</h1>
          <br />
          <p className="subtitle">
           É proibido vencer :3
          </p>
        </div>
      </div>
      <Board />
    </div>
  )
}
