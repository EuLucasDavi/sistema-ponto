import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiUsers,
  FiUserPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSave,
  FiUser,
  FiKey,
  FiBriefcase,
  FiCalendar,
  FiMail,
  FiAlertCircle,
  FiCheckCircle,
  FiUnlock,
  FiLock,
  FiInfo
} from 'react-icons/fi';

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
        const updateData = {
          username: formData.username,
          role: formData.role,
          employee_id: formData.employee_id || null
        };

        if (formData.password) {
          updateData.password = formData.password;
        }

        await axios.put(`/api/users/${editingUser._id}`, updateData);
        setSuccess('Usuário atualizado com sucesso!');
      } else {
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
      password: '',
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
      admin: { label: 'Administrador', color: 'badge-admin', icon: FiLock },
      employee: { label: 'Funcionário', color: 'badge-employee', icon: FiUser }
    };
    
    const config = roleConfig[role] || { label: role, color: 'badge-secondary', icon: FiUser };
    const IconComponent = config.icon;
    
    return (
      <span className={`badge ${config.color}`}>
        <IconComponent size={12} />
        <span>{config.label}</span>
      </span>
    );
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiUsers size={32} className="header-icon" />
          <div>
            <h1>Gerenciar Usuários</h1>
            <p>Controle de acesso e permissões do sistema</p>
          </div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={loading}
        >
          <FiUserPlus size={20} />
          <span>Novo Usuário</span>
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
                {editingUser ? (
                  <>
                    <FiEdit2 size={24} />
                    <h2>Editar Usuário</h2>
                  </>
                ) : (
                  <>
                    <FiUserPlus size={24} />
                    <h2>Criar Novo Usuário</h2>
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
                    Username
                  </label>
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
                    <FiKey size={16} />
                    Senha
                    {editingUser && <span className="optional-text"> (opcional)</span>}
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
                  <label>
                    <FiBriefcase size={16} />
                    Vincular a Funcionário
                  </label>
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
                  <small className="helper-text">
                    Se não vincular, o usuário será genérico
                  </small>
                </div>

                <div className="form-group">
                  <label>
                    <FiLock size={16} />
                    Tipo de Usuário
                  </label>
                  <select 
                    value={formData.role} 
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    disabled={loading}
                  >
                    <option value="employee">Funcionário</option>
                    <option value="admin">Administrador</option>
                  </select>
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
                      <span>{editingUser ? 'Atualizar' : 'Criar Usuário'}</span>
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={resetForm} 
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

      <div className="content-grid">
        <div className="main-content">
          <div className="table-container card">
            <div className="table-header">
              <h3>Lista de Usuários</h3>
              <span className="table-count">{users.length} usuário(s)</span>
            </div>
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
                    <td className="user-username">
                      <div className="user-info">
                        <FiUser size={16} />
                        <div>
                          <strong>{user.username}</strong>
                          {user.username === 'admin' && (
                            <div className="admin-badge">
                              <FiLock size={12} />
                              <span>Principal</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="user-role">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="user-employee">
                      {user.employee ? (
                        <div className="employee-info">
                          <div className="employee-name">
                            <FiUser size={14} />
                            <strong>{user.employee.name}</strong>
                          </div>
                          <div className="employee-email">
                            <FiMail size={12} />
                            <span>{user.employee.email}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted">Não vinculado</span>
                      )}
                    </td>
                    <td className="user-department">
                      {user.employee ? (
                        <span className="department-badge">
                          <FiBriefcase size={12} />
                          {user.employee.department}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="user-date">
                      <div className="date-info">
                        <FiCalendar size={14} />
                        <span>{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="user-actions">
                      <div className="action-buttons">
                        <button 
                          className="btn btn-edit btn-small"
                          onClick={() => handleEdit(user)}
                          disabled={loading}
                          title="Editar usuário"
                        >
                          <FiEdit2 size={14} />
                          <span>Editar</span>
                        </button>
                        
                        {user.employee && (
                          <button 
                            className="btn btn-warning btn-small"
                            onClick={() => handleUnlinkEmployee(user._id, user.username)}
                            disabled={loading}
                            title="Desvincular funcionário"
                          >
                            <FiUnlock size={14} />
                            <span>Desvincular</span>
                          </button>
                        )}
                        
                        {user.username !== 'admin' && (
                          <button 
                            className="btn btn-danger btn-small"
                            onClick={() => handleDelete(user._id, user.username)}
                            disabled={loading}
                            title="Excluir usuário"
                          >
                            <FiTrash2 size={14} />
                            <span>Excluir</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      <div className="empty-content">
                        <FiUsers size={48} />
                        <h3>Nenhum usuário cadastrado</h3>
                        <p>Clique em "Novo Usuário" para começar</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sidebar">
          <div className="info-card card">
            <div className="section-header">
              <FiInfo size={24} />
              <h3>Tipos de Usuário</h3>
            </div>
            <div className="info-content">
              <div className="info-section">
                <h4>
                  <FiLock size={16} />
                  Administrador
                </h4>
                <ul>
                  <li>Acesso completo ao sistema</li>
                  <li>Gerencia funcionários e usuários</li>
                  <li>Gera relatórios completos</li>
                  <li>Pode criar outros administradores</li>
                </ul>
              </div>
              
              <div className="info-section">
                <h4>
                  <FiUser size={16} />
                  Funcionário
                </h4>
                <ul>
                  <li>Registra apenas seu próprio ponto</li>
                  <li>Visualiza seu histórico</li>
                  <li>Acesso limitado ao dashboard</li>
                  <li>Precisa estar vinculado a um funcionário</li>
                </ul>
              </div>

              <div className="info-section">
                <h4>Dicas Importantes</h4>
                <ul>
                  <li>O usuário "admin" principal não pode ser excluído</li>
                  <li>Você pode desvincular funcionários sem excluir o usuário</li>
                  <li>Usuários sem vínculo não podem registrar ponto</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;