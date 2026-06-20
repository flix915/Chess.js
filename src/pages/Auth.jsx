import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, logoutUser } from '../services/authService';
import { saveUserProfile } from '../services/dbService';
import { User, Lock, Mail, ChevronRight, AlertCircle } from 'lucide-react';
import './Auth.css';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Wipar sessão ativa anterior se houver
      try {
        await logoutUser();
      } catch (err) {
        // Ignorar se não havia usuário logado
      }

      if (isLogin) {
        await loginUser(email, password);
        navigate('/');
      } else {
        if (!displayName) {
          throw new Error('O nome é obrigatório para cadastro.');
        }
        const user = await registerUser(email, password, displayName);
        await saveUserProfile(user.id, {
          email: user.email,
          displayName: displayName,
        });
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
          <p>{isLogin ? 'Entre para continuar seu progresso' : 'Junte-se a nós e comece a jogar'}</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <label htmlFor="displayName">Nome</label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input
                  id="displayName"
                  type="text"
                  placeholder="Seu nome"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">E-mail</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Senha</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Cadastrar'}
            {!loading && <ChevronRight size={20} />}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            <button
              type="button"
              className="toggle-auth-mode"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
