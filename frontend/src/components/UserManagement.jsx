import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    employee_id: '',
    role: 'employee'
  });

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
  }, []);

  const fetchUsers = async () => {
    try {
      // Nota: Precisaríamos criar uma rota para listar usuários
      // Por enquanto, vamos focar na criação
      setError('');
    } catch (error) {
      console.error('Erro:', error);
      setError('Erro ao carregar dados');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/register', formData);
      setShowForm(false);
      setFormData({
        username: '',
        password: '',
        employee_id: '',
        role: 'employee'
      });
      alert('Usuário criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      setError(error.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>👥 Gerenciar Usuários</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={loading}
        >
          ➕ Novo Usuário
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h2>👤 Criar Novo Usuário</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                disabled={loading}
                placeholder="Nome de usuário para login"
              />
            </div>
            
            <div className="form-group">
              <label>Senha:</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                disabled={loading}
                placeholder="Senha para acesso"
              />
            </div>

            <div className="form-group">
              <label>Vincular a Funcionário (Opcional):</label>
              <select 
                value={formData.employee_id} 
                onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                disabled={loading}
              >
                <option value="">Selecione um funcionário</option>
                {employees.map(employee => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name} - {employee.department}
                  </option>
                ))}
              </select>
              <small>Se não vincular, o usuário será genérico</small>
            </div>

            <div className="form-group">
              <label>Tipo de Usuário:</label>
              <select 
                value={formData.role} 
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                disabled={loading}
              >
                <option value="employee">Funcionário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Usuário'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowForm(false)} 
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="info-card">
        <h3>💡 Tipos de Usuário</h3>
        <div className="info-content">
          <p><strong>Administrador:</strong></p>
          <ul>
            <li>Acesso completo ao sistema</li>
            <li>Gerencia funcionários e usuários</li>
            <li>Gera relatórios completos</li>
          </ul>
          
          <p><strong>Funcionário:</strong></p>
          <ul>
            <li>Registra apenas seu próprio ponto</li>
            <li>Visualiza seu histórico</li>
            <li>Acesso limitado ao dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;