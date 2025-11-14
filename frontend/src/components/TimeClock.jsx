import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiUsers,
  FiCalendar,
  FiWatch
} from 'react-icons/fi';

const TimeClock = () => {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ totalEmployees: 0, todayRecords: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [employeesRes, statsRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/dashboard/stats')
      ]);

      setEmployees(employeesRes.data);
      
      if (statsRes.data.role === 'admin') {
        setStats({
          totalEmployees: statsRes.data.totalEmployees,
          todayRecords: statsRes.data.todayRecords
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiClock size={32} className="header-icon" />
          <div>
            <h1>Painel de Controle</h1>
            <p>Visão geral do sistema de ponto</p>
          </div>
        </div>
      </div>

      <div className="time-clock-container">
        <div className="time-clock-card">
          {/* Relógio em tempo real */}
          <div className="current-time">
            <FiWatch size={24} />
            <div className="time-display">
              {currentTime.toLocaleTimeString('pt-BR')}
            </div>
            <div className="date-display">
              {currentTime.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </div>
          </div>

          <div className="info-card">
            <div className="section-header">
              <FiInfo size={20} />
              <h4>Informações do Sistema</h4>
            </div>
            <p>
              Esta tela agora é apenas para visualização. Para registrar pontos, 
              os funcionários devem usar seus próprios painéis.
            </p>
            <p>
              Utilize o menu "Solicitações" para aprovar solicitações de 
              ausência e registro de ponto dos funcionários.
            </p>
          </div>
        </div>

        {/* Card de estatísticas */}
        <div className="stats-sidebar">
          <div className="stat-card">
            <div className="stat-icon">
              <FiUsers size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalEmployees}</div>
              <div className="stat-label">Funcionários</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FiClock size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.todayRecords}</div>
              <div className="stat-label">Registros Hoje</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FiCalendar size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-number">
                {employees.filter(emp => {
                  const hireDate = new Date(emp.hire_date);
                  const today = new Date();
                  return hireDate.toDateString() === today.toDateString();
                }).length}
              </div>
              <div className="stat-label">Aniversariantes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeClock;