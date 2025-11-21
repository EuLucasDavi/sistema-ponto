import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiUsers,
  FiUserPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSave,
  FiCalendar,
  FiMail,
  FiBriefcase,
  FiUser,
  FiAlertCircle,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiInfo,
  FiShield,
  FiAlertTriangle
} from 'react-icons/fi';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    salary: '',
    hire_date: '',
    overtime_format: 'time_bank'
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setError('');
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('❌ Erro ao buscar funcionários:', error);
      setError('Erro ao buscar funcionários. Verifique a conexão com o servidor.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      department: employee.department,
      salary: employee.salary || '',
      hire_date: employee.hire_date ? new Date(employee.hire_date).toISOString().split('T')[0] : '',
      overtime_format: employee.overtime_format || 'time_bank'
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingEmployee) {
        await axios.put(`/api/employees/${editingEmployee._id}`, formData);
        setSuccess('Funcionário atualizado com sucesso!');
      } else {
        await axios.post('/api/employees', formData);
        setSuccess('Funcionário criado com sucesso!');
      }

      handleCloseForm();
      fetchEmployees();
    } catch (err) {
      const msg = err.response?.data?.error || `Erro ao ${editingEmployee ? 'atualizar' : 'criar'} funcionário.`;
      setError(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este funcionário?')) return;
    try {
      await axios.delete(`/api/employees/${id}`);
      setSuccess('Funcionário excluído com sucesso!');
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao excluir funcionário.');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      department: '',
      salary: '',
      hire_date: '',
      overtime_format: 'time_bank'
    });
    setError('');
    setSuccess('');
  };

  const getOvertimeBadge = (format) => {
    const isTimeBank = format === 'time_bank';
    return (
      <span className={`badge ${isTimeBank ? 'badge-time-bank' : 'badge-overtime'}`}>
        {isTimeBank ? 'Banco de Horas' : 'Hora Extra'}
      </span>
    );
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiUsers className="header-icon" size={32} />
          <div>
            <h1>Gestão de Funcionários</h1>
            <p className="text-muted">Adicione, edite e remova funcionários do sistema.</p>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowForm(true)}
          disabled={loading}
        >
          <FiUserPlus size={18} />
          <span>Novo Funcionário</span>
        </button>
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

      {showForm && (
        <div className="form-overlay">
          <div className="form-container card">
            <div className="form-header">
              <div className="form-title">
                {editingEmployee ? (
                  <>
                    <FiEdit2 size={24} />
                    <h2>Editar Funcionário</h2>
                  </>
                ) : (
                  <>
                    <FiUserPlus size={24} />
                    <h2>Criar Novo Funcionário</h2>
                  </>
                )}
              </div>
              <button 
                className="btn-close" 
                onClick={handleCloseForm}
                disabled={loading}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <FiUser size={16} />
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: João da Silva"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>
                    <FiMail size={16} />
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="exemplo@empresa.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>
                    <FiBriefcase size={16} />
                    Departamento *
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="Ex: TI / Marketing"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>
                    <FiDollarSign size={16} />
                    Salário Base (R$) *
                  </label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="Ex: 3000.00"
                    step="0.01"
                    min="0"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>
                    <FiClock size={16} />
                    Formato de Excedente de Horas *
                  </label>
                  <select
                    name="overtime_format"
                    value={formData.overtime_format}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="time_bank">Banco de Horas</option>
                    <option value="paid_overtime">Hora Extra Paga</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    <FiCalendar size={16} />
                    Data de Contratação *
                  </label>
                  <input
                    type="date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <FiSave size={18} />
                      <span>{editingEmployee ? 'Atualizar' : 'Criar Funcionário'}</span>
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCloseForm}
                  disabled={loading}
                >
                  <FiX size={18} />
                  <span>Cancelar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="main-content">
        <div className="table-container card">
          <div className="table-header">
            <h3>Lista de Funcionários</h3>
            <span className="table-count">{employees.length} funcionário(s)</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th><FiUser size={14} /> Nome</th>
                <th><FiMail size={14} /> Email</th>
                <th><FiBriefcase size={14} /> Departamento</th>
                <th><FiDollarSign size={14} /> Salário</th>
                <th><FiClock size={14} /> Excedente</th>
                <th><FiCalendar size={14} /> Contratação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee._id}>
                  <td className="employee-name">
                    <div className="employee-info">
                      <div>
                        <strong>{employee.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td className="employee-email">
                    {employee.email ? (
                      <div className="employee-email">{employee.email}</div>
                    ) : (
                      <span className="text-muted">Não possui</span>
                    )}
                  </td>
                  <td className="employee-department">
                    {employee.department ? (
                      <span className="department-badge">
                        {employee.department}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="employee-salary">
                    {employee.salary ? (
                      <>{parseFloat(employee.salary || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="employee-overtime">
                    {getOvertimeBadge(employee.overtime_format)}
                  </td>
                  <td className="employee-date">
                    <div className="date-info">
                      <span>{new Date(employee.hire_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </td>
                  <td className="employee-actions">
                    <div className="action-buttons">
                      <button
                        className="btn btn-edit btn-small"
                        onClick={() => handleEdit(employee)}
                        title="Editar funcionário"
                        disabled={loading}
                      >
                        <FiEdit2 size={14} />
                        <span>Editar</span>
                      </button>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDelete(employee._id)}
                        title="Excluir funcionário"
                        disabled={loading}
                      >
                        <FiTrash2 size={14} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-state">
                    <div className="empty-content">
                      <FiUsers size={48} />
                      <h3>Nenhum funcionário cadastrado</h3>
                      <p>Clique em "Novo Funcionário" para começar</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Seção de dicas - AGORA DEVE APARECER */}
        <div className="employee-management-tips">
          <div className="tips-header">
            <FiInfo className="header-icon" size={24} />
            <h3>Dicas de Gestão de Funcionários</h3>
          </div>
          <div className="tips-grid">
            <div className="tip-card">
              <h4>
                <FiShield size={18} />
                Dados e Segurança
              </h4>
              <ul>
                <li>Mantenha os dados dos funcionários sempre atualizados</li>
                <li>Verifique regularmente as informações cadastrais</li>
                <li>Proteja dados sensíveis como salários e informações pessoais</li>
              </ul>
            </div>
            <div className="tip-card">
              <h4>
                <FiUsers size={18} />
                Melhores Práticas
              </h4>
              <ul>
                <li>Atualize departamentos conforme mudanças organizacionais</li>
                <li>Revise periodicamente os formatos de hora extra</li>
                <li>Mantenha histórico de alterações salariais</li>
              </ul>
            </div>
            <div className="tip-card">
              <h4>
                <FiAlertTriangle size={18} />
                Importante
              </h4>
              <ul>
                <li>A exclusão de funcionários é irreversível</li>
                <li>Funcionários vinculados a usuários não podem ser excluídos</li>
                <li>Alterações salariais afetam cálculos futuros</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagement;