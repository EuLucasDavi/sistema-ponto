import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiList,
  FiPlus,
  FiTrash2,
  FiEdit,
  FiSave,
  FiX,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi';

const PauseReasons = () => {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchReasons();
  }, []);

  const fetchReasons = async () => {
    try {
      setError('');
      const response = await axios.get('/api/pause-reasons');
      setReasons(response.data);
    } catch (error) {
      console.error('Erro ao buscar justificativas:', error);
      setError('Erro ao carregar justificativas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    try {
      setError('');
      
      if (editingId) {
        // Editar existente
        await axios.put(`/api/pause-reasons/${editingId}`, formData);
      } else {
        // Criar novo
        await axios.post('/api/pause-reasons', formData);
      }

      await fetchReasons();
      resetForm();
      
    } catch (error) {
      console.error('Erro ao salvar justificativa:', error);
      setError(error.response?.data?.error || 'Erro ao salvar justificativa');
    }
  };

  const handleEdit = (reason) => {
    setFormData({
      name: reason.name,
      description: reason.description
    });
    setEditingId(reason._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta justificativa?')) {
      return;
    }

    try {
      await axios.delete(`/api/pause-reasons/${id}`);
      await fetchReasons();
    } catch (error) {
      console.error('Erro ao excluir justificativa:', error);
      setError(error.response?.data?.error || 'Erro ao excluir justificativa');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Carregando justificativas...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiList size={32} className="header-icon" />
          <div>
            <h1>Justificativas de Pausa</h1>
            <p>Gerencie os motivos para pausas dos funcionários</p>
          </div>
        </div>
        
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          <FiPlus size={18} />
          <span>Nova Justificativa</span>
        </button>
      </div>

      {error && (
        <div className="error-message">
          <FiAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="card form-card">
          <div className="card-header">
            <h3>{editingId ? 'Editar' : 'Nova'} Justificativa</h3>
            <button className="btn btn-text" onClick={resetForm}>
              <FiX size={18} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nome da Justificativa *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Reunião, Médico, Almoço..."
                required
              />
            </div>
            
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição detalhada da justificativa..."
                rows="3"
              />
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                <FiX size={16} />
                <span>Cancelar</span>
              </button>
              
              <button type="submit" className="btn btn-primary">
                {editingId ? <FiSave size={16} /> : <FiPlus size={16} />}
                <span>{editingId ? 'Atualizar' : 'Criar'} Justificativa</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Justificativas */}
      <div className="reasons-grid">
        {reasons.length === 0 ? (
          <div className="empty-state">
            <FiList size={48} />
            <h3>Nenhuma justificativa cadastrada</h3>
            <p>Clique em "Nova Justificativa" para adicionar a primeira.</p>
          </div>
        ) : (
          reasons.map(reason => (
            <div key={reason._id} className="reason-card">
              <div className="reason-content">
                <h4>{reason.name}</h4>
                {reason.description && (
                  <p className="reason-description">{reason.description}</p>
                )}
                <div className="reason-meta">
                  <small>
                    Criado em: {new Date(reason.created_at).toLocaleDateString('pt-BR')}
                  </small>
                </div>
              </div>
              
              <div className="reason-actions">
                <button
                  className="btn btn-text btn-sm"
                  onClick={() => handleEdit(reason)}
                  title="Editar"
                >
                  <FiEdit size={16} />
                </button>
                
                <button
                  className="btn btn-text btn-sm btn-danger"
                  onClick={() => handleDelete(reason._id)}
                  title="Excluir"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PauseReasons;