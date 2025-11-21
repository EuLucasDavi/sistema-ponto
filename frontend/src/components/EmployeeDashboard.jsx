import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  FiUser,
  FiClock,
  FiCalendar,
  FiBriefcase,
  FiLogIn,
  FiLogOut,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiArrowRight,
  FiHome,
  FiTrendingUp,
  FiPauseCircle,
  FiWatch,
  FiX,
  FiFileText,
  FiCheck,
  FiEye
} from 'react-icons/fi';

const EmployeeDashboard = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [todayRecords, setTodayRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [lastRecord, setLastRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRecordType, setLastRecordType] = useState(null);
  const [todayRecordsList, setTodayRecordsList] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [pauseReasons, setPauseReasons] = useState([]);

  // Obter usuário atual do contexto de autenticação
  const { user } = useAuth();

  // Estados para os modais
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [showTimeRecordModal, setShowTimeRecordModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });

  // Estados dos formulários
  const [absenceForm, setAbsenceForm] = useState({
    date: '',
    reason: '',
    description: ''
  });

  const [timeRecordForm, setTimeRecordForm] = useState({
    date: '',
    time: '',
    reason: '',
    description: ''
  });

  const [pauseForm, setPauseForm] = useState({
    reason: '',
    description: ''
  });

  // Resetar estado quando o usuário mudar
  useEffect(() => {
    if (user) {
      resetState();
      fetchAllData();
    }
  }, [user?.id]);

  // Timer para atualizar hora atual
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // NOVAS FUNÇÕES: Modais de confirmação
  const showSuccessMessage = (title, message) => {
    setModalContent({ title, message });
    setShowSuccessModal(true);
  };

  const showErrorMessage = (title, message) => {
    setModalContent({ title, message });
    setShowErrorModal(true);
  };

  const closeModals = () => {
    setShowSuccessModal(false);
    setShowErrorModal(false);
    setModalContent({ title: '', message: '' });
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      await Promise.all([
        fetchEmployeeData(),
        fetchTodayRecords(),
        fetchMyRequests(),
        fetchPauseReasons()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showErrorMessage('Erro', 'Erro ao carregar dados do sistema');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setEmployeeData(null);
    setRecentRecords([]);
    setTodayRecords(0);
    setLastRecord(null);
    setLastRecordType(null);
    setTodayRecordsList([]);
    setMyRequests([]);
    setError('');
  };

  const fetchEmployeeData = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');

      if (response.data.role === 'employee') {
        setEmployeeData(response.data.employee);
        setTodayRecords(response.data.todayRecords);
        setRecentRecords(response.data.recentRecords || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do funcionário:', error);
      throw error;
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await axios.get('/api/requests');
      setMyRequests(response.data);
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      throw error;
    }
  };

  const fetchPauseReasons = async () => {
    try {
      const response = await axios.get('/api/pause-reasons');
      setPauseReasons(response.data);
    } catch (error) {
      console.error('Erro ao buscar justificativas:', error);
      throw error;
    }
  };

  const fetchTodayRecords = async () => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const response = await axios.get('/api/me/time-records', {
        params: {
          start_date: todayStr,
          end_date: todayStr
        }
      });

      setTodayRecordsList(response.data);

      if (response.data.length > 0) {
        const lastRecordToday = response.data[response.data.length - 1];
        setLastRecordType(lastRecordToday.type);
      } else {
        setLastRecordType(null);
      }
    } catch (error) {
      console.error('Erro ao buscar registros de hoje:', error);
      setLastRecordType(null);
      throw error;
    }
  };

  const fetchRecentRecords = async () => {
    try {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const response = await axios.get('/api/me/time-records', {
        params: {
          start_date: firstDay.toISOString().split('T')[0],
          end_date: lastDay.toISOString().split('T')[0]
        }
      });
      setRecentRecords(response.data);
    } catch (error) {
      console.error('Erro ao buscar registros:', error);
      throw error;
    }
  };

  const getButtonLabel = (actionKey) => {
    switch (actionKey) {
      case 'entry_start':
        return 'Registrar Entrada';
      case 'entry_return':
        return 'Retornar da Pausa'; // ou 'Reentrada', mais descritivo para o usuário
      case 'pause':
        return 'Pausa';
      case 'exit':
        return 'Registrar Saída';
      default:
        return 'Registrar Entrada';
    }
  };

  const getAvailableActions = (currentLastRecordType) => {
    if (!currentLastRecordType || currentLastRecordType === 'exit') {
      return [{ type: 'entry', label_key: 'entry_start' }];
    }

    switch (currentLastRecordType) {
      case 'entry':
        return [
          { type: 'pause', label_key: 'pause' },
          { type: 'exit', label_key: 'exit' }
        ];
      case 'pause':
        return [{ type: 'entry', label_key: 'entry_return' }];
      default:
        return [{ type: 'entry', label_key: 'entry_start' }];
    }
  };

  const getStatusMessage = (lastRecordType, availableActions) => {
    if (!lastRecordType || lastRecordType === 'exit') {
      return '🟡 Aguardando entrada (Início do Turno)';
    }

    if (lastRecordType === 'pause') {
      return '🟠 Em Pausa (Aguardando Reentrada)';
    }

    const isWorking = availableActions.some(action => action.type === 'pause' || action.type === 'exit');

    if (lastRecordType === 'entry' && isWorking) {
      return '🟢 Em Trabalho';
    }

    return '🔴 Expediente Encerrado';
  };

  // ATUALIZADA: Registrar ponto com modais de confirmação
  const registerTime = async (type, pauseReason = null) => {
    setRegisterLoading(true);
    setError('');

    try {
      let response;

      if (type === 'pause' && pauseReason) {
        response = await axios.post('/api/me/time-records-with-reason', {
          type,
          pause_reason_id: pauseReason.reason === 'outro' ? null : pauseReason.reason,
          custom_reason: pauseReason.description
        });
      } else {
        response = await axios.post('/api/me/time-records', { type });
      }

      // Recarregar TODOS os dados do servidor
      await fetchAllData();

      setLastRecord({
        type,
        timestamp: new Date().toLocaleString('pt-BR'),
        employee: employeeData?.name
      });

      // Fechar modal de pausa se aplicável
      if (type === 'pause') {
        setShowPauseModal(false);
        setPauseForm({ reason: '', description: '' });
      }

      // MOSTRAR MODAL DE SUCESSO
      const actionNames = {
        'entry': 'Entrada',
        'pause': 'Pausa',
        'exit': 'Saída'
      };

      showSuccessMessage(
        'Registro Confirmado',
        `${actionNames[type]} registrada com sucesso às ${new Date().toLocaleTimeString('pt-BR')}`
      );

    } catch (error) {
      console.error('Erro ao registrar ponto:', error);

      // Recarregar dados mesmo em caso de erro
      await fetchTodayRecords();

      const errorMessage = error.response?.data?.error || 'Erro ao registrar ponto';

      // MOSTRAR MODAL DE ERRO
      showErrorMessage('Erro no Registro', errorMessage);
    } finally {
      setRegisterLoading(false);
    }
  };

  // ATUALIZADA: Enviar solicitação com modais
  const submitRequest = async (type, formData) => {
    try {
      setError('');

      const requestData = {
        type,
        date: formData.date,
        reason: formData.reason,
        description: formData.description || '',
        requested_time: type === 'time_record' ? formData.time : null
      };

      await axios.post('/api/requests', requestData);

      // Fechar modal e limpar formulário
      if (type === 'absence') {
        setShowAbsenceModal(false);
        setAbsenceForm({ date: '', reason: '', description: '' });
      } else {
        setShowTimeRecordModal(false);
        setTimeRecordForm({ date: '', time: '', reason: '', description: '' });
      }

      // Recarregar dados atualizados
      await fetchMyRequests();

      // MOSTRAR MODAL DE SUCESSO
      const requestTypeNames = {
        'absence': 'Ausência',
        'time_record': 'Registro de Ponto'
      };

      showSuccessMessage(
        'Solicitação Enviada',
        `Sua solicitação de ${requestTypeNames[type]} foi enviada com sucesso! Aguarde a aprovação do administrador.`
      );

    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      showErrorMessage('Erro na Solicitação', error.response?.data?.error || 'Erro ao enviar solicitação');
    }
  };

  // ... (restante das funções getStatusBadge, getTypeBadge permanecem iguais)

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'warning', text: 'Pendente', icon: <FiClock size={14} /> },
      approved: { class: 'success', text: 'Aprovada', icon: <FiCheck size={14} /> },
      rejected: { class: 'danger', text: 'Rejeitada', icon: <FiX size={14} /> }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`badge badge-${config.class}`}>
        {config.icon}
        <span style={{ marginLeft: '4px' }}>{config.text}</span>
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      absence: { class: 'info', text: 'Ausência', icon: <FiCalendar size={14} /> },
      time_record: { class: 'primary', text: 'Registro de Ponto', icon: <FiWatch size={14} /> }
    };

    const config = typeConfig[type] || typeConfig.absence;
    return (
      <span className={`badge badge-${config.class}`}>
        {config.icon}
        <span style={{ marginLeft: '4px' }}>{config.text}</span>
      </span>
    );
  };

  const availableActions = getAvailableActions(lastRecordType);
  const pendingRequestsCount = myRequests.filter(req => req.status === 'pending').length;

  if (loading) {
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

      {/* REMOVIDO: Mensagem de erro no topo - agora usamos modais */}

      {employeeData ? (
        <>
          {/* Grid de Estatísticas (mantido igual) */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <FiUser size={24} />
              </div>
              <h3>Funcionário</h3>
              <div className="stat-number">{employeeData.name.split(' ')[0]}</div>
              <p>Seu perfil ativo</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FiBriefcase size={24} />
              </div>
              <h3>Departamento</h3>
              <div className="stat-number">{employeeData.department}</div>
              <p>Área de atuação</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FiClock size={24} />
              </div>
              <h3>Registros Hoje</h3>
              <div className="stat-number">{todayRecordsList.length}</div>
              <p>Pontos registrados hoje</p>
            </div>

            <div
              className="stat-card clickable"
              onClick={() => setShowRequestsModal(true)}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-icon">
                <FiFileText size={24} />
              </div>
              <h3>Solicitações</h3>
              <div className="stat-number">{pendingRequestsCount}</div>
              <p>Pendentes de aprovação</p>
            </div>
          </div>

          {/* Time Clock (mantido igual) */}
          <div className="time-clock-container">
            <div className="time-clock-card">
              <div className="work-status">
                <div className={`status-indicator ${lastRecordType || 'waiting'}`}>
                  <strong>Status Atual: </strong>
                  <span>
                    {getStatusMessage(lastRecordType, availableActions)}
                  </span>
                </div>
              </div>
              <div className="current-time">
                <div className="date-display">
                  {currentTime.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="time-display">
                  {currentTime.toLocaleTimeString('pt-BR')}
                </div>
              </div>

              <div className="time-buttons">
                {availableActions.map(action => (
                  <button
                    key={action.label_key}
                    className={`btn btn-${action.color} btn-large`}
                    onClick={() => action.type === 'pause' ? setShowPauseModal(true) : registerTime(action.type)}
                    disabled={registerLoading}
                  >
                    {registerLoading ? (
                      <>
                        <div className="loading-spinner"></div>
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        {action.type === 'entry' && <FiLogIn size={20} />}
                        {action.type === 'pause' && <FiPauseCircle size={20} />}
                        {action.type === 'exit' && <FiLogOut size={20} />}

                        <span>{getButtonLabel(action.label_key)}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>

              <div className="request-buttons" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <h4 style={{ marginBottom: '15px', color: '#555' }}>Solicitações</h4>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-info"
                    onClick={() => setShowAbsenceModal(true)}
                  >
                    <FiCalendar size={16} />
                    <span>Justificar Ausência</span>
                  </button>

                  <button
                    className="btn btn-warning"
                    onClick={() => setShowTimeRecordModal(true)}
                  >
                    <FiWatch size={16} />
                    <span>Solicitar Ponto</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowRequestsModal(true)}
                  >
                    <FiEye size={16} />
                    <span>Ver Minhas Solicitações</span>
                    {pendingRequestsCount > 0 && (
                      <span className="badge badge-danger" style={{ marginLeft: '8px' }}>
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
                      <div>
                        <strong>Tipo</strong>
                        <span className={`record-type ${lastRecord.type}`}>
                          {lastRecord.type === 'entry' ? 'Entrada' :
                            lastRecord.type === 'pause' ? 'Pausa' : 'Saída'}
                        </span>
                      </div>
                    </div>
                    <div className="record-item">
                      <div>
                        <strong>Horário</strong>
                        <span>{lastRecord.timestamp}</span>
                      </div>
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
                <div className="stat-icon">
                  <FiTrendingUp size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{todayRecordsList.length}</div>
                  <div className="stat-label">Registros Hoje</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FiCalendar size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{recentRecords.length}</div>
                  <div className="stat-label">Registros Este Mês</div>
                </div>
              </div>
            </div>
          </div>

          {/* NOVO: Modal de Sucesso */}
          {showSuccessModal && (
            <div className="modal-overlay">
              <div className="modal success-modal">
                <div className="modal-header success-header">
                  <FiCheckCircle size={24} className="success-icon" />
                  <h3>{modalContent.title}</h3>
                  <button
                    className="btn-close-modal"
                    onClick={closeModals}
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="success-content">
                    <p>{modalContent.message}</p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-success"
                    onClick={closeModals}
                  >
                    <FiCheck size={16} />
                    <span>OK</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOVO: Modal de Erro */}
          {showErrorModal && (
            <div className="modal-overlay">
              <div className="modal error-modal">
                <div className="modal-header error-header">
                  <FiAlertCircle size={24} className="error-icon" />
                  <h3>{modalContent.title}</h3>
                  <button
                    className="btn-close-modal"
                    onClick={closeModals}
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="error-content">
                    <p>{modalContent.message}</p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-danger"
                    onClick={closeModals}
                  >
                    <FiX size={16} />
                    <span>Fechar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Pausa (mantido igual) */}
          {showPauseModal && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Registrar Pausa</h3>
                  <button
                    className="btn-close-modal"
                    onClick={() => setShowPauseModal(false)}
                  >
                    <FiX size={20} />
                  </button>
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
                      <label>Descrição do Motivo *</label>
                      <input
                        type="text"
                        value={pauseForm.description}
                        onChange={(e) => setPauseForm({ ...pauseForm, description: e.target.value })}
                        placeholder="Descreva o motivo da pausa..."
                        required
                      />
                    </div>
                  )}

                  {pauseForm.reason !== 'outro' && pauseForm.reason !== '' && (
                    <div className="form-group">
                      <label>Observações Adicionais</label>
                      <textarea
                        value={pauseForm.description}
                        onChange={(e) => setPauseForm({ ...pauseForm, description: e.target.value })}
                        placeholder="Observações adicionais sobre a pausa..."
                        rows="3"
                      />
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowPauseModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => registerTime('pause', pauseForm)}
                    disabled={!pauseForm.reason || registerLoading}
                  >
                    {registerLoading ? (
                      <>
                        <div className="loading-spinner"></div>
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <FiPauseCircle size={16} />
                        <span>Registrar Pausa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Solicitação de Ausência (mantido igual) */}
          {showAbsenceModal && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Solicitar Ausência</h3>
                  <button className="btn-close-modal" onClick={() => setShowAbsenceModal(false)}>
                    <FiX size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Data da Ausência *</label>
                    <input
                      type="date"
                      value={absenceForm.date}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Motivo da Ausência *</label>
                    <select
                      value={absenceForm.reason}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                      required
                    >
                      <option value="">Selecione um motivo</option>
                      {pauseReasons.map(reason => (
                        <option key={reason._id} value={reason.name}>
                          {reason.name} {reason.description && `- ${reason.description}`}
                        </option>
                      ))}
                      <option value="Outro">Outro (especifique na descrição)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Descrição Detalhada</label>
                    <textarea
                      value={absenceForm.description}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, description: e.target.value })}
                      placeholder="Forneça mais detalhes sobre sua ausência..."
                      rows="4"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowAbsenceModal(false)}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => submitRequest('absence', absenceForm)}
                    disabled={!absenceForm.date || !absenceForm.reason}
                  >
                    Enviar Solicitação
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Solicitação de Registro de Ponto (mantido igual) */}
          {showTimeRecordModal && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Solicitar Registro de Ponto</h3>
                  <button className="btn-close-modal" onClick={() => setShowTimeRecordModal(false)}>
                    <FiX size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Data *</label>
                      <input
                        type="date"
                        value={timeRecordForm.date}
                        onChange={(e) => setTimeRecordForm({ ...timeRecordForm, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Horário *</label>
                      <input
                        type="time"
                        value={timeRecordForm.time}
                        onChange={(e) => setTimeRecordForm({ ...timeRecordForm, time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Motivo do Esquecimento *</label>
                    <select
                      value={timeRecordForm.reason}
                      onChange={(e) => setTimeRecordForm({ ...timeRecordForm, reason: e.target.value })}
                      required
                    >
                      <option value="">Selecione um motivo</option>
                      {pauseReasons.map(reason => (
                        <option key={reason._id} value={reason.name}>
                          {reason.name} {reason.description && `- ${reason.description}`}
                        </option>
                      ))}
                      <option value="Outro">Outro (especifique na descrição)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Descrição Detalhada</label>
                    <textarea
                      value={timeRecordForm.description}
                      onChange={(e) => setTimeRecordForm({ ...timeRecordForm, description: e.target.value })}
                      placeholder="Forneça mais detalhes sobre o ocorrido..."
                      rows="4"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowTimeRecordModal(false)}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => submitRequest('time_record', timeRecordForm)}
                    disabled={!timeRecordForm.date || !timeRecordForm.time || !timeRecordForm.reason}
                  >
                    Enviar Solicitação
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Visualização de Solicitações (mantido igual) */}
          {showRequestsModal && (
            <div className="modal-overlay">
              <div className="modal large">
                <div className="modal-header">
                  <h3>Minhas Solicitações</h3>
                  <button
                    className="btn-close-modal"
                    onClick={() => setShowRequestsModal(false)}
                  >
                    <FiX size={20} />
                  </button>
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
                            <div className="detail">
                              <strong>Motivo:</strong> {request.reason}
                            </div>
                            {request.description && (
                              <div className="detail">
                                <strong>Descrição:</strong>
                                <div className="description-content">
                                  {request.description}
                                </div>
                              </div>
                            )}
                            {request.admin_notes && (
                              <div className="detail admin-notes">
                                <strong>Observações do Admin:</strong>
                                <div className="description-content">
                                  {request.admin_notes}
                                </div>
                              </div>
                            )}
                            {request.processed_at && (
                              <div className="detail">
                                <strong>Processado em:</strong> {new Date(request.processed_at).toLocaleString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" onClick={() => setShowRequestsModal(false)}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Registros Recentes (mantido igual) */}
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
                          <strong>
                            {new Date(record.timestamp).toLocaleDateString('pt-BR')}
                          </strong>
                          <span> às </span>
                          <strong>
                            {new Date(record.timestamp).toLocaleTimeString('pt-BR')}
                          </strong>
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
                <h4>
                  <FiLogIn size={18} />
                  Registro de Ponto
                </h4>
                <ul>
                  <li><strong>Entrada:</strong> Ao chegar no trabalho</li>
                  <li><strong>Pausa:</strong> Para almoço, café ou assuntos pessoais (com justificativa)</li>
                  <li><strong>Retorno:</strong> Após pausas (botão "Retornar do Almoço")</li>
                  <li><strong>Saída:</strong> Ao finalizar o expediente</li>
                  <li><strong>Novo Turno:</strong> Se precisar registrar mais horas no mesmo dia</li>
                </ul>
              </div>

              <div className="info-section">
                <h4>Solicitações</h4>
                <ul>
                  <li>Use "Justificar Ausência" para faltas justificadas</li>
                  <li>Use "Solicitar Ponto" para registrar horários esquecidos</li>
                  <li>Acompanhe o status em "Ver Minhas Solicitações"</li>
                  <li>O administrador pode adicionar observações na resposta</li>
                </ul>
              </div>

              <div className="info-section">
                <h4>Pausas</h4>
                <ul>
                  <li>Todas as pausas exigem justificativa</li>
                  <li>Você pode fazer múltiplas pausas durante o dia</li>
                  <li>Após cada pausa, clique em "Retornar do Almoço"</li>
                  <li>As justificativas ficam registradas para controle</li>
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
          <p>Seu usuário não está vinculado a um funcionário no sistema.</p>
          <div className="quick-actions">
            <button className="btn btn-primary">
              <FiUser size={18} />
              <span>Solicitar Vinculação</span>
            </button>
            <button className="btn btn-secondary">
              <FiInfo size={18} />
              <span>Contatar Administrador</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;