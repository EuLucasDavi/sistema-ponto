import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiFileText,
  FiDownload,
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiBarChart2,
  FiSettings,
  FiUser,
  FiInfo,
  FiZap // Ícone para zerar saldo
} from 'react-icons/fi';

const Reports = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Estados de loading para cada ação
  const [loading, setLoading] = useState({ pdf: false, excel: false, reset: false }); 
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEmployees();
    
    // Define datas padrão (início e fim do mês atual)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const fetchEmployees = async () => {
    try {
      // O endpoint /api/employees precisa retornar o campo current_time_bank
      const response = await axios.get('/api/employees'); 
      setEmployees(response.data);
    } catch (err) {
      setError('Erro ao carregar lista de funcionários.');
    }
  };

  const minutesToTimeDisplay = (totalMinutes) => {
    if (totalMinutes === undefined || totalMinutes === null) return '0h 0m';
    const sign = totalMinutes < 0 ? '-' : '';
    const minutes = Math.abs(totalMinutes);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${sign}${hours}h ${mins}m`;
  };

  // Função para zerar o Banco de Horas/Hora Extra
  const handleResetBank = async () => {
    if (!selectedEmployee) {
      setError('Por favor, selecione um funcionário para zerar o saldo de horas.');
      return;
    }
    const employee = employees.find(e => e._id === selectedEmployee);
    if (!window.confirm(`Tem certeza que deseja zerar o saldo de horas de ${employee?.name || 'este funcionário'}? Esta ação é irreversível.`)) {
      return;
    }

    setLoading(prev => ({ ...prev, reset: true }));
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/reports/reset-bank', {
        employee_id: selectedEmployee,
      });

      // Atualiza a lista de funcionários para refletir o saldo zerado
      await fetchEmployees();

      setSuccess(`Saldo de horas zerado com sucesso para ${employee?.name || 'o funcionário'}.`);

    } catch (err) {
      // Tenta extrair a mensagem de erro do servidor
      const serverError = err.response?.data?.error;
      setError(serverError || 'Erro ao zerar o saldo de horas.');
    } finally {
      setLoading(prev => ({ ...prev, reset: false }));
    }
  };

  // Função para download de PDF
  const handleDownloadPDF = async () => {
    if (!selectedEmployee || !startDate || !endDate) {
      setError('Por favor, selecione um funcionário e o intervalo de datas.');
      return;
    }
    setLoading(prev => ({ ...prev, pdf: true }));
    setError('');
    setSuccess('');

    try {
      const response = await axios.get('/api/reports/pdf', {
        params: {
          employee_id: selectedEmployee,
          start_date: startDate,
          end_date: endDate
        },
        responseType: 'blob' // Necessário para receber o binário do PDF
      });

      // Cria um link temporário para download
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `espelho_ponto_${selectedEmployee}_${startDate}_${endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Relatório PDF gerado com sucesso!');

    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      const serverError = err.response?.data?.error;
      setError(serverError || 'Erro ao gerar relatório PDF. Verifique se há registros no período.');
    } finally {
      setLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  // Função para download de Excel
  const handleDownloadExcel = async () => {
    if (!selectedEmployee || !startDate || !endDate) {
      setError('Por favor, selecione um funcionário e o intervalo de datas.');
      return;
    }
    setLoading(prev => ({ ...prev, excel: true }));
    setError('');
    setSuccess('');

    try {
      const response = await axios.get('/api/reports/excel', {
        params: {
          employee_id: selectedEmployee,
          start_date: startDate,
          end_date: endDate
        },
        responseType: 'blob' // Necessário para receber o binário do Excel
      });

      // Cria um link temporário para download
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_ponto_${selectedEmployee}_${startDate}_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Relatório Excel gerado com sucesso!');

    } catch (err) {
      console.error('Erro ao baixar Excel:', err);
      const serverError = err.response?.data?.error;
      setError(serverError || 'Erro ao gerar relatório Excel. Verifique se há registros no período.');
    } finally {
      setLoading(prev => ({ ...prev, excel: false }));
    }
  };

  const currentEmployee = employees.find(e => e._id === selectedEmployee);
  const currentOvertimeFormat = currentEmployee ? (currentEmployee.overtime_format === 'time_bank' ? 'Banco de Horas' : 'Hora Extra Paga') : 'N/A';
  const currentTimeBank = currentEmployee ? minutesToTimeDisplay(currentEmployee.current_time_bank) : '0h 0m';
  const timeBankLabel = currentEmployee?.overtime_format === 'time_bank' ? 'Saldo Atual' : 'Acumulado';


  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiFileText className="header-icon" size={32} />
          <div>
            <h1>Relatórios Administrativos</h1>
            <p className="text-muted">Gere espelhos de ponto e gerencie saldos de horas.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <FiAlertCircle size={18} /> {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="alert">
          <FiCheckCircle size={18} /> {success}
        </div>
      )}

      <div className="report-config-card card">
        <div className="section-header">
          <FiSettings size={20} />
          <h3>Configuração do Relatório</h3>
        </div>
        <div className="config-body">
          <div className="form-group">
            <label><FiUsers size={14} /> Selecione o Funcionário *</label>
            <select
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setError('');
                setSuccess('');
              }}
              required
            >
              <option value="">-- Selecione um Funcionário --</option>
              {employees.map(employee => (
                <option key={employee._id} value={employee._id}>
                  {employee.name} ({employee.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label><FiCalendar size={14} /> Data Inicial *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label><FiCalendar size={14} /> Data Final *</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          
          {selectedEmployee && currentEmployee && (
            <div className="employee-info-summary">
              <FiUser size={16} /> 
              <span>
                Formato de Excedente: <strong>{currentOvertimeFormat}</strong> | 
                {timeBankLabel}: <strong>{currentTimeBank}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="report-buttons">
          <button
            className="btn btn-primary"
            onClick={handleDownloadPDF}
            disabled={loading.pdf || !selectedEmployee || !startDate || !endDate}
          >
            <FiDownload size={16} />
            {loading.pdf ? 'Gerando PDF...' : 'Espelho de Ponto (PDF)'}
          </button>

          <button
            className="btn btn-success"
            onClick={handleDownloadExcel}
            disabled={loading.excel || !selectedEmployee || !startDate || !endDate}
          >
            <FiDownload size={16} />
            {loading.excel ? 'Gerando Excel...' : 'Relatório de Ponto (Excel)'}
          </button>

          {/* NOVO BOTÃO: ZERAR BANCO DE HORAS */}
          <button
            className="btn btn-danger"
            onClick={handleResetBank}
            disabled={loading.reset || !selectedEmployee}
            title="Zerar Saldo de Banco de Horas/Hora Extra do Funcionário"
            style={{ marginLeft: 'auto' }}
          >
            <FiZap size={16} />
            {loading.reset ? 'Zerando...' : 'Zerar Saldo de Horas'}
          </button>
        </div>
      </div>

      <div className="reports-section">
        <div className="section-header">
          <FiBarChart2 size={24} />
          <h3>Sobre os Relatórios</h3>
        </div>
        <div className="report-info-grid">
          <div className="info-card">
            <div className="section-header">
              <FiFileText size={20} />
              <h4>Espelho de Ponto (PDF)</h4>
            </div>
            <ul>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Formato de duas linhas por dia (Registro / Pausas).
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Cálculo de horas trabalhadas líquidas.
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Resumo de banco de horas ou valor de hora extra paga.
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Ideal para impressão e arquivo legal.
              </li>
            </ul>
          </div>
          <div className="info-card">
            <div className="section-header">
              <FiDollarSign size={20} />
              <h4>Relatório (Excel)</h4>
            </div>
            <ul>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Dados formatados em colunas para fácil manipulação.
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Totais consolidados automáticos.
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Inclui todos os dados de registro, pausas e resumo.
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Perfeito para cálculos adicionais.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="info-card tips-card">
        <div className="section-header">
          <FiInfo size={24} />
          <h3>Dicas para Download</h3>
        </div>
        <div className="tips-content">
          <p><strong>Se o download não funcionar:</strong></p>
          <ul>
            <li>
              <FiCheckCircle size={16} color="#28a745" />
              Verifique se está logado no sistema
            </li>
            <li>
              <FiCheckCircle size={16} color="#28a745" />
              Confirme as permissões do navegador para downloads
            </li>
            <li>
              <FiCheckCircle size={16} color="#28a745" />
              Desative temporariamente o bloqueador de popups
            </li>
            <li>
              <FiCheckCircle size={16} color="#28a745" />
              Use um navegador atualizado (Chrome, Firefox, Edge)
            </li>
            <li>
              <FiCheckCircle size={16} color="#28a745" />
              Verifique se há registros no período selecionado
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Reports;