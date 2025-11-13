import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TimeClock = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [lastRecord, setLastRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      alert('Erro ao carregar lista de funcionários');
    }
  };

  const registerTime = async (type) => {
    if (!selectedEmployee) {
      alert('Selecione um funcionário');
      return;
    }

    setLoading(true);
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
      
      alert(`✅ Ponto ${type === 'entry' ? 'de entrada' : 'de saída'} registrado com sucesso!`);
    } catch (error) {
      console.error('Erro ao registrar ponto:', error);
      alert('❌ Erro ao registrar ponto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>⏰ Registro de Ponto</h1>
        <p>Registre entradas e saídas dos funcionários</p>
      </div>
      
      <div className="time-clock">
        <div className="form-group">
          <label>Selecione o Funcionário:</label>
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
            className="btn btn-entry"
            onClick={() => registerTime('entry')}
            disabled={loading || !selectedEmployee}
          >
            📥 {loading ? 'Registrando...' : 'Registrar Entrada'}
          </button>
          <button 
            className="btn btn-exit"
            onClick={() => registerTime('exit')}
            disabled={loading || !selectedEmployee}
          >
            📤 {loading ? 'Registrando...' : 'Registrar Saída'}
          </button>
        </div>

        {lastRecord && (
          <div className="last-record">
            <h3>✅ Último registro confirmado:</h3>
            <p><strong>Funcionário:</strong> {lastRecord.employee}</p>
            <p><strong>Tipo:</strong> {lastRecord.type === 'entry' ? 'Entrada' : 'Saída'}</p>
            <p><strong>Horário:</strong> {lastRecord.timestamp}</p>
          </div>
        )}

        <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
          <h4>💡 Instruções:</h4>
          <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li>Selecione o funcionário na lista</li>
            <li>Clique em "Registrar Entrada" ao chegar</li>
            <li>Clique em "Registrar Saída" ao sair</li>
            <li>Cada registro é salvo automaticamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TimeClock;