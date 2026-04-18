import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Game from './pages/Game'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">Enxadrista</div>
          <nav className="app-nav">
            <Link to="/">Início</Link>
            <Link to="/game">Jogar</Link>
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
                     .
                    </p>
                    <Link className="primary-button" to="/game">
                      Jogar agora
                    </Link>
                  </div>
                </section>
              }
            />
            <Route path="/game" element={<Game />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
