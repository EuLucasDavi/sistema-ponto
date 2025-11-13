import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EmployeeDashboard = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [todayRecords, setTodayRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [lastRecord, setLastRecord] = useState(null);

  useEffect(() => {
    fetchEmployeeData();
    fetchRecentRecords();
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
      <div className="container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>👋 Meu Painel</h1>
        <p>Controle seus registros de ponto</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {employeeData ? (
        <>
          <div className="employee-info-card">
            <h2>{employeeData.name}</h2>
            <p><strong>Departamento:</strong> {employeeData.department}</p>
            <p><strong>Salário:</strong> R$ {parseFloat(employeeData.salary).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            <p><strong>Registros hoje:</strong> {todayRecords}</p>
          </div>

          <div className="time-clock-simple">
            <h3>⏰ Registrar Ponto</h3>
            <div className="time-buttons">
              <button 
                className="btn btn-entry"
                onClick={() => registerTime('entry')}
                disabled={registerLoading}
              >
                📥 {registerLoading ? 'Registrando...' : 'Registrar Entrada'}
              </button>
              <button 
                className="btn btn-exit"
                onClick={() => registerTime('exit')}
                disabled={registerLoading}
              >
                📤 {registerLoading ? 'Registrando...' : 'Registrar Saída'}
              </button>
            </div>

            {lastRecord && (
              <div className="last-record">
                <h4>✅ Último registro confirmado:</h4>
                <p><strong>Funcionário:</strong> {lastRecord.employee}</p>
                <p><strong>Tipo:</strong> {lastRecord.type === 'entry' ? 'Entrada' : 'Saída'}</p>
                <p><strong>Horário:</strong> {lastRecord.timestamp}</p>
              </div>
            )}
          </div>

          <div className="recent-section">
            <h3>📋 Meus Últimos Registros</h3>
            <div className="recent-list">
              {recentRecords.length > 0 ? (
                recentRecords.map(record => (
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
                  <span>Nenhum registro encontrado</span>
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

      <div className="info-card">
        <h3>💡 Como Usar</h3>
        <ul>
          <li>Registre sua <strong>entrada</strong> ao chegar no trabalho</li>
          <li>Registre sua <strong>saída</strong> ao sair do trabalho</li>
          <li>Seus registros ficam salvos automaticamente</li>
          <li>Visualize seu histórico acima</li>
        </ul>
      </div>
    </div>
  );
};

export default EmployeeDashboard;