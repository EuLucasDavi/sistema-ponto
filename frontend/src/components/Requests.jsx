import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiClock,
  FiCalendar,
  FiUser,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiInfo,
  FiFileText,
  FiWatch
} from 'react-icons/fi';

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setError('');
      const response = await axios.get('/api/requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      setError('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId, status, adminNotes = '') => {
    setActionLoading(requestId);
    setError('');

    try {
      await axios.put(`/api/requests/${requestId}/status`, {
        status,
        admin_notes: adminNotes
      });

      await fetchRequests(); // Recarregar a lista
    } catch (error) {
      console.error('Erro ao atualizar solicitação:', error);
      setError(error.response?.data?.error || 'Erro ao processar solicitação');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'warning', text: 'Pendente' },
      approved: { class: 'success', text: 'Aprovada' },
      rejected: { class: 'danger', text: 'Rejeitada' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`badge badge-${config.class}`}>{config.text}</span>;
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      absence: { class: 'info', text: 'Ausência', icon: <FiCalendar size={14} /> },
      time_record: { class: 'primary', text: 'Registro de Ponto', icon: <FiClock size={14} /> }
    };

    const config = typeConfig[type] || typeConfig.absence;
    return (
      <span className={`badge badge-${config.class}`}>
        {config.icon}
        <span style={{ marginLeft: '4px' }}>{config.text}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Carregando solicitações...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiFileText size={32} className="header-icon" />
          <div>
            <h1>Solicitações</h1>
            <p>Gerencie solicitações de ausência e registro de ponto</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <FiAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="requests-container">
        {requests.length === 0 ? (
          <div className="empty-state">
            <FiInfo size={48} />
            <h3>Nenhuma solicitação encontrada</h3>
            <p>Não há solicitações pendentes ou históricas no momento.</p>
          </div>
        ) : (
          <div className="requests-list">
            {requests.map(request => (
              <div key={request._id} className="request-card">
                <div className="request-header">
                  <div className="request-title">
                    <h4>{request.employee_name}</h4>
                    <div className="request-meta">
                      {getTypeBadge(request.type)}
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                  <div className="request-date">
                    <FiCalendar size={14} />
                    <span>{new Date(request.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="request-details">
                  <div className="detail-item">
                    <strong>Departamento:</strong>
                    <span>{request.employee_department}</span>
                  </div>
                  
                  <div className="detail-item">
                    <strong>Solicitante:</strong>
                    <span>{request.username}</span>
                  </div>

                  {request.type === 'time_record' && request.requested_time && (
                    <div className="detail-item">
                      <strong>Horário solicitado:</strong>
                      <span>{new Date(request.requested_time).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  )}

                  <div className="detail-item">
                    <strong>Motivo:</strong>
                    <span>{request.reason}</span>
                  </div>

                  {request.description && (
                    <div className="detail-item">
                      <strong>Descrição:</strong>
                      <p className="request-description">{request.description}</p>
                    </div>
                  )}

                  {request.admin_notes && (
                    <div className="detail-item">
                      <strong>Observações do admin:</strong>
                      <p className="admin-notes">{request.admin_notes}</p>
                    </div>
                  )}

                  {request.processed_at && (
                    <div className="detail-item">
                      <strong>Processado em:</strong>
                      <span>{new Date(request.processed_at).toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className="request-actions">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => updateRequestStatus(request._id, 'approved')}
                      disabled={actionLoading === request._id}
                    >
                      {actionLoading === request._id ? (
                        <div className="loading-spinner"></div>
                      ) : (
                        <>
                          <FiCheck size={16} />
                          <span>Aprovar</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        const notes = prompt('Digite o motivo da rejeição:');
                        if (notes !== null) {
                          updateRequestStatus(request._id, 'rejected', notes);
                        }
                      }}
                      disabled={actionLoading === request._id}
                    >
                      {actionLoading === request._id ? (
                        <div className="loading-spinner"></div>
                      ) : (
                        <>
                          <FiX size={16} />
                          <span>Rejeitar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;