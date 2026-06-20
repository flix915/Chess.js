import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Game from './pages/Game'
import Auth from './pages/Auth'
import Lobby from './pages/Lobby'
import OnlineGame from './pages/OnlineGame'
import Profile from './pages/Profile'
import Ranking from './pages/Ranking'
import Replay from './pages/Replay'
import { listenAuthState, logoutUser } from './services/authService'
import { LogOut, User as UserIcon, Sun, Moon, Trophy, Users, Play, Award } from 'lucide-react'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    const unsubscribe = listenAuthState((sessionUser) => {
      setUser(sessionUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch (err) {
      console.error('Erro ao sair', err)
    }
  }

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      return next
    })
  }

  if (loading) {
    return <div className="loading-screen">Carregando...</div>
  }

  return (
    <BrowserRouter>
      <div className={`app-shell ${theme}`}>
        <header className="app-header">
          <Link to="/" className="app-logo">Enxadrista</Link>
          <nav className="app-nav">
            <Link to="/">Início</Link>
            <Link to="/game">Jogar Local</Link>
            <Link to="/lobby">Online PvP</Link>
            <Link to="/ranking">Ranking</Link>
            
            <button onClick={toggleTheme} className="theme-toggle-btn" title="Alternar Tema">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <div className="user-menu">
                <Link to="/profile" className="user-name">
                  <UserIcon size={16} />
                  {user.user_metadata?.display_name || user.email}
                </Link>
                <button onClick={handleLogout} className="logout-btn" title="Sair">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="login-btn">Entrar</Link>
            )}
          </nav>
        </header>

        <main className="app-main">
          <Routes>
            <Route
              path="/"
              element={
                <section className="home-panel">
                  <div className="home-hero">
                    <span className="eyebrow">Plataforma Enxadrista</span>
                    <h1>Desenvolva sua mente jogando Xadrez</h1>
                    <p>
                      Desafie computadores inteligentes, jogue com amigos localmente ou dispute partidas online em tempo real no nosso servidor.
                    </p>
                  </div>

                  <div className="mode-cards-container">
                    <div className="mode-card">
                      <div className="mode-card-icon-wrapper local">
                        <Play size={24} />
                      </div>
                      <h3>Jogar Local</h3>
                      <p>Jogue contra o Stockfish em várias dificuldades ou chame um amigo para jogar no mesmo PC.</p>
                      <Link className="mode-card-link" to="/game">Iniciar Local</Link>
                    </div>

                    <div className="mode-card">
                      <div className="mode-card-icon-wrapper online">
                        <Users size={24} />
                      </div>
                      <h3>Multiplayer Online</h3>
                      <p>Entre no lobby de partidas e desafie enxadristas de qualquer lugar com chat em tempo real.</p>
                      <Link className="mode-card-link primary" to="/lobby">Entrar no Lobby</Link>
                    </div>

                    <div className="mode-card">
                      <div className="mode-card-icon-wrapper ranking">
                        <Trophy size={24} />
                      </div>
                      <h3>Classificação Global</h3>
                      <p>Suba seu rating no ranking global vencendo partidas e dispute a liderança geral.</p>
                      <Link className="mode-card-link" to="/ranking">Ver Leaderboard</Link>
                    </div>
                  </div>
                </section>
              }
            />
            <Route path="/game" element={<Game user={user} />} />
            <Route path="/lobby" element={<Lobby user={user} />} />
            <Route path="/game/online/:gameId" element={<OnlineGame user={user} />} />
            <Route path="/profile" element={<Profile user={user} />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/replay/:gameId" element={<Replay />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
