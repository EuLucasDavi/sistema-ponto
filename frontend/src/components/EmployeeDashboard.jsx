import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiUser,
  FiClock,
  FiCalendar,
  FiBriefcase,
  FiLogIn,
  FiLogOut,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiArrowRight,
  FiHome,
  FiTrendingUp,
  FiPauseCircle
} from 'react-icons/fi';

const EmployeeDashboard = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [todayRecords, setTodayRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [lastRecord, setLastRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchEmployeeData();
    fetchRecentRecords();
    
    // Atualizar horário em tempo real
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchEmployeeData = async () => {
    try {
      setError('');
      const response = await axios.get('/api/dashboard/stats');
      
      if (response.data.role === 'employee') {
        setEmployeeData(response.data.employee);
        setTodayRecords(response.data.todayRecords);
        setRecentRecords(response.data.recentRecords || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do funcionário:', error);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentRecords = async () => {
    try {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const response = await axios.get('/api/me/time-records', {
        params: {
          start_date: firstDay.toISOString().split('T')[0],
          end_date: lastDay.toISOString().split('T')[0]
        }
      });
      setRecentRecords(response.data);
    } catch (error) {
      console.error('Erro ao buscar registros:', error);
    }
  };

  const registerTime = async (type) => {
    setRegisterLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/me/time-records', { type });
      
      // Atualizar dados
      await fetchEmployeeData();
      await fetchRecentRecords();
      
      // Mostrar último registro
      setLastRecord({
        type,
        timestamp: new Date().toLocaleString('pt-BR'),
        employee: employeeData?.name
      });
      
    } catch (error) {
      console.error('Erro ao registrar ponto:', error);
      setError(error.response?.data?.error || 'Erro ao registrar ponto');
    } finally {
      setRegisterLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Carregando seus dados...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiHome className="header-icon" size={32} />
          <div>
            <h1>Meu Painel</h1>
            <p className="text-muted">Controle seus registros de ponto</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <FiAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {employeeData ? (
        <>
          {/* Grid de Estatísticas */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <FiUser size={24} />
              </div>
              <h3>Funcionário</h3>
              <div className="stat-number">{employeeData.name.split(' ')[0]}</div>
              <p>Seu perfil ativo</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FiBriefcase size={24} />
              </div>
              <h3>Departamento</h3>
              <div className="stat-number">{employeeData.department}</div>
              <p>Área de atuação</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FiClock size={24} />
              </div>
              <h3>Registros Hoje</h3>
              <div className="stat-number">{todayRecords}</div>
              <p>Pontos registrados hoje</p>
            </div>
          </div>

          {/* Time Clock */}
          <div className="time-clock-container">
            <div className="time-clock-card">
              <div className="current-time">
                <div className="date-display">
                  {currentTime.toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="time-display">
                  {currentTime.toLocaleTimeString('pt-BR')}
                </div>
              </div>

              <div className="time-buttons">
                <button 
                  className="btn btn-success btn-large"
                  onClick={() => registerTime('entry')}
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <FiLogIn size={20} />
                      <span>Registrar Entrada</span>
                    </>
                  )}
                </button>
                
                <button 
                  className="btn btn-warning btn-large"
                  onClick={() => registerTime('pause')}
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <FiPauseCircle size={20} />
                      <span>Registrar Pausa</span>
                    </>
                  )}
                </button>
                
                <button 
                  className="btn btn-danger btn-large"
                  onClick={() => registerTime('exit')}
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <FiLogOut size={20} />
                      <span>Registrar Saída</span>
                    </>
                  )}
                </button>
              </div>

              {lastRecord && (
                <div className="last-record-card">
                  <div className="section-header">
                    <FiCheckCircle size={20} />
                    <h4>Último Registro Confirmado</h4>
                  </div>
                  <div className="record-details">
                    <div className="record-item">
                      <div>
                        <strong>Tipo</strong>
                        <span className={`record-type ${lastRecord.type}`}>
                          {lastRecord.type === 'entry' ? 'Entrada' : 
                           lastRecord.type === 'pause' ? 'Pausa' : 'Saída'}
                        </span>
                      </div>
                    </div>
                    <div className="record-item">
                      <div>
                        <strong>Horário</strong>
                        <span>{lastRecord.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="stats-sidebar">
              <div className="stat-card">
                <div className="stat-icon">
                  <FiTrendingUp size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{todayRecords}</div>
                  <div className="stat-label">Registros Hoje</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FiCalendar size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{recentRecords.length}</div>
                  <div className="stat-label">Registros Este Mês</div>
                </div>
              </div>
            </div>
          </div>

          {/* Registros Recentes */}
          <div className="recent-section">
            <div className="section-header">
              <FiClock size={24} />
              <h3>Meus Últimos Registros</h3>
            </div>
            <div className="recent-list">
              {recentRecords.length > 0 ? (
                recentRecords.slice(0, 5).map(record => (
                  <div key={record._id} className="recent-item">
                    <div className="recent-item-content">
                      <div className="recent-item-main">
                        <div>
                          <strong>
                            {new Date(record.timestamp).toLocaleDateString('pt-BR')}
                          </strong>
                          <span> às </span>
                          <strong>
                            {new Date(record.timestamp).toLocaleTimeString('pt-BR')}
                          </strong>
                        </div>
                        <span className={`record-type ${record.type}`}>
                          {record.type === 'entry' ? 'ENTRADA' : 
                           record.type === 'pause' ? 'PAUSA' : 'SAÍDA'}
                        </span>
                      </div>
                    </div>
                    <FiArrowRight className="recent-item-arrow" size={16} />
                  </div>
                ))
              ) : (
                <div className="recent-item">
                  <div className="recent-item-content">
                    <span className="text-muted">Nenhum registro encontrado neste mês</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card de Informações */}
          <div className="info-card card">
            <div className="section-header">
              <FiInfo size={24} />
              <h3>Como Usar o Sistema</h3>
            </div>
            <div className="info-content">
              <div className="info-section">
                <h4>
                  <FiLogIn size={18} />
                  Registro de Entrada
                </h4>
                <ul>
                  <li>Registre sua entrada ao chegar no trabalho</li>
                  <li>Clique no botão verde "Registrar Entrada"</li>
                  <li>O sistema captura automaticamente data e hora</li>
                </ul>
              </div>
              
              <div className="info-section">
                <h4>
                  <FiLogOut size={18} />
                  Registro de Saída
                </h4>
                <ul>
                  <li>Registre sua saída ao finalizar o expediente</li>
                  <li>Clique no botão vermelho "Registrar Saída"</li>
                  <li>Seus registros ficam salvos automaticamente</li>
                </ul>
              </div>

              <div className="info-section">
                <h4>Acompanhamento</h4>
                <ul>
                  <li>Visualize todos seus registros na seção "Meus Últimos Registros"</li>
                  <li>Confirme sempre o último registro realizado</li>
                  <li>Em caso de problemas, contate o administrador</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="info-card error-card">
          <div className="section-header">
            <FiAlertCircle size={24} />
            <h3>Funcionário Não Vinculado</h3>
          </div>
          <p>Seu usuário não está vinculado a um funcionário no sistema.</p>
          <div className="quick-actions">
            <button className="btn btn-primary">
              <FiUser size={18} />
              <span>Solicitar Vinculação</span>
            </button>
            <button className="btn btn-secondary">
              <FiInfo size={18} />
              <span>Contatar Administrador</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;