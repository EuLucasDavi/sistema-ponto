import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    todayRecords: 0,
    recentEmployees: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        <div className="loading">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📊 Dashboard</h1>
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
          {stats.recentEmployees.length > 0 ? (
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
        <h3>💡 Dicas Rápidas</h3>
        <ul>
          <li>Use "Registrar Ponto" para marcar entradas e saídas</li>
          <li>Cadastre funcionários em "Funcionários"</li>
          <li>Gere relatórios em PDF e Excel em "Relatórios"</li>
          <li>Verifique o console (F12) para debug</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;