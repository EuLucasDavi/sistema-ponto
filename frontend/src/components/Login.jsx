import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, user, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!username || !password) {
      return;
    }

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>🔐 Login</h1>
        <p className="login-subtitle">Sistema de Ponto Eletrônico</p>
        
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <div className="form-group">
          <label>Usuário:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Digite seu usuário"
            required
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Senha:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            required
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary login-btn"
          disabled={loading || !username || !password}
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </button>
      </form>
    </div>
  );
};

export default Login;