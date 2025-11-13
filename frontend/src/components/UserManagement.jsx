import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      setError('');
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setError('Erro ao carregar usuários');
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
    setSuccess('');

    try {
      if (editingUser) {
        // Editar usuário existente
        const updateData = {
          username: formData.username,
          role: formData.role,
          employee_id: formData.employee_id || null
        };

        // Incluir senha apenas se fornecida
        if (formData.password) {
          updateData.password = formData.password;
        }

        await axios.put(`/api/users/${editingUser._id}`, updateData);
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário
        await axios.post('/api/register', formData);
        setSuccess('Usuário criado com sucesso!');
      }
      
      await fetchUsers();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      setError(error.response?.data?.error || 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Senha em branco para edição
      employee_id: user.employee_id || '',
      role: user.role
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`/api/users/${userId}`);
      setSuccess('Usuário excluído com sucesso!');
      await fetchUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      setError(error.response?.data?.error || 'Erro ao excluir usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkEmployee = async (userId, username) => {
    if (!window.confirm(`Tem certeza que deseja desvincular o funcionário do usuário "${username}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await axios.put(`/api/users/${userId}/unlink-employee`);
      setSuccess('Funcionário desvinculado com sucesso!');
      await fetchUsers();
    } catch (error) {
      console.error('Erro ao desvincular funcionário:', error);
      setError(error.response?.data?.error || 'Erro ao desvincular funcionário');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      employee_id: '',
      role: 'employee'
    });
    setEditingUser(null);
    setShowForm(false);
    setError('');
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: 'Administrador', color: 'btn-delete' },
      employee: { label: 'Funcionário', color: 'btn-edit' }
    };
    
    const config = roleConfig[role] || { label: role, color: 'btn-secondary' };
    return <span className={`btn ${config.color} btn-small`}>{config.label}</span>;
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
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          ✅ {success}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h2>{editingUser ? '✏️ Editar Usuário' : '👤 Criar Novo Usuário'}</h2>
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
              <label>
                Senha:
                {editingUser && <small> (Deixe em branco para manter a atual)</small>}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                disabled={loading}
                placeholder={editingUser ? "Nova senha (opcional)" : "Senha para acesso"}
                required={!editingUser}
              />
            </div>

            <div className="form-group">
              <label>Vincular a Funcionário:</label>
              <select 
                value={formData.employee_id} 
                onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                disabled={loading}
              >
                <option value="">Selecione um funcionário (opcional)</option>
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
                {loading ? 'Salvando...' : (editingUser ? 'Atualizar' : 'Criar Usuário')}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={resetForm} 
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <h3>📋 Lista de Usuários</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Tipo</th>
              <th>Funcionário Vinculado</th>
              <th>Departamento</th>
              <th>Data Criação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>
                  <strong>{user.username}</strong>
                  {user.username === 'admin' && (
                    <div><small className="badge-admin">🔑 Principal</small></div>
                  )}
                </td>
                <td>{getRoleBadge(user.role)}</td>
                <td>
                  {user.employee ? (
                    <div>
                      <strong>{user.employee.name}</strong>
                      <br />
                      <small>{user.employee.email}</small>
                    </div>
                  ) : (
                    <span className="text-muted">Não vinculado</span>
                  )}
                </td>
                <td>
                  {user.employee ? (
                    <span className="department-badge">{user.employee.department}</span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td>
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn btn-edit btn-small"
                      onClick={() => handleEdit(user)}
                      disabled={loading}
                      title="Editar usuário"
                    >
                      Editar
                    </button>
                    
                    {user.employee && (
                      <button 
                        className="btn btn-warning btn-small"
                        onClick={() => handleUnlinkEmployee(user._id, user.username)}
                        disabled={loading}
                        title="Desvincular funcionário"
                      >
                        Desvincular
                      </button>
                    )}
                    
                    {user.username !== 'admin' && (
                      <button 
                        className="btn btn-delete btn-small"
                        onClick={() => handleDelete(user._id, user.username)}
                        disabled={loading}
                        title="Excluir usuário"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            
            {users.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                  Nenhum usuário cadastrado. Clique em "Novo Usuário" para começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="info-card">
        <h3>💡 Tipos de Usuário</h3>
        <div className="info-content">
          <p><strong>Administrador:</strong></p>
          <ul>
            <li>Acesso completo ao sistema</li>
            <li>Gerencia funcionários e usuários</li>
            <li>Gera relatórios completos</li>
            <li>Pode criar outros administradores</li>
          </ul>
          
          <p><strong>Funcionário:</strong></p>
          <ul>
            <li>Registra apenas seu próprio ponto</li>
            <li>Visualiza seu histórico</li>
            <li>Acesso limitado ao dashboard</li>
            <li>Precisa estar vinculado a um funcionário</li>
          </ul>

          <p><strong>Dicas:</strong></p>
          <ul>
            <li>O usuário "admin" principal não pode ser excluído</li>
            <li>Você pode desvincular funcionários sem excluir o usuário</li>
            <li>Usuários sem vínculo não podem registrar ponto</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;