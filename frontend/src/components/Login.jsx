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
  FiBriefcase,
  FiTrendingUp
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
        {/* Card de Login */}
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <div className="logo-icon-wrapper">
                <FiBriefcase size={32} />
              </div>
              <div className="logo-text">
                <h1>Ponto Max</h1>
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
              <div className="input-wrapper">
                <FiUser size={20} className="input-icon" />
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
            </div>

            <div className="form-group">
              <div className="input-wrapper">
                <FiLock size={20} className="input-icon" />
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

          <div className="login-footer">
            <div className="feature-grid">
              <div className="feature-item">
                <div className="feature-icon">
                  <FiClock size={18} />
                </div>
                <span>Controle de horários</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <FiUser size={18} />
                </div>
                <span>Gestão de funcionários</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <FiTrendingUp size={18} />
                </div>
                <span>Relatórios profissionais</span>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Informativo */}
        <div className="login-banner">
          <div className="banner-content">
            <div className="banner-header">
              <div className="banner-icon">
                <FiBriefcase size={48} />
              </div>
              <h2>Gestão Completa do Seu Time</h2>
            </div>
            <p>Controle total da jornada de trabalho com relatórios detalhados e gestão eficiente.</p>
            
            <div className="banner-features">
              <div className="banner-feature">
                <FiCheckCircle size={20} className="feature-check" />
                <div>
                  <strong>Registro em tempo real</strong>
                  <span>Controle preciso de entradas e saídas</span>
                </div>
              </div>
              <div className="banner-feature">
                <FiCheckCircle size={20} className="feature-check" />
                <div>
                  <strong>Relatórios automáticos</strong>
                  <span>PDF e Excel com cálculos automáticos</span>
                </div>
              </div>
              <div className="banner-feature">
                <FiCheckCircle size={20} className="feature-check" />
                <div>
                  <strong>Controle de horas extras</strong>
                  <span>Gestão completa da jornada</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;