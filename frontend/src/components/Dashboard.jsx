import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    todayRecords: 0,
    recentEmployees: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Carregando dashboard...</div>;
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📊 Dashboard</h1>
        <p>Visão geral do sistema</p>
      </div>
      
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

      <div style={{ marginTop: '30px', padding: '20px', background: '#e7f3ff', borderRadius: '10px' }}>
        <h3>💡 Dicas Rápidas</h3>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>Use "Registrar Ponto" para marcar entradas e saídas</li>
          <li>Cadastre funcionários em "Funcionários"</li>
          <li>Gere relatórios em PDF e Excel em "Relatórios"</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;