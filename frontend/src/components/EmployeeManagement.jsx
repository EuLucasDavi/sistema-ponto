import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
        <h1>👥 Gerenciar Funcionários</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={loading}
        >
          ➕ Novo Funcionário
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h2>{editingEmployee ? '✏️ Editar Funcionário' : '👤 Novo Funcionário'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nome Completo:</label>
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
              <label>Email:</label>
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
              <label>Departamento:</label>
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
              <label>Salário (R$):</label>
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
              <label>Data de Admissão:</label>
              <input
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                required
                disabled={loading}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : (editingEmployee ? 'Atualizar' : 'Cadastrar')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={loading}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
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
                <td>{employee._id.substring(18)}</td>
                <td>{employee.name}</td>
                <td>{employee.email}</td>
                <td>{employee.department}</td>
                <td>R$ {parseFloat(employee.salary).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td>{new Date(employee.hire_date).toLocaleDateString('pt-BR')}</td>
                <td>
                  <button 
                    className="btn btn-edit"
                    onClick={() => handleEdit(employee)}
                    title="Editar funcionário"
                  >
                    Editar
                  </button>
                  <button 
                    className="btn btn-delete"
                    onClick={() => handleDelete(employee._id)}
                    title="Excluir funcionário"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  Nenhum funcionário cadastrado. Clique em "Novo Funcionário" para começar.
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