import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  FiBarChart2,
  FiUsers,
  FiUser,
  FiFileText,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiHome,
  FiSettings,
  FiArrowRight,
  FiCalendar,
  FiDollarSign,
  FiTrendingUp
} from 'react-icons/fi';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setError('');
      const response = await axios.get('/api/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      setError('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  if (user?.role === 'admin') {
    return (
      <div className="container">
        <div className="header">
          <div className="header-title">
            <FiBarChart2 size={32} className="header-icon" />
            <div>
              <h1>Dashboard Administrativo</h1>
              <p>Visão geral do sistema</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <FiAlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FiUsers size={24} />
            </div>
            <h3>Total de Funcionários</h3>
            <div className="stat-number">{stats.totalEmployees}</div>
            <p>Funcionários cadastrados</p>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <FiClock size={24} />
            </div>
            <h3>Registros Hoje</h3>
            <div className="stat-number">{stats.todayRecords}</div>
            <p>Pontos registrados hoje</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FiTrendingUp size={24} />
            </div>
            <h3>Ativos Hoje</h3>
            <div className="stat-number">{stats.activeToday || 0}</div>
            <p>Funcionários ativos</p>
          </div>
        </div>

        <div className="recent-section">
          <div className="section-header">
            <FiUsers size={24} />
            <h2>Funcionários Recentes</h2>
          </div>
          <div className="recent-list">
            {stats.recentEmployees && stats.recentEmployees.length > 0 ? (
              stats.recentEmployees.map(employee => (
                <div key={employee._id} className="recent-item">
                  <div className="recent-item-content">
                    <div className="recent-item-main">
                      <strong>{employee.name}</strong>
                      <span>{employee.department}</span>
                    </div>
                    <small>
                      <FiCalendar size={14} />
                      Admitido em {new Date(employee.hire_date).toLocaleDateString('pt-BR')}
                    </small>
                  </div>
                  <FiArrowRight size={16} className="recent-item-arrow" />
                </div>
              ))
            ) : (
              <div className="recent-item">
                <span>Nenhum funcionário cadastrado ainda</span>
              </div>
            )}
          </div>
        </div>

        <div className="info-card">
          <div className="section-header">
            <FiSettings size={24} />
            <h3>Ações Rápidas</h3>
          </div>
          <div className="quick-actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/employees')}
            >
              <FiUsers size={18} />
              <span>Gerenciar Funcionários</span>
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/users')}
            >
              <FiUser size={18} />
              <span>Gerenciar Usuários</span>
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/reports')}
            >
              <FiFileText size={18} />
              <span>Gerar Relatórios</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard para funcionários
  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiHome size={32} className="header-icon" />
          <div>
            <h1>Meu Resumo</h1>
            <p>Bem-vindo de volta!</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <FiAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {stats?.employee ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <FiClock size={24} />
              </div>
              <h3>Registros Hoje</h3>
              <div className="stat-number">{stats.todayRecords}</div>
              <p>Pontos registrados hoje</p>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                {stats.todayRecords > 0 ? (
                  <FiCheckCircle size={24} color="#28a745" />
                ) : (
                  <FiClock size={24} color="#ffc107" />
                )}
              </div>
              <h3>Status</h3>
              <div className="stat-number status-indicator">
                {stats.todayRecords > 0 ? 'Ativo' : 'Pendente'}
              </div>
              <p>Hoje</p>
            </div>
          </div>

          <div className="employee-info-card">
            <div className="section-header">
              <FiUser size={24} />
              <h2>{stats.employee.name}</h2>
            </div>
            <div className="employee-details">
              <p>
                <strong>Departamento:</strong> 
                <span>{stats.employee.department}</span>
              </p>
              <p>
                <strong>Salário:</strong>
                <span>
                  <FiDollarSign size={14} />
                  R$ {parseFloat(stats.employee.salary).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </span>
              </p>
            </div>
          </div>

          <div className="quick-actions">
            <button 
              className="btn btn-primary btn-large"
              onClick={() => navigate('/my-time')}
            >
              <FiClock size={20} />
              <span>Registrar Meu Ponto</span>
            </button>
          </div>

          <div className="recent-section">
            <div className="section-header">
              <FiFileText size={24} />
              <h3>Meus Últimos Registros</h3>
            </div>
            <div className="recent-list">
              {stats.recentRecords && stats.recentRecords.length > 0 ? (
                stats.recentRecords.map(record => (
                  <div key={record._id} className="recent-item">
                    <div className="recent-item-content">
                      <div className="recent-item-main">
                        <strong>
                          {new Date(record.timestamp).toLocaleDateString('pt-BR')} - 
                          {new Date(record.timestamp).toLocaleTimeString('pt-BR')}
                        </strong>
                        <span className={`record-type ${record.type}`}>
                          {record.type === 'entry' ? (
                            <>
                              <FiCheckCircle size={14} />
                              ENTRADA
                            </>
                          ) : (
                            <>
                              <FiAlertCircle size={14} />
                              SAÍDA
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="recent-item">
                  <span>Nenhum registro encontrado hoje</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="info-card error-card">
          <div className="section-header">
            <FiAlertCircle size={24} color="#dc3545" />
            <h3>Funcionário Não Vinculado</h3>
          </div>
          <p>Seu usuário não está vinculado a um funcionário. Entre em contato com o administrador.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;