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
  FiDollarSign // 💡 Importação adicional necessária
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
    hire_date: '',
    // 💡 NOVO CAMPO: Formato de hora extra/banco de horas
    overtime_format: 'time_bank' 
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
      // 💡 NOVO CAMPO: Carregar valor existente
      overtime_format: employee.overtime_format || 'time_bank' 
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingEmployee) {
        // Atualizar funcionário
        await axios.put(`/api/employees/${editingEmployee._id}`, formData);
      } else {
        // Criar novo funcionário
        await axios.post('/api/employees', formData);
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
      overtime_format: 'time_bank' // Resetar para o padrão
    });
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiUsers className="header-icon" size={32} />
          <div>
            <h1>Gestão de Funcionários</h1>
            <p className="text-muted">Adicione, edite e remova usuários do sistema.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <FiUserPlus size={18} />
          <span>Novo Funcionário</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <FiAlertCircle size={18} /> {error}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingEmployee ? 'Editar' : 'Novo'} Funcionário</h3>
              <button className="btn-close-modal" onClick={handleCloseForm}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label>Nome Completo *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: João da Silva"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="exemplo@empresa.com"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Departamento *</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="Ex: TI / Marketing"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Salário Base (R$) *</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="Ex: 3000.00"
                    required
                  />
                </div>

                {/* 💡 NOVO CAMPO: Formato de Excedente de Horas */}
                <div className="form-group">
                  <label>Formato de Excedente de Horas *</label>
                  <select
                    name="overtime_format"
                    value={formData.overtime_format}
                    onChange={handleChange}
                    required
                  >
                    <option value="time_bank">Banco de Horas</option>
                    <option value="paid_overtime">Hora Extra Paga</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Data de Contratação *</label>
                  <input
                    type="date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>
                  <FiX size={16} />
                  <span>Cancelar</span>
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <FiSave size={16} />
                  <span>{loading ? 'Salvando...' : 'Salvar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="employee-table">
        <table>
          <thead>
            <tr>
              <th><FiUser size={14} /> Nome</th>
              <th><FiMail size={14} /> Email</th>
              <th><FiBriefcase size={14} /> Depto</th>
              <th><FiDollarSign size={14} /> Salário</th>
              <th><FiClock size={14} /> Excedente</th> 
              <th><FiCalendar size={14} /> Contratação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee._id}>
                <td>{employee.name}</td>
                <td>{employee.email}</td>
                <td>{employee.department}</td>
                <td>R$ {parseFloat(employee.salary).toFixed(2)}</td>
                {/* 💡 Novo campo na tabela */}
                <td>{employee.overtime_format === 'time_bank' ? 'Banco de Horas' : 'Hora Extra'}</td>
                <td>
                  <div className="date-cell">
                    <FiCalendar size={14} />
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