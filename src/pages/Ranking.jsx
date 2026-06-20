import { useEffect, useState } from 'react'
import { getGlobalRanking } from '../services/dbService'
import ChessPiece from '../components/ChessPiece'
import { Trophy, Medal, Star } from 'lucide-react'
import './Ranking.css'

export default function Ranking() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRanking = async () => {
      try {
        const data = await getGlobalRanking()
        setLeaderboard(data)
      } catch (err) {
        console.error('Erro ao buscar ranking:', err)
      } finally {
        setLoading(false)
      }
    }
    loadRanking()
  }, [])

  if (loading) {
    return <div className="ranking-loading">Carregando classificação global...</div>
  }

  return (
    <div className="ranking-container">
      <div className="ranking-header">
        <Trophy size={40} className="ranking-header-icon" />
        <div>
          <h1>Ranking Global</h1>
          <p className="subtitle">Os melhores enxadristas da plataforma</p>
        </div>
      </div>

      <div className="leaderboard-card">
        {leaderboard.length === 0 ? (
          <div className="no-players">Nenhum jogador registrado no ranking ainda.</div>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="col-rank">Posição</th>
                <th className="col-player">Jogador</th>
                <th className="col-rating">Rating</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((player, index) => {
                const rankNum = index + 1
                let rankBadge = null

                if (rankNum === 1) {
                  rankBadge = <Medal className="medal-gold" size={20} />
                } else if (rankNum === 2) {
                  rankBadge = <Medal className="medal-silver" size={20} />
                } else if (rankNum === 3) {
                  rankBadge = <Medal className="medal-bronze" size={20} />
                } else {
                  rankBadge = <span className="rank-number">{rankNum}</span>
                }

                return (
                  <tr key={player.id} className={`leaderboard-row rank-${rankNum}`}>
                    <td className="col-rank">
                      <div className="rank-cell">
                        {rankBadge}
                      </div>
                    </td>
                    <td className="col-player">
                      <div className="player-cell">
                        {player.avatar ? (
                          <div className="player-avatar-wrapper">
                            <ChessPiece
                              color={player.avatar[0]}
                              type={player.avatar[1].toLowerCase()}
                              className="player-avatar-small"
                            />
                          </div>
                        ) : (
                          <div className="player-avatar-placeholder">?</div>
                        )}
                        <span className="player-name-text">
                          {player.display_name}
                        </span>
                        {rankNum === 1 && <Star className="star-icon" size={14} fill="#fbbf24" color="#fbbf24" />}
                      </div>
                    </td>
                    <td className="col-rating">
                      <div className="rating-cell">
                        <strong>{player.rating}</strong>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
