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
      
      console.log('📤 Gerando PDF:', url);
      
      // Método mais robusto para download
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Criar URL temporária para o blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Criar link para download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `espelho-ponto-${employee.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      
      // Simular clique
      link.click();
      
      // Limpar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      setSuccess(`PDF gerado para ${employee.name}`);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setError('Erro ao gerar PDF: ' + error.message);
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
      
      console.log('📤 Gerando Excel:', url);
      
      // Método mais robusto para download
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Criar URL temporária para o blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Criar link para download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `folha-pagamento-${month}-${year}.xlsx`;
      document.body.appendChild(link);
      
      // Simular clique
      link.click();
      
      // Limpar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      setSuccess('Excel gerado com sucesso');
      
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      setError('Erro ao gerar Excel: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, excel: false }));
    }
  };

  // Método alternativo usando axios (se preferir)
  const generateTimesheetPDFAlternative = async () => {
    if (!selectedEmployee) {
      setError('Selecione um funcionário');
      return;
    }

    setLoading(prev => ({ ...prev, pdf: true }));
    setError('');
    setSuccess('');

    try {
      const employee = employees.find(emp => emp._id === selectedEmployee);
      
      const response = await axios({
        method: 'GET',
        url: `/api/reports/timesheet/${selectedEmployee}/pdf`,
        params: {
          start_date: startDate,
          end_date: endDate
        },
        responseType: 'blob', // IMPORTANTE: especificar blob
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Criar blob URL
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] 
      });
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Criar link para download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `espelho-ponto-${employee.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      setSuccess(`PDF gerado para ${employee.name}`);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setError('Erro ao gerar PDF: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  const generatePayrollExcelAlternative = async () => {
    setLoading(prev => ({ ...prev, excel: true }));
    setError('');
    setSuccess('');

    try {
      const response = await axios({
        method: 'GET',
        url: '/api/reports/payroll/excel',
        params: {
          month: month,
          year: year
        },
        responseType: 'blob', // IMPORTANTE: especificar blob
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Criar blob URL
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] 
      });
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Criar link para download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `folha-pagamento-${month}-${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      setSuccess('Excel gerado com sucesso');
      
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      setError('Erro ao gerar Excel: ' + (error.response?.data?.error || error.message));
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
        <p>Gere relatórios profissionais em PDF e Excel</p>
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
          <p>Gere o espelho de ponto individual em formato profissional</p>
          
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
            onClick={generateTimesheetPDFAlternative} // Use a versão alternativa
            disabled={!selectedEmployee || loading.pdf}
          >
            {loading.pdf ? '⏳ Gerando PDF...' : '📥 Baixar PDF'}
          </button>

          <div className="report-features">
            <h4>📋 Características do PDF:</h4>
            <ul>
              <li>✅ Formato profissional de espelho de ponto</li>
              <li>✅ Cálculo automático de horas trabalhadas</li>
              <li>✅ Controle de horas extras</li>
              <li>✅ Totais consolidados do período</li>
              <li>✅ Espaço para assinaturas</li>
              <li>✅ Layout otimizado para impressão</li>
            </ul>
          </div>
        </div>

        {/* Folha de Pagamento */}
        <div className="report-card">
          <h2>💰 Folha de Pagamento (Excel)</h2>
          <p>Gere a folha de pagamento completa com cálculos automáticos</p>
          
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
            onClick={generatePayrollExcelAlternative} // Use a versão alternativa
            disabled={loading.excel}
          >
            {loading.excel ? '⏳ Gerando Excel...' : '📊 Baixar Excel'}
          </button>

          <div className="report-features">
            <h4>📊 Características do Excel:</h4>
            <ul>
              <li>✅ <strong>2 Planilhas:</strong> Resumo + Detalhes</li>
              <li>✅ Cálculo automático de horas extras (50%)</li>
              <li>✅ Salário proporcional às horas trabalhadas</li>
              <li>✅ Base de 8 horas diárias</li>
              <li>✅ Totais consolidados automáticos</li>
              <li>✅ Formatação profissional</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="download-tips">
        <h3>💡 Dicas para Download</h3>
        <div className="tips-content">
          <p><strong>Se o download não funcionar:</strong></p>
          <ul>
            <li>✅ Verifique se está logado no sistema</li>
            <li>✅ Confirme as permissões do navegador para downloads</li>
            <li>✅ Desative temporariamente o bloqueador de popups</li>
            <li>✅ Use um navegador atualizado (Chrome, Firefox, Edge)</li>
            <li>✅ Verifique se há registros no período selecionado</li>
          </ul>
        </div>
      </div>

      {/* ... resto do componente permanece igual */}
    </div>
  );
};

export default Reports;