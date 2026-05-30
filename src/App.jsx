import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Game from './pages/Game'
import Auth from './pages/Auth'
import { listenAuthState, logoutUser } from './services/authService'
import { LogOut, User as UserIcon } from 'lucide-react'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <div className="loading-screen">Carregando...</div>
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <Link to="/" className="app-logo">Enxadrista</Link>
          <nav className="app-nav">
            <Link to="/">Início</Link>
            <Link to="/game">Jogar</Link>
            {user ? (
              <div className="user-menu">
                <span className="user-name">
                  <UserIcon size={16} />
                  {user.user_metadata?.display_name || user.email}
                </span>
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
                  <div>
                    <span className="eyebrow">Projeto de Xadrez</span>
                    <h1>Aprenda xadrez com um tabuleiro local</h1>
                    <p>
                      Um projeto completo de xadrez feito com React.
                    </p>
                    <Link className="primary-button" to="/game">
                      Jogar agora
                    </Link>
                  </div>
                </section>
              }
            />
            <Route path="/game" element={<Game />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
