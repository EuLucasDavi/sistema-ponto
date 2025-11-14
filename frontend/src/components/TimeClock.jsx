import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiClock,
  FiUser,
  FiLogIn,
  FiLogOut,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiUsers,
  FiCalendar,
  FiWatch
} from 'react-icons/fi';

const TimeClock = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [lastRecord, setLastRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setError('');
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      setError('Erro ao carregar lista de funcionários');
    }
  };

  const registerTime = async (type) => {
    if (!selectedEmployee) {
      setError('Selecione um funcionário');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('/api/time-records', {
        employee_id: selectedEmployee,
        type: type
      });
      
      const now = new Date();
      setLastRecord({
        type,
        timestamp: now.toLocaleString('pt-BR'),
        employee: employees.find(emp => emp._id === selectedEmployee)?.name
      });
      
    } catch (error) {
      console.error('Erro ao registrar ponto:', error);
      setError(error.response?.data?.error || 'Erro ao registrar ponto');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiClock size={32} className="header-icon" />
          <div>
            <h1>Registro de Ponto</h1>
            <p>Registre entradas e saídas dos funcionários</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <FiAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      
      <div className="time-clock-container">
        <div className="time-clock-card">
          {/* Relógio em tempo real */}
          <div className="current-time">
            <FiWatch size={24} />
            <div className="time-display">{currentTime}</div>
            <div className="date-display">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </div>
          </div>

          <div className="form-group">
            <label>
              <FiUser size={16} />
              Selecione o Funcionário:
            </label>
            <select 
              value={selectedEmployee} 
              onChange={(e) => setSelectedEmployee(e.target.value)}
              disabled={loading}
            >
              <option value="">Selecione um funcionário</option>
              {employees.map(employee => (
                <option key={employee._id} value={employee._id}>
                  {employee.name} - {employee.department}
                </option>
              ))}
            </select>
          </div>

          <div className="time-buttons">
            <button 
              className="btn btn-success btn-large"
              onClick={() => registerTime('entry')}
              disabled={loading || !selectedEmployee}
            >
              {loading ? (
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
              className="btn btn-danger btn-large"
              onClick={() => registerTime('exit')}
              disabled={loading || !selectedEmployee}
            >
              {loading ? (
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
                <FiCheckCircle size={20} color="#28a745" />
                <h3>Último registro confirmado</h3>
              </div>
              <div className="record-details">
                <div className="record-item">
                  <FiUser size={16} />
                  <div>
                    <strong>Funcionário:</strong>
                    <span>{lastRecord.employee}</span>
                  </div>
                </div>
                <div className="record-item">
                  {lastRecord.type === 'entry' ? (
                    <FiLogIn size={16} color="#28a745" />
                  ) : (
                    <FiLogOut size={16} color="#dc3545" />
                  )}
                  <div>
                    <strong>Tipo:</strong>
                    <span className={`record-type ${lastRecord.type}`}>
                      {lastRecord.type === 'entry' ? 'Entrada' : 'Saída'}
                    </span>
                  </div>
                </div>
                <div className="record-item">
                  <FiCalendar size={16} />
                  <div>
                    <strong>Horário:</strong>
                    <span>{lastRecord.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="info-card">
            <div className="section-header">
              <FiInfo size={20} />
              <h4>Instruções</h4>
            </div>
            <ul>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Selecione o funcionário na lista
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Clique em "Registrar Entrada" ao chegar
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Clique em "Registrar Saída" ao sair
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Cada registro é salvo automaticamente
              </li>
            </ul>
          </div>
        </div>

        {/* Card de estatísticas rápidas */}
        <div className="stats-sidebar">
          <div className="stat-card">
            <div className="stat-icon">
              <FiUsers size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{employees.length}</div>
              <div className="stat-label">Funcionários</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <FiClock size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-number">
                {lastRecord ? '1' : '0'}
              </div>
              <div className="stat-label">Registro Hoje</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeClock;