import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  FiLogIn,
  FiUser,
  FiLock,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiBriefcase
} from 'react-icons/fi';

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
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Header do Login */}
          <div className="login-header">
            <div className="login-logo">
              <FiBriefcase size={40} className="logo-icon" />
              <div className="logo-text">
                <h1>Sistema Ponto</h1>
                <span>Controle de Ponto Eletrônico</span>
              </div>
            </div>
            <p className="login-subtitle">Faça login para acessar o sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                <FiAlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label>
                <FiUser size={18} />
                Usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
                disabled={loading}
                autoFocus
                className="login-input"
              />
            </div>

            <div className="form-group">
              <label>
                <FiLock size={18} />
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                disabled={loading}
                className="login-input"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary login-btn"
              disabled={loading || !username || !password}
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <FiLogIn size={20} />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Footer do Login */}
          <div className="login-footer">
            <div className="feature-list">
              <div className="feature-item">
                <FiClock size={16} />
                <span>Controle de horários</span>
              </div>
              <div className="feature-item">
                <FiUser size={16} />
                <span>Gestão de funcionários</span>
              </div>
              <div className="feature-item">
                <FiBriefcase size={16} />
                <span>Relatórios profissionais</span>
              </div>
            </div>
          </div>
        </div>

        {/* Banner lateral para desktop */}
        <div className="login-banner">
          <div className="banner-content">
            <div className="banner-icon">
              <FiBriefcase size={48} />
            </div>
            <h2>Sistema de Ponto Eletrônico</h2>
            <p>Controle completo de jornada de trabalho com relatórios detalhados e gestão eficiente.</p>
            <div className="banner-features">
              <div className="banner-feature">
                <FiCheckCircle size={20} />
                <span>Registro em tempo real</span>
              </div>
              <div className="banner-feature">
                <FiCheckCircle size={20} />
                <span>Relatórios automáticos</span>
              </div>
              <div className="banner-feature">
                <FiCheckCircle size={20} />
                <span>Controle de horas extras</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;