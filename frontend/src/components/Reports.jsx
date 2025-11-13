import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Reports = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState({ pdf: false, excel: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setError('');
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      setError('Erro ao carregar funcionários');
    }
  };

  const generateTimesheetPDF = async () => {
    if (!selectedEmployee) {
      setError('Selecione um funcionário');
      return;
    }

    setLoading(prev => ({ ...prev, pdf: true }));
    setError('');
    setSuccess('');

    try {
      const employee = employees.find(emp => emp._id === selectedEmployee);
      const url = `/api/reports/timesheet/${selectedEmployee}/pdf?start_date=${startDate}&end_date=${endDate}`;
      
      console.log('📤 Abrindo PDF:', url);
      
      // Criar link para download
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = `espelho-ponto-${employee.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess(`PDF gerado para ${employee.name}`);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setError('Erro ao gerar PDF. Verifique o console.');
    } finally {
      setLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  const generatePayrollExcel = async () => {
    setLoading(prev => ({ ...prev, excel: true }));
    setError('');
    setSuccess('');

    try {
      const url = `/api/reports/payroll/excel?month=${month}&year=${year}`;
      
      console.log('📤 Abrindo Excel:', url);
      
      // Criar link para download
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = `folha-pagamento-${month}-${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Excel gerado com sucesso');
      
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      setError('Erro ao gerar Excel. Verifique o console.');
    } finally {
      setLoading(prev => ({ ...prev, excel: false }));
    }
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

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          ✅ {success}
        </div>
      )}

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
              disabled={loading.pdf}
            >
              <option value="">Selecione um funcionário</option>
              {employees.map(employee => (
                <option key={employee._id} value={employee._id}>
                  {employee.name} - {employee.department}
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
              disabled={loading.pdf}
            />
          </div>
          
          <div className="form-group">
            <label>Data Fim:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading.pdf}
            />
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={generateTimesheetPDF}
            disabled={!selectedEmployee || loading.pdf}
          >
            {loading.pdf ? '⏳ Gerando PDF...' : '📥 Baixar PDF'}
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
              disabled={loading.excel}
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
              disabled={loading.excel}
            />
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={generatePayrollExcel}
            disabled={loading.excel}
          >
            {loading.excel ? '⏳ Gerando Excel...' : '📊 Baixar Excel'}
          </button>
        </div>
      </div>

      <div className="info-card">
        <h3>💡 Dicas para os Relatórios</h3>
        <div className="info-content">
          <p><strong>Problemas comuns:</strong></p>
          <ul>
            <li>Se o download não iniciar, verifique o bloqueador de popups</li>
            <li>Certifique-se de ter registros de ponto no período selecionado</li>
            <li>Verifique o console (F12) para mensagens de erro detalhadas</li>
            <li>Funcionários sem registros não aparecerão no Excel</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Reports;