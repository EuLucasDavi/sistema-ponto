import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {FiBarChart} from 'react-icons/fi';

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
          <h1><FiBarChart size={20} /> Dashboard Administrativo</h1>
          <p>Visão geral do sistema</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total de Funcionários</h3>
            <div className="stat-number">{stats.totalEmployees}</div>
            <p>Funcionários cadastrados</p>
          </div>
          
          <div className="stat-card">
            <h3>Registros Hoje</h3>
            <div className="stat-number">{stats.todayRecords}</div>
            <p>Pontos registrados hoje</p>
          </div>
        </div>

        <div className="recent-section">
          <h2>👥 Funcionários Recentes</h2>
          <div className="recent-list">
            {stats.recentEmployees && stats.recentEmployees.length > 0 ? (
              stats.recentEmployees.map(employee => (
                <div key={employee._id} className="recent-item">
                  <strong>{employee.name}</strong>
                  <span>{employee.department}</span>
                  <small>
                    Admitido em {new Date(employee.hire_date).toLocaleDateString('pt-BR')}
                  </small>
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
          <h3>💡 Ações Rápidas</h3>
          <div className="quick-actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/employees')}
            >
              👥 Gerenciar Funcionários
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/users')}
            >
              👤 Gerenciar Usuários
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/reports')}
            >
              📈 Gerar Relatórios
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
        <h1>👋 Meu Resumo</h1>
        <p>Bem-vindo de volta!</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {stats?.employee ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Registros Hoje</h3>
              <div className="stat-number">{stats.todayRecords}</div>
              <p>Pontos registrados hoje</p>
            </div>
            
            <div className="stat-card">
              <h3>Status</h3>
              <div className="stat-number">
                {stats.todayRecords > 0 ? '✅ Ativo' : '⏳ Pendente'}
              </div>
              <p>Hoje</p>
            </div>
          </div>

          <div className="employee-info-card">
            <h2>{stats.employee.name}</h2>
            <p><strong>Departamento:</strong> {stats.employee.department}</p>
            <p><strong>Salário:</strong> R$ {parseFloat(stats.employee.salary).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
          </div>

          <div className="quick-actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/my-time')}
            >
              ⏰ Registrar Meu Ponto
            </button>
          </div>

          <div className="recent-section">
            <h3>📋 Meus Últimos Registros</h3>
            <div className="recent-list">
              {stats.recentRecords && stats.recentRecords.length > 0 ? (
                stats.recentRecords.map(record => (
                  <div key={record._id} className="recent-item">
                    <div>
                      <strong>
                        {new Date(record.timestamp).toLocaleDateString('pt-BR')} - 
                        {new Date(record.timestamp).toLocaleTimeString('pt-BR')}
                      </strong>
                    </div>
                    <span className={`record-type ${record.type}`}>
                      {record.type === 'entry' ? '🟢 ENTRADA' : '🔴 SAÍDA'}
                    </span>
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
        <div className="info-card">
          <h3>⚠️ Funcionário Não Vinculado</h3>
          <p>Seu usuário não está vinculado a um funcionário. Entre em contato com o administrador.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;