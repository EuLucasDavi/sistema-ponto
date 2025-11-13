import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Reports = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    
    // Definir datas padrão (início e fim do mês atual)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
    }
  };

  const generateTimesheetPDF = () => {
    if (!selectedEmployee) {
      alert('Selecione um funcionário');
      return;
    }

    setLoading(true);
    const url = `/api/reports/timesheet/${selectedEmployee}/pdf?start_date=${startDate}&end_date=${endDate}`;
    
    // Abrir em nova aba
    const newWindow = window.open(url, '_blank');
    
    // Verificar se o popup foi bloqueado
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      alert('Popup bloqueado! Por favor, permita popups para este site para gerar o PDF.');
    }
    
    setLoading(false);
  };

  const generatePayrollExcel = () => {
    setLoading(true);
    const url = `/api/reports/payroll/excel?month=${month}&year=${year}`;
    
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      alert('Popup bloqueado! Por favor, permita popups para este site para gerar o Excel.');
    }
    
    setLoading(false);
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="container">
      <div className="header">
        <h1>📈 Relatórios</h1>
        <p>Gere relatórios em PDF e Excel</p>
      </div>

      <div className="reports-grid">
        {/* Espelho de Ponto */}
        <div className="report-card">
          <h2>📄 Espelho de Ponto (PDF)</h2>
          <p>Gere o espelho de ponto individual em PDF</p>
          
          <div className="form-group">
            <label>Funcionário:</label>
            <select 
              value={selectedEmployee} 
              onChange={(e) => setSelectedEmployee(e.target.value)}
              disabled={loading}
            >
              <option value="">Selecione um funcionário</option>
              {employees.map(employee => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Data Início:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Data Fim:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={generateTimesheetPDF}
            disabled={!selectedEmployee || loading}
          >
            {loading ? 'Gerando...' : '📥 Gerar PDF'}
          </button>
        </div>

        {/* Folha de Pagamento */}
        <div className="report-card">
          <h2>💰 Folha de Pagamento (Excel)</h2>
          <p>Gere a folha de pagamento completa em Excel</p>
          
          <div className="form-group">
            <label>Mês:</label>
            <select 
              value={month} 
              onChange={(e) => setMonth(e.target.value)}
              disabled={loading}
            >
              {months.map((monthName, index) => (
                <option key={index + 1} value={index + 1}>
                  {monthName}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Ano:</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min="2020"
              max="2030"
              disabled={loading}
            />
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={generatePayrollExcel}
            disabled={loading}
          >
            {loading ? 'Gerando...' : '📊 Gerar Excel'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#fff3cd', borderRadius: '10px', border: '1px solid #ffeaa7' }}>
        <h3>ℹ️ Informações sobre os Relatórios</h3>
        <div style={{ marginTop: '15px' }}>
          <p><strong>Espelho de Ponto (PDF):</strong></p>
          <ul style={{ paddingLeft: '20px', marginBottom: '15px' }}>
            <li>Lista todos os registros de ponto do período</li>
            <li>Mostra data, hora e tipo de registro</li>
            <li>Inclui resumo com totais</li>
          </ul>
          
          <p><strong>Folha de Pagamento (Excel):</strong></p>
          <ul style={{ paddingLeft: '20px' }}>
            <li>Calcula salário proporcional baseado nos dias trabalhados</li>
            <li>Inclui todos os funcionários</li>
            <li>Formatação profissional com totais</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Reports;