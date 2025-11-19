import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  FiUser, FiClock, FiCalendar, FiBriefcase, FiLogIn, FiLogOut,
  FiCheckCircle, FiAlertCircle, FiInfo, FiArrowRight, FiHome,
  FiTrendingUp, FiPauseCircle, FiWatch, FiX, FiFileText, FiCheck, FiEye
} from 'react-icons/fi';

const EmployeeDashboard = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [todayRecordsList, setTodayRecordsList] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [pauseReasons, setPauseReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [lastRecordType, setLastRecordType] = useState(undefined);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRecord, setLastRecord] = useState(null);

  const { user } = useAuth();

  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [showTimeRecordModal, setShowTimeRecordModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });

  const [absenceForm, setAbsenceForm] = useState({ date: '', reason: '', description: '' });
  const [timeRecordForm, setTimeRecordForm] = useState({ date: '', time: '', reason: '', description: '' });
  const [pauseForm, setPauseForm] = useState({ reason: '', description: '' });

  useEffect(() => {
    if (user) {
      resetState();
      fetchAllData();
    }
  }, [user?.id]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const resetState = () => {
    setEmployeeData(null);
    setRecentRecords([]);
    setTodayRecordsList([]);
    setLastRecordType(undefined);
    setMyRequests([]);
  };

  const closeAllModals = () => {
    setShowSuccessModal(false);
    setShowErrorModal(false);
    setShowPauseModal(false);
    setShowAbsenceModal(false);
    setShowTimeRecordModal(false);
    setShowRequestsModal(false);
    setModalContent({ title: '', message: '' });
  };

  const showSuccessMessage = (title, message) => {
    closeAllModals();
    setModalContent({ title, message });
    setShowSuccessModal(true);
  };

  const showErrorMessage = (title, message) => {
    closeAllModals();
    setModalContent({ title, message });
    setShowErrorModal(true);
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchEmployeeData(),
        fetchTodayRecords(),
        fetchMyRequests(),
        fetchPauseReasons()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeData = async () => {
    const response = await axios.get('/api/dashboard/stats');
    if (response.data.role === 'employee') {
      setEmployeeData(response.data.employee);
      setRecentRecords(response.data.recentRecords || []);
    }
  };

  const fetchMyRequests = async () => {
    const response = await axios.get('/api/requests');
    setMyRequests(response.data);
  };

  const fetchPauseReasons = async () => {
    const response = await axios.get('/api/pause-reasons');
    setPauseReasons(response.data);
  };

  const fetchTodayRecords = async () => {
    const today = new Date().toISOString().split('T')[0];

    const response = await axios.get('/api/me/time-records', {
      params: { start_date: today, end_date: today }
    });

    setTodayRecordsList(response.data);

    if (response.data.length > 0) {
      const lastRecordToday = response.data[response.data.length - 1];
      setLastRecordType(lastRecordToday.type);
    } else {
      setLastRecordType(null);
    }
  };

  const getAvailableActions = () => {
    if (todayRecordsList.length - 1) {
      return ['entry'];
    }

    const last = todayRecordsList[todayRecordsList.length - 1].type;

    if (last === 'entry') return ['pause', 'exit'];
    if (last === 'pause') return ['entry'];
    return ['entry'];
  };

  const registerTime = async (type, pauseReason = null) => {
    setRegisterLoading(true);
    try {
      if (type === 'pause' && pauseReason) {
        await axios.post('/api/me/time-records-with-reason', {
          type,
          pause_reason_id: pauseReason.reason === 'outro' ? null : pauseReason.reason,
          custom_reason: pauseReason.description
        });
      } else {
        await axios.post('/api/me/time-records', { type });
      }

      await fetchAllData();

      setLastRecord({
        type,
        timestamp: new Date().toLocaleString('pt-BR'),
        employee: employeeData?.name
      });

      if (type === 'pause') setShowPauseModal(false);

      const actionNames = { entry: 'Entrada', pause: 'Pausa', exit: 'Saída' };
      showSuccessMessage('Registro Confirmado', `${actionNames[type]} registrada com sucesso às ${new Date().toLocaleTimeString('pt-BR')}`);

    } catch (error) {
      await fetchTodayRecords();
      showErrorMessage('Erro no Registro', error.response?.data?.error || 'Erro ao registrar ponto');
    } finally {
      setRegisterLoading(false);
    }
  };

  const submitRequest = async (type, formData) => {
    await axios.post('/api/requests', {
      type,
      date: formData.date,
      reason: formData.reason,
      description: formData.description || '',
      requested_time: type === 'time_record' ? formData.time : null
    });

    if (type === 'absence') {
      setShowAbsenceModal(false);
      setAbsenceForm({ date: '', reason: '', description: '' });
    } else {
      setShowTimeRecordModal(false);
      setTimeRecordForm({ date: '', time: '', reason: '', description: '' });
    }

    await fetchMyRequests();

    const labels = { absence: 'Ausência', time_record: 'Registro de Ponto' };
    showSuccessMessage('Solicitação Enviada', `Sua solicitação de ${labels[type]} foi enviada com sucesso!`);
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { class: 'warning', text: 'Pendente', icon: <FiClock size={14} /> },
      approved: { class: 'success', text: 'Aprovada', icon: <FiCheck size={14} /> },
      rejected: { class: 'danger', text: 'Rejeitada', icon: <FiX size={14} /> }
    }[status];

    return (
      <span className={`badge badge-${config.class}`}>
        {config.icon}
        <span style={{ marginLeft: '4px' }}>{config.text}</span>
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const config = {
      absence: { class: 'info', text: 'Ausência', icon: <FiCalendar size={14} /> },
      time_record: { class: 'primary', text: 'Registro de Ponto', icon: <FiWatch size={14} /> }
    }[type];

    return (
      <span className={`badge badge-${config.class}`}>
        {config.icon}
        <span style={{ marginLeft: '4px' }}>{config.text}</span>
      </span>
    );
  };

  const availableActions = getAvailableActions(lastRecordType);
  const pendingRequestsCount = myRequests.filter(req => req.status === 'pending').length;

  if (loading || lastRecordType === undefined) {
    return (
      <div className="loading-container">
        <div className="loading">Carregando seus dados...</div>
      </div>
    );
  }

  return (
    <div className="container">

      <div className="header">
        <div className="header-title">
          <FiHome className="header-icon" size={32} />
          <div>
            <h1>Meu Painel</h1>
            <p className="text-muted">Controle seus registros de ponto</p>
          </div>
        </div>
      </div>

      {employeeData ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><FiUser size={24} /></div>
              <h3>Funcionário</h3>
              <div className="stat-number">{employeeData.name.split(' ')[0]}</div>
              <p>Seu perfil ativo</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon"><FiBriefcase size={24} /></div>
              <h3>Departamento</h3>
              <div className="stat-number">{employeeData.department}</div>
              <p>Área de atuação</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon"><FiClock size={24} /></div>
              <h3>Registros Hoje</h3>
              <div className="stat-number">{todayRecordsList.length}</div>
              <p>Pontos registrados hoje</p>
            </div>

            <div className="stat-card clickable" onClick={() => setShowRequestsModal(true)}>
              <div className="stat-icon"><FiFileText size={24} /></div>
              <h3>Solicitações</h3>
              <div className="stat-number">{pendingRequestsCount}</div>
              <p>Pendentes de aprovação</p>
            </div>
          </div>

          <div className="time-clock-container">
            <div className="time-clock-card">

              <div className="current-time">
                <div className="date-display">
                  {currentTime.toLocaleDateString('pt-BR', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </div>
                <div className="time-display">
                  {currentTime.toLocaleTimeString('pt-BR')}
                </div>
              </div>

              <div className="time-buttons">
                {availableActions.includes('entry') && (
                  <button
                    className="btn btn-success btn-large"
                    onClick={() => registerTime('entry')}
                    disabled={registerLoading}
                  >
                    <FiLogIn size={20} />
                    {lastRecordType === 'pause'
                      ? <span>Retornar do Almoço</span>
                      : lastRecordType === 'exit'
                        ? <span>Novo Turno</span>
                        : <span>Registrar Entrada</span>}
                  </button>
                )}

                {availableActions.includes('pause') && (
                  <button
                    className="btn btn-warning btn-large"
                    onClick={() => setShowPauseModal(true)}
                    disabled={registerLoading}
                  >
                    <FiPauseCircle size={20} />
                    <span>Registrar Pausa</span>
                  </button>
                )}

                {availableActions.includes('exit') && (
                  <button
                    className="btn btn-danger btn-large"
                    onClick={() => registerTime('exit')}
                    disabled={registerLoading}
                  >
                    <FiLogOut size={20} />
                    <span>Registrar Saída</span>
                  </button>
                )}
              </div>

              <div className="request-buttons" style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee' }}>
                <h4 style={{ marginBottom: 15, color: '#555' }}>Solicitações</h4>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-info" onClick={() => setShowAbsenceModal(true)}>
                    <FiCalendar size={16} />
                    <span>Justificar Ausência</span>
                  </button>

                  <button className="btn btn-warning" onClick={() => setShowTimeRecordModal(true)}>
                    <FiWatch size={16} />
                    <span>Solicitar Ponto</span>
                  </button>

                  <button className="btn btn-secondary" onClick={() => setShowRequestsModal(true)}>
                    <FiEye size={16} />
                    <span>Ver Minhas Solicitações</span>
                    {pendingRequestsCount > 0 && (
                      <span className="badge badge-danger" style={{ marginLeft: 8 }}>
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {lastRecord && (
                <div className="last-record-card">
                  <div className="section-header">
                    <FiCheckCircle size={20} />
                    <h4>Último Registro Confirmado</h4>
                  </div>
                  <div className="record-details">
                    <div className="record-item">
                      <strong>Tipo</strong>
                      <span className={`record-type ${lastRecord.type}`}>
                        {lastRecord.type === 'entry' ? 'Entrada' :
                          lastRecord.type === 'pause' ? 'Pausa' : 'Saída'}
                      </span>
                    </div>
                    <div className="record-item">
                      <strong>Horário</strong>
                      <span>{lastRecord.timestamp}</span>
                    </div>
                  </div>
                </div>
              )}

              {todayRecordsList.length > 0 && (
                <div className="today-records-card">
                  <div className="section-header">
                    <FiClock size={16} />
                    <h5>Seus Registros de Hoje</h5>
                  </div>
                  <div className="today-records-list">
                    {todayRecordsList.map(record => (
                      <div key={record._id} className="today-record-item">
                        <span className={`record-badge ${record.type}`}>
                          {record.type === 'entry' ? '→' :
                            record.type === 'pause' ? '⏸' : '←'}
                        </span>
                        <span>{new Date(record.timestamp).toLocaleTimeString('pt-BR')}</span>
                        <span className={`record-type-small ${record.type}`}>
                          {record.type === 'entry' ? 'Entrada' :
                            record.type === 'pause' ? 'Pausa' : 'Saída'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="stats-sidebar">
              <div className="stat-card">
                <div className="stat-icon"><FiTrendingUp size={20} /></div>
                <div className="stat-content">
                  <div className="stat-number">{todayRecordsList.length}</div>
                  <div className="stat-label">Registros Hoje</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><FiCalendar size={20} /></div>
                <div className="stat-content">
                  <div className="stat-number">{recentRecords.length}</div>
                  <div className="stat-label">Registros Este Mês</div>
                </div>
              </div>
            </div>
          </div>

          {showSuccessModal && (
            <div className="modal-overlay">
              <div className="modal success-modal">
                <div className="modal-header success-header">
                  <FiCheckCircle size={24} className="success-icon" />
                  <h3>{modalContent.title}</h3>
                  <button className="btn-close-modal" onClick={closeAllModals}><FiX size={20} /></button>
                </div>
                <div className="modal-body">
                  <p>{modalContent.message}</p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-success" onClick={closeAllModals}>
                    <FiCheck size={16} />
                    <span>OK</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {showErrorModal && (
            <div className="modal-overlay">
              <div className="modal error-modal">
                <div className="modal-header error-header">
                  <FiAlertCircle size={24} className="error-icon" />
                  <h3>{modalContent.title}</h3>
                  <button className="btn-close-modal" onClick={closeAllModals}><FiX size={20} /></button>
                </div>
                <div className="modal-body">
                  <p>{modalContent.message}</p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-danger" onClick={closeAllModals}>
                    <FiX size={16} />
                    <span>Fechar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPauseModal && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Registrar Pausa</h3>
                  <button className="btn-close-modal" onClick={() => setShowPauseModal(false)}><FiX size={20} /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Motivo da Pausa *</label>
                    <select
                      value={pauseForm.reason}
                      onChange={(e) => setPauseForm({ ...pauseForm, reason: e.target.value })}
                      required
                    >
                      <option value="">Selecione um motivo</option>
                      {pauseReasons.map(reason => (
                        <option key={reason._id} value={reason._id}>
                          {reason.name} {reason.description && `- ${reason.description}`}
                        </option>
                      ))}
                      <option value="outro">Outro (especifique abaixo)</option>
                    </select>
                  </div>

                  {pauseForm.reason === 'outro' && (
                    <div className="form-group">
                      <label>Descrição *</label>
                      <input
                        type="text"
                        value={pauseForm.description}
                        onChange={(e) => setPauseForm({ ...pauseForm, description: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {pauseForm.reason !== 'outro' && pauseForm.reason !== '' && (
                    <div className="form-group">
                      <label>Observações adicionais</label>
                      <textarea
                        rows="3"
                        value={pauseForm.description}
                        onChange={(e) => setPauseForm({ ...pauseForm, description: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowPauseModal(false)}>Cancelar</button>
                  <button
                    className="btn btn-primary"
                    disabled={!pauseForm.reason || registerLoading}
                    onClick={() => registerTime('pause', pauseForm)}
                  >
                    <FiPauseCircle size={16} />
                    Registrar Pausa
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAbsenceModal && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Solicitar Ausência</h3>
                  <button className="btn-close-modal" onClick={() => setShowAbsenceModal(false)}><FiX size={20} /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Data *</label>
                    <input type="date" value={absenceForm.date} onChange={(e) => setAbsenceForm({ ...absenceForm, date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Motivo *</label>
                    <select value={absenceForm.reason} onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })} required>
                      <option value="">Selecione</option>
                      {pauseReasons.map(reason => (
                        <option key={reason._id} value={reason.name}>{reason.name}</option>
                      ))}
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Descrição</label>
                    <textarea
                      rows="4"
                      value={absenceForm.description}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowAbsenceModal(false)}>Cancelar</button>
                  <button
                    className="btn btn-primary"
                    disabled={!absenceForm.date || !absenceForm.reason}
                    onClick={() => submitRequest('absence', absenceForm)}
                  >
                    Enviar Solicitação
                  </button>
                </div>
              </div>
            </div>
          )}

          {showTimeRecordModal && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Solicitar Registro de Ponto</h3>
                  <button className="btn-close-modal" onClick={() => setShowTimeRecordModal(false)}><FiX size={20} /></button>
                </div>
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Data *</label>
                      <input type="date" value={timeRecordForm.date} onChange={(e) => setTimeRecordForm({ ...timeRecordForm, date: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Horário *</label>
                      <input type="time" value={timeRecordForm.time} onChange={(e) => setTimeRecordForm({ ...timeRecordForm, time: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Motivo *</label>
                    <select value={timeRecordForm.reason} onChange={(e) => setTimeRecordForm({ ...timeRecordForm, reason: e.target.value })} required>
                      <option value="">Selecione</option>
                      {pauseReasons.map(reason => (
                        <option key={reason._id} value={reason.name}>{reason.name}</option>
                      ))}
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Descrição</label>
                    <textarea
                      rows="4"
                      value={timeRecordForm.description}
                      onChange={(e) => setTimeRecordForm({ ...timeRecordForm, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowTimeRecordModal(false)}>Cancelar</button>
                  <button
                    className="btn btn-primary"
                    disabled={!timeRecordForm.date || !timeRecordForm.time || !timeRecordForm.reason}
                    onClick={() => submitRequest('time_record', timeRecordForm)}
                  >
                    Enviar Solicitação
                  </button>
                </div>
              </div>
            </div>
          )}

          {showRequestsModal && (
            <div className="modal-overlay">
              <div className="modal large">
                <div className="modal-header">
                  <h3>Minhas Solicitações</h3>
                  <button className="btn-close-modal" onClick={() => setShowRequestsModal(false)}><FiX size={20} /></button>
                </div>
                <div className="modal-body">
                  {myRequests.length === 0 ? (
                    <div className="empty-state">
                      <FiFileText size={48} />
                      <h4>Nenhuma solicitação encontrada</h4>
                      <p>Você ainda não fez nenhuma solicitação.</p>
                    </div>
                  ) : (
                    <div className="requests-list">
                      {myRequests.map(request => (
                        <div key={request._id} className="request-item">
                          <div className="request-header">
                            <div className="request-type">
                              {getTypeBadge(request.type)}
                              {getStatusBadge(request.status)}
                            </div>
                            <div className="request-date">
                              {new Date(request.date).toLocaleDateString('pt-BR')}
                              {request.requested_time && (
                                <span> às {new Date(request.requested_time).toLocaleTimeString('pt-BR')}</span>
                              )}
                            </div>
                          </div>

                          <div className="request-details">
                            <div className="detail"><strong>Motivo:</strong> {request.reason}</div>
                            {request.description && (
                              <div className="detail">
                                <strong>Descrição:</strong>
                                <div className="description-content">{request.description}</div>
                              </div>
                            )}
                            {request.admin_notes && (
                              <div className="detail admin-notes">
                                <strong>Observações do Admin:</strong>
                                <div className="description-content">{request.admin_notes}</div>
                              </div>
                            )}
                            {request.processed_at && (
                              <div className="detail">
                                <strong>Processado em:</strong>
                                {new Date(request.processed_at).toLocaleString('pt-BR')}
                              </div>
                            )}
                          </div>

                          <FiArrowRight className="recent-item-arrow" size={16} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" onClick={() => setShowRequestsModal(false)}>Fechar</button>
                </div>
              </div>
            </div>
          )}

          <div className="recent-section">
            <div className="section-header">
              <FiClock size={24} />
              <h3>Meus Últimos Registros</h3>
            </div>
            <div className="recent-list">
              {recentRecords.length > 0 ? (
                recentRecords.slice(0, 5).map(record => (
                  <div key={record._id} className="recent-item">
                    <div className="recent-item-content">
                      <div className="recent-item-main">
                        <div>
                          <strong>{new Date(record.timestamp).toLocaleDateString('pt-BR')}</strong>
                          <span> às </span>
                          <strong>{new Date(record.timestamp).toLocaleTimeString('pt-BR')}</strong>
                        </div>
                        <span className={`record-type ${record.type}`}>
                          {record.type === 'entry' ? 'ENTRADA' :
                            record.type === 'pause' ? 'PAUSA' : 'SAÍDA'}
                        </span>
                      </div>
                    </div>
                    <FiArrowRight className="recent-item-arrow" size={16} />
                  </div>
                ))
              ) : (
                <div className="recent-item">
                  <div className="recent-item-content">
                    <span className="text-muted">Nenhum registro encontrado neste mês</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="info-card card">
            <div className="section-header">
              <FiInfo size={24} />
              <h3>Como Usar o Sistema</h3>
            </div>
            <div className="info-content">
              <div className="info-section">
                <h4><FiLogIn size={18} /> Registro de Ponto</h4>
                <ul>
                  <li>Entrada ao chegar</li>
                  <li>Pausa para almoço/café</li>
                  <li>Retorno após pausas</li>
                  <li>Saída ao finalizar</li>
                  <li>Novo turno se necessário</li>
                </ul>
              </div>

              <div className="info-section">
                <h4>Solicitações</h4>
                <ul>
                  <li>Justificar ausência</li>
                  <li>Solicitar ponto esquecido</li>
                  <li>Acompanhar status</li>
                </ul>
              </div>

              <div className="info-section">
                <h4>Pausas</h4>
                <ul>
                  <li>Todas exigem justificativa</li>
                  <li>Após pausar, usar “Retornar do Almoço”</li>
                </ul>
              </div>
            </div>
          </div>

        </>
      ) : (
        <div className="info-card error-card">
          <div className="section-header">
            <FiAlertCircle size={24} />
            <h3>Funcionário Não Vinculado</h3>
          </div>
          <p>Seu usuário não está vinculado a um funcionário.</p>
          <div className="quick-actions">
            <button className="btn btn-primary"><FiUser size={18} /><span>Solicitar Vinculação</span></button>
            <button className="btn btn-secondary"><FiInfo size={18} /><span>Contatar Administrador</span></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
