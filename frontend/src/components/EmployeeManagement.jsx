import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiUsers,
  FiUserPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSave,
  FiDollarSign,
  FiCalendar,
  FiMail,
  FiBriefcase,
  FiUser,
  FiAlertCircle
} from 'react-icons/fi';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    salary: '',
    hire_date: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      console.log('🔍 Buscando lista de funcionários...');
      setError('');
      const response = await axios.get('/api/employees');
      console.log('✅ Funcionários carregados:', response.data.length);
      setEmployees(response.data);
    } catch (error) {
      console.error('❌ Erro ao buscar funcionários:', error);
      console.error('📡 Detalhes do erro:', error.response?.data);
      setError('Erro ao carregar funcionários: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingEmployee) {
        await axios.put(`/api/employees/${editingEmployee._id}`, formData);
      } else {
        await axios.post('/api/employees', formData);
      }
      await fetchEmployees();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      setError(error.response?.data?.error || 'Erro ao salvar funcionário');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este funcionário?')) {
      try {
        await axios.delete(`/api/employees/${id}`);
        await fetchEmployees();
      } catch (error) {
        console.error('Erro ao excluir funcionário:', error);
        setError('Erro ao excluir funcionário');
      }
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      department: employee.department,
      salary: employee.salary.toString(),
      hire_date: employee.hire_date.split('T')[0]
    });
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      department: '',
      salary: '',
      hire_date: ''
    });
    setEditingEmployee(null);
    setShowForm(false);
    setError('');
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiUsers size={32} className="header-icon" />
          <div>
            <h1>Gerenciar Funcionários</h1>
            <p>Cadastre e gerencie os funcionários do sistema</p>
          </div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={loading}
        >
          <FiUserPlus size={20} />
          <span>Novo Funcionário</span>
        </button>
      </div>

      {error && (
        <div className="error-message">
          <FiAlertCircle size={18} />
          <span>{error}</span>
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
                    <h2>Novo Funcionário</h2>
                  </>
                )}
              </div>
              <button 
                className="btn-close"
                onClick={resetForm}
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
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    disabled={loading}
                    placeholder="Digite o nome completo"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <FiMail size={16} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    disabled={loading}
                    placeholder="email@empresa.com"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <FiBriefcase size={16} />
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    required
                    disabled={loading}
                    placeholder="Ex: TI, RH, Vendas..."
                  />
                </div>

                <div className="form-group">
                  <label>
                    Salário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    required
                    disabled={loading}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <FiCalendar size={16} />
                    Data de Admissão
                  </label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="loading-spinner"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <FiSave size={18} />
                      <span>{editingEmployee ? 'Atualizar' : 'Cadastrar'}</span>
                    </>
                  )}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={loading}>
                  <FiX size={18} />
                  <span>Cancelar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Departamento</th>
              <th>Salário</th>
              <th>Data Admissão</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee._id}>
                <td className="employee-id">{employee._id.substring(18)}</td>
                <td className="employee-name">
                  <div className="employee-info">
                    <FiUser size={16} />
                    <span>{employee.name}</span>
                  </div>
                </td>
                <td className="employee-email">
                  <div className="employee-info">
                    <FiMail size={16} />
                    <span>{employee.email}</span>
                  </div>
                </td>
                <td className="employee-department">
                  <div className="employee-info">
                    <FiBriefcase size={16} />
                    <span>{employee.department}</span>
                  </div>
                </td>
                <td className="employee-salary">
                  <div className="employee-info">
                    <FiDollarSign size={16} />
                    <span>R$ {parseFloat(employee.salary).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                </td>
                <td className="employee-date">
                  <div className="employee-info">
                    <FiCalendar size={16} />
                    <span>{new Date(employee.hire_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                </td>
                <td className="employee-actions">
                  <div className="action-buttons">
                    <button 
                      className="btn btn-edit btn-small"
                      onClick={() => handleEdit(employee)}
                      title="Editar funcionário"
                    >
                      <FiEdit2 size={14} />
                      <span>Editar</span>
                    </button>
                    <button 
                      className="btn btn-danger btn-small"
                      onClick={() => handleDelete(employee._id)}
                      title="Excluir funcionário"
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
    </div>
  );
};

export default EmployeeManagement;