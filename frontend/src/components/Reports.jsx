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
  FiClock,
  FiBarChart2,
  FiSettings,
  FiUser,
  FiInfo
} from 'react-icons/fi';

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
      
      const response = await axios({
        method: 'GET',
        url: `/api/reports/timesheet/${selectedEmployee}/pdf`,
        params: {
          start_date: startDate,
          end_date: endDate
        },
        responseType: 'blob',
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

  const generatePayrollExcel = async () => {
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
        responseType: 'blob',
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
        <div className="header-title">
          <FiBarChart2 size={32} className="header-icon" />
          <div>
            <h1>Relatórios</h1>
            <p>Gere relatórios profissionais em PDF e Excel</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <FiAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="success-message">
          <FiCheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="reports-grid">
        {/* Espelho de Ponto */}
        <div className="report-card">
          <div className="report-card-header">
            <div className="report-icon">
              <FiFileText size={24} />
            </div>
            <div>
              <h2>Espelho de Ponto</h2>
              <p>Gere o espelho de ponto individual em formato profissional</p>
            </div>
          </div>
          
          <div className="form-group">
            <label>
              <FiUser size={16} />
              Funcionário:
            </label>
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
          
          <div className="date-range">
            <div className="form-group">
              <label>
                <FiCalendar size={16} />
                Data Início:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading.pdf}
              />
            </div>
            
            <div className="form-group">
              <label>
                <FiCalendar size={16} />
                Data Fim:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading.pdf}
              />
            </div>
          </div>
          
          <button 
            className="btn btn-primary btn-large"
            onClick={generateTimesheetPDF}
            disabled={!selectedEmployee || loading.pdf}
          >
            {loading.pdf ? (
              <>
                <div className="loading-spinner"></div>
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <FiDownload size={20} />
                <span>Baixar PDF</span>
              </>
            )}
          </button>

          <div className="report-features">
            <div className="section-header">
              <FiCheckCircle size={20} />
              <h4>Características do PDF</h4>
            </div>
            <ul>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Formato profissional de espelho de ponto
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Cálculo automático de horas trabalhadas
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Controle de horas extras
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Totais consolidados do período
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Espaço para assinaturas
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Layout otimizado para impressão
              </li>
            </ul>
          </div>
        </div>

        {/* Folha de Pagamento */}
        <div className="report-card">
          <div className="report-card-header">
            <div className="report-icon">
              <FiDollarSign size={24} />
            </div>
            <div>
              <h2>Folha de Pagamento</h2>
              <p>Gere a folha de pagamento completa com cálculos automáticos</p>
            </div>
          </div>
          
          <div className="form-group">
            <label>
              <FiCalendar size={16} />
              Mês:
            </label>
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
            <label>
              <FiCalendar size={16} />
              Ano:
            </label>
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
            className="btn btn-primary btn-large"
            onClick={generatePayrollExcel}
            disabled={loading.excel}
          >
            {loading.excel ? (
              <>
                <div className="loading-spinner"></div>
                <span>Gerando Excel...</span>
              </>
            ) : (
              <>
                <FiDownload size={20} />
                <span>Baixar Excel</span>
              </>
            )}
          </button>

          <div className="report-features">
            <div className="section-header">
              <FiCheckCircle size={20} />
              <h4>Características do Excel</h4>
            </div>
            <ul>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                <strong>2 Planilhas:</strong> Resumo + Detalhes
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Cálculo automático de horas extras (50%)
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Salário proporcional às horas trabalhadas
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Base de 8 horas diárias
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Totais consolidados automáticos
              </li>
              <li>
                <FiCheckCircle size={16} color="#28a745" />
                Formatação profissional
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