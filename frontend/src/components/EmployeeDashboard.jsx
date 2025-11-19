import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  FiUser, FiClock, FiCalendar, FiBriefcase, FiLogIn, FiLogOut,
  FiCheckCircle, FiAlertCircle, FiInfo, FiArrowRight, FiHome,
  FiTrendingUp, FiPauseCircle, FiWatch, FiX, FiFileText, FiCheck, FiEye, FiUserPlus, FiEdit2, FiSave
} from 'react-icons/fi';

const EmployeeDashboard = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [todayRecordsList, setTodayRecordsList] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [pauseReasons, setPauseReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);
  // CORREÇÃO: Inicializado como undefined para controle de estado de carregamento.
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
    setMyRequests([]);
    setLastRecordType(undefined); 
    setLastRecord(null);
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
    } catch (err) {
      console.error('Erro ao buscar todos os dados:', err);
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
    
    // Define o último registro e o tipo
    if (response.data.length > 0) {
      setLastRecordType(response.data[0].type);
      setLastRecord(response.data[0]);
    } else {
      setLastRecordType(null); // Nenhum registro hoje
      setLastRecord(null);
    }
  };

  // CORREÇÃO: Lógica para determinar as ações de ponto disponíveis
  const availableActions = useMemo(() => {
    if (lastRecordType === undefined) {
      // Estado inicial (carregando)
      return [];
    }

    if (lastRecordType === null) {
      // Nenhum registro hoje
      return ['entry'];
    }

    switch (lastRecordType) {
      case 'entry':
        // Após Entrada/Retorno, só pode Pausar ou Sair
        return ['pause', 'exit'];
      case 'pause':
        // Após Pausa, só pode Retornar (chamado de 'return' no frontend, que é 'entry' no backend)
        return ['return'];
      case 'exit':
        // Após Saída, o dia está encerrado. Permite nova 'entry' para novo turno, se necessário.
        return ['entry'];
      default:
        return [];
    }
  }, [lastRecordType]);

  const handleRegisterRecord = async (type) => {
    let apiType = type;
    let payload = {};

    // Mapeia a ação de Retorno
    if (type === 'return') {
      apiType = 'entry'; // Envia 'entry' para o backend
    } 
    
    // Se for pausa, abre o modal
    if (type === 'pause') {
      setShowPauseModal(true);
      return;
    }

    setRegisterLoading(true);
    closeAllModals();
    

    try {
      const response = await axios.post('/api/time-records', { type: apiType, ...payload });

      const actionText = apiType === 'entry' ? (type === 'return' ? 'Retorno' : 'Entrada') : (apiType === 'exit' ? 'Saída' : response.data.type);
      
      showSuccessMessage(
        'Ponto Registrado!',
        `Seu registro de ${actionText} foi efetuado com sucesso.`
      );
      
      // Atualiza os dados para recalcular o estado dos botões
      await fetchAllData();

    } catch (err) {
      const serverError = err.response?.data?.error;
      showErrorMessage('Erro ao Registrar Ponto', serverError || 'Ocorreu um erro ao tentar registrar o ponto.');
    } finally {
      setRegisterLoading(false);
    }
  };
  
  const handlePauseSubmit = async () => {
    if (!pauseForm.reason) {
      showErrorMessage('Erro de Pausa', 'Motivo da pausa é obrigatório.');
      return;
    }
    
    const pausePayload = {
      type: 'pause',
      pause_reason_id: pauseForm.reason,
      custom_reason: pauseForm.reason === 'outro' ? pauseForm.description : null,
    };

    setRegisterLoading(true);
    setShowPauseModal(false);
    

    try {
      await axios.post('/api/time-records', pausePayload);

      showSuccessMessage(
        'Pausa Registrada!',
        `Seu registro de Pausa foi efetuado com sucesso por: ${pauseForm.reason === 'outro' ? pauseForm.description : pauseReasons.find(r => r._id === pauseForm.reason)?.name}.`
      );
      
      // Reseta e atualiza
      setPauseForm({ reason: '', description: '' });
      await fetchAllData();

    } catch (err) {
      const serverError = err.response?.data?.error;
      showErrorMessage('Erro ao Registrar Pausa', serverError || 'Ocorreu um erro ao tentar registrar a pausa.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleAbsenceSubmit = async (e) => {
    e.preventDefault();
    if (!absenceForm.date || !absenceForm.reason) {
      showErrorMessage('Erro', 'Data e Motivo são obrigatórios.');
      return;
    }
    await submitRequest('absence', {
      date: absenceForm.date,
      reason: absenceForm.reason,
      description: absenceForm.description,
    });
    setAbsenceForm({ date: '', reason: '', description: '' });
  };
  
  const handleTimeRecordSubmit = async (e) => {
    e.preventDefault();
    if (!timeRecordForm.date || !timeRecordForm.time || !timeRecordForm.reason) {
      showErrorMessage('Erro', 'Data, Hora e Motivo são obrigatórios.');
      return;
    }
    await submitRequest('time_record', {
      date: timeRecordForm.date,
      time: timeRecordForm.time,
      reason: timeRecordForm.reason,
      description: timeRecordForm.description,
    });
    setTimeRecordForm({ date: '', time: '', reason: '', description: '' });
  };

  const submitRequest = async (type, formData) => {
    setRegisterLoading(true);
    closeAllModals();
    try {
      await axios.post('/api/requests', { type, ...formData });
      showSuccessMessage('Solicitação Enviada!', `Sua solicitação de ${type === 'absence' ? 'ausência' : 'ajuste de ponto'} foi enviada para aprovação.`);
      await fetchMyRequests(); // Atualiza a lista de solicitações
    } catch (err) {
      const serverError = err.response?.data?.error;
      showErrorMessage('Erro ao Enviar Solicitação', serverError || 'Ocorreu um erro ao enviar a solicitação.');
    } finally {
      setRegisterLoading(false);
    }
  };
  
  const pendingRequestsCount = myRequests.filter(r => r.status === 'pending').length;
  
  // Funções de formatação
  const formatTime = (date) => new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatDateTime = (date) => new Date(date).toLocaleDateString('pt-BR') + ' ' + formatTime(date);
  
  const getRecordBadge = (type) => {
    const config = {
      entry: { class: 'success', text: 'Entrada/Retorno', icon: <FiLogIn size={14} /> },
      pause: { class: 'warning', text: 'Pausa', icon: <FiPauseCircle size={14} /> },
      exit: { class: 'danger', text: 'Saída', icon: <FiLogOut size={14} /> }
    }[type] || { class: 'secondary', text: 'Desconhecido', icon: <FiInfo size={14} /> };
    return (
      <span className={`badge badge-${config.class}`}>
        {config.icon} <span style={{ marginLeft: '4px' }}>{config.text}</span>
      </span>
    );
  };
  
  const getTypeBadge = (type, status) => {
    const config = { 
        absence: { class: 'info', text: 'Ausência', icon: <FiCalendar size={14} /> }, 
        time_record: { class: 'primary', text: 'Registro de Ponto', icon: <FiWatch size={14} /> } 
    }[type];
    
    let statusConfig = {};
    switch(status) {
        case 'pending': statusConfig = { class: 'warning', text: 'Pendente', icon: <FiAlertCircle size={14} /> }; break;
        case 'approved': statusConfig = { class: 'success', text: 'Aprovada', icon: <FiCheckCircle size={14} /> }; break;
        case 'rejected': statusConfig = { class: 'danger', text: 'Rejeitada', icon: <FiX size={14} /> }; break;
        default: statusConfig = { class: 'secondary', text: 'Status Desconhecido', icon: <FiInfo size={14} /> };
    }
    
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span className={`badge badge-${config.class}`}>
          {config.icon} <span style={{ marginLeft: '4px' }}>{config.text}</span>
        </span>
        <span className={`badge badge-${statusConfig.class}`}>
          {statusConfig.icon} <span style={{ marginLeft: '4px' }}>{statusConfig.text}</span>
        </span>
      </div>
    );
  };

  const getStatusClass = (status) => {
    if (status === 'approved') return 'status-approved';
    if (status === 'rejected') return 'status-rejected';
    return 'status-pending';
  };

  if (loading || lastRecordType === undefined) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '50px' }}>
        <FiClock size={40} className="spin-icon" style={{ color: '#007bff' }} />
        <h2>Carregando Dashboard...</h2>
        <p>Aguarde enquanto buscamos seus dados.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <FiHome className="header-icon" size={32} />
          <div>
            <h1>Dashboard do Funcionário</h1>
            <p className="text-muted">Bem-vindo(a), {employeeData?.name || user.email}.</p>
          </div>
        </div>
        <div className="current-time-box">
          <FiClock size={20} />
          <span>{currentTime.toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>

      {employeeData ? (
        <>
          {/* Seção de Mensagens */}
          {showErrorModal && <Modal type="error" content={modalContent} onClose={closeAllModals} />}
          {showSuccessModal && <Modal type="success" content={modalContent} onClose={closeAllModals} />}

          {/* Card de Ações de Ponto */}
          <div className="time-record-card card">
            <div className="section-header">
              <FiClock size={24} />
              <h3>Registro de Ponto</h3>
            </div>
            
            <div className="quick-actions">
              {availableActions.includes('entry') && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleRegisterRecord('entry')}
                  disabled={registerLoading}
                >
                  <FiLogIn size={16} />
                  {registerLoading ? 'Registrando...' : 'Entrada (Início do Dia/Turno)'}
                </button>
              )}
              
              {availableActions.includes('return') && (
                <button
                  className="btn btn-success"
                  onClick={() => handleRegisterRecord('return')}
                  disabled={registerLoading}
                >
                  <FiCheckCircle size={16} />
                  {registerLoading ? 'Registrando...' : 'Retornar do Almoço/Pausa'}
                </button>
              )}

              {availableActions.includes('pause') && (
                <button
                  className="btn btn-warning"
                  onClick={() => handleRegisterRecord('pause')}
                  disabled={registerLoading}
                >
                  <FiPauseCircle size={16} />
                  {registerLoading ? 'Registrando...' : 'Pausa (Almoço/Outro)'}
                </button>
              )}

              {availableActions.includes('exit') && (
                <button
                  className="btn btn-danger"
                  onClick={() => handleRegisterRecord('exit')}
                  disabled={registerLoading}
                >
                  <FiLogOut size={16} />
                  {registerLoading ? 'Registrando...' : 'Saída (Fim do Expediente)'}
                </button>
              )}
              
              {/* Mensagem de estado finalizado */}
              {availableActions.length === 0 && lastRecordType === 'exit' && (
                <button className="btn btn-secondary" disabled>
                  <FiAlertCircle size={16} />
                  Dia Encerrado
                </button>
              )}
              {/* Estado de loading inicial ou sem ação disponível */}
              {availableActions.length === 0 && lastRecordType === undefined && (
                <button className="btn btn-secondary" disabled>
                  <FiInfo size={16} />
                  Carregando Ações
                </button>
              )}
            </div>

            <div className="time-record-info">
              <FiInfo size={16} />
              <p>Último registro de ponto: {lastRecord ? `${getRecordBadge(lastRecord.type)} às ${formatTime(lastRecord.timestamp)}` : 'Nenhum registro hoje.'}</p>
            </div>
          </div>
          
          {/* Cartões de Informação e Resumo */}
          <div className="dashboard-grid">
            {/* Estatísticas Chave */}
            <div className="info-card stats-card">
              <div className="section-header">
                <FiTrendingUp size={24} />
                <h3>Estatísticas Chave</h3>
              </div>
              <div className="stats-body">
                <div className="stat-item">
                  <FiBriefcase size={20} />
                  <span>Departamento: <strong>{employeeData.department}</strong></span>
                </div>
                <div className="stat-item">
                  <FiCalendar size={20} />
                  <span>Contratação: <strong>{new Date(employeeData.hire_date).toLocaleDateString('pt-BR')}</strong></span>
                </div>
                <div className="stat-item">
                  <FiClock size={20} />
                  <span>Banco de Horas: <strong>{employeeData.current_time_bank !== undefined ? (employeeData.current_time_bank >= 0 ? '+' : '-') + Math.floor(Math.abs(employeeData.current_time_bank) / 60) + 'h ' + (Math.abs(employeeData.current_time_bank) % 60) + 'm' : 'N/A'}</strong></span>
                </div>
              </div>
            </div>

            {/* Registros de Hoje */}
            <div className="info-card">
              <div className="section-header">
                <FiFileText size={24} />
                <h3>Registros de Hoje</h3>
              </div>
              <div className="records-list">
                {todayRecordsList.length > 0 ? (
                  todayRecordsList.map((record, index) => (
                    <div key={index} className="record-item">
                      {getRecordBadge(record.type)}
                      <span className="text-muted">{formatTime(record.timestamp)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted">Nenhum registro encontrado para hoje.</p>
                )}
              </div>
            </div>
            
            {/* Solicitações */}
            <div className="info-card requests-card">
              <div className="section-header">
                <FiEdit2 size={24} />
                <h3>Minhas Solicitações ({pendingRequestsCount})</h3>
              </div>
              <div className="quick-actions requests-buttons">
                <button className="btn btn-secondary" onClick={() => setShowAbsenceModal(true)}>
                  <FiCalendar size={16} /> Justificar Ausência
                </button>
                <button className="btn btn-secondary" onClick={() => setShowTimeRecordModal(true)}>
                  <FiWatch size={16} /> Solicitar Ajuste de Ponto
                </button>
                <button className="btn btn-secondary" onClick={() => setShowRequestsModal(true)}>
                  <FiEye size={16} /> Ver Todas
                </button>
              </div>
              <div className="requests-summary">
                <p>Pendentes: <span className="text-warning">{pendingRequestsCount}</span></p>
              </div>
            </div>

          </div>
          
          {/* Seção de Informações Adicionais */}
          <div className="info-card">
            <div className="section-header">
              <FiInfo size={24} />
              <h3>Guia Rápido de Uso</h3>
            </div>
            <div className="guide-grid">
              <div className="info-section">
                <h4>Fluxo de Ponto</h4>
                <ul>
                  <li>Entrada ao começar o dia</li>
                  <li>Pausa para almoço/café</li>
                  <li>Retorno após pausas</li>
                  <li>Saída ao finalizar</li>
                  <li>Novo turno se necessário (nova Entrada)</li>
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
                  <li>Após pausar, usar **"Retornar do Almoço/Pausa"**</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Modais */}
          
          {/* Modal de Pausa */}
          {showPauseModal && (
            <div className="modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h4><FiPauseCircle size={20} /> Registrar Pausa</h4>
                  <button className="close-button" onClick={() => setShowPauseModal(false)}><FiX size={24} /></button>
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

                  {(pauseForm.reason === 'outro') && (
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

                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setShowPauseModal(false)}>Cancelar</button>
                    <button 
                      className="btn btn-primary" 
                      disabled={!pauseForm.reason || (pauseForm.reason === 'outro' && !pauseForm.description) || registerLoading} 
                      onClick={handlePauseSubmit}
                    >
                      {registerLoading ? 'Registrando...' : 'Confirmar Pausa'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Solicitações (Ver Todas) */}
          {showRequestsModal && (
            <div className="modal">
              <div className="modal-content large-modal">
                <div className="modal-header">
                  <h4><FiEye size={20} /> Minhas Solicitações</h4>
                  <button className="close-button" onClick={() => setShowRequestsModal(false)}><FiX size={24} /></button>
                </div>
                <div className="modal-body">
                  {myRequests.length === 0 ? (
                    <p className="text-muted">Você não possui solicitações registradas.</p>
                  ) : (
                    <table className="requests-table">
                      <thead>
                        <tr>
                          <th>Tipo / Status</th>
                          <th>Detalhes</th>
                          <th>Data da Solicitação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRequests.map((request) => (
                          <tr key={request._id} className={getStatusClass(request.status)}>
                            <td>{getTypeBadge(request.type, request.status)}</td>
                            <td>
                              {request.type === 'absence' ? (
                                <>
                                  <p><strong>Ausência:</strong> {new Date(request.date).toLocaleDateString('pt-BR')}</p>
                                  <p><strong>Motivo:</strong> {request.reason}</p>
                                  <p className="text-muted">Desc: {request.description || 'N/A'}</p>
                                </>
                              ) : (
                                <>
                                  <p><strong>Ajuste:</strong> {new Date(request.date).toLocaleDateString('pt-BR')} às {request.time}</p>
                                  <p><strong>Motivo:</strong> {request.reason}</p>
                                  <p className="text-muted">Desc: {request.description || 'N/A'}</p>
                                </>
                              )}
                              {request.admin_note && <p className="admin-note">**Admin Note:** {request.admin_note}</p>}
                            </td>
                            <td>{new Date(request.created_at).toLocaleDateString('pt-BR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowRequestsModal(false)}>Fechar</button>
                </div>
              </div>
            </div>
          )}
          
          {/* Modal de Justificar Ausência */}
          {showAbsenceModal && (
            <div className="modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h4><FiCalendar size={20} /> Justificar Ausência</h4>
                  <button className="close-button" onClick={() => setShowAbsenceModal(false)}><FiX size={24} /></button>
                </div>
                <form onSubmit={handleAbsenceSubmit}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Data da Ausência *</label>
                      <input type="date" value={absenceForm.date} onChange={(e) => setAbsenceForm({...absenceForm, date: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Motivo *</label>
                      <select value={absenceForm.reason} onChange={(e) => setAbsenceForm({...absenceForm, reason: e.target.value})} required>
                        <option value="">Selecione o Motivo</option>
                        <option value="Atestado Médico">Atestado Médico</option>
                        <option value="Férias">Férias</option>
                        <option value="Folga Compensatória">Folga Compensatória</option>
                        <option value="Outro">Outro (especifique)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Detalhes/Descrição</label>
                      <textarea value={absenceForm.description} onChange={(e) => setAbsenceForm({...absenceForm, description: e.target.value})} rows="3"></textarea>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAbsenceModal(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={registerLoading}>
                      <FiSave size={16} /> {registerLoading ? 'Enviando...' : 'Enviar Solicitação'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal de Solicitar Ponto Esquecido */}
          {showTimeRecordModal && (
            <div className="modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h4><FiWatch size={20} /> Solicitar Ajuste de Ponto</h4>
                  <button className="close-button" onClick={() => setShowTimeRecordModal(false)}><FiX size={24} /></button>
                </div>
                <form onSubmit={handleTimeRecordSubmit}>
                  <div className="modal-body">
                    <p className="text-muted">Use este formulário para solicitar o registro de um ponto que você esqueceu de bater.</p>
                    <div className="form-group">
                      <label>Data do Ponto *</label>
                      <input type="date" value={timeRecordForm.date} onChange={(e) => setTimeRecordForm({...timeRecordForm, date: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Hora do Ponto *</label>
                      <input type="time" value={timeRecordForm.time} onChange={(e) => setTimeRecordForm({...timeRecordForm, time: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Motivo do Esquecimento *</label>
                      <select value={timeRecordForm.reason} onChange={(e) => setTimeRecordForm({...timeRecordForm, reason: e.target.value})} required>
                        <option value="">Selecione o Motivo</option>
                        <option value="Esquecimento">Esquecimento</option>
                        <option value="Problema Técnico">Problema Técnico</option>
                        <option value="Outro">Outro (especifique)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Detalhes/Descrição</label>
                      <textarea value={timeRecordForm.description} onChange={(e) => setTimeRecordForm({...timeRecordForm, description: e.target.value})} rows="3"></textarea>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowTimeRecordModal(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={registerLoading}>
                      <FiSave size={16} /> {registerLoading ? 'Enviando...' : 'Enviar Solicitação'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
        </>
      ) : (
        <div className="info-card error-card">
          <div className="section-header">
            <FiAlertCircle size={24} />
            <h3>Funcionário Não Vinculado</h3>
          </div>
          <p>Seu usuário não está vinculado a um funcionário. Contate o administrador.</p>
          <div className="quick-actions">
            <button className="btn btn-primary"><FiUser size={18} /><span>Contatar Administrador</span></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;