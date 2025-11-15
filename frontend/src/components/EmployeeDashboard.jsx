import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  
  // Estados para os modais
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [showTimeRecordModal, setShowTimeRecordModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  
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

  useEffect(() => {
    fetchEmployeeData();
    fetchTodayRecords();
    fetchMyRequests();
    fetchPauseReasons();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchEmployeeData = async () => {
    try {
      setError('');
      const response = await axios.get('/api/dashboard/stats');

      if (response.data.role === 'employee') {
        setEmployeeData(response.data.employee);
        setTodayRecords(response.data.todayRecords);
        setRecentRecords(response.data.recentRecords || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do funcionário:', error);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await axios.get('/api/requests');
      setMyRequests(response.data);
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
    }
  };

  const fetchPauseReasons = async () => {
    try {
      const response = await axios.get('/api/pause-reasons');
      setPauseReasons(response.data);
    } catch (error) {
      console.error('Erro ao buscar justificativas:', error);
    }
  };

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

      // Recarregar lista de solicitações
      await fetchMyRequests();

      // Mostrar mensagem de sucesso
      setError('');
      alert('Solicitação enviada com sucesso! Aguarde a aprovação do administrador.');
      
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      setError(error.response?.data?.error || 'Erro ao enviar solicitação');
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
    }
  };

  const registerTime = async (type) => {
    setRegisterLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/me/time-records', { type });

      await fetchEmployeeData();
      await fetchTodayRecords();
      await fetchRecentRecords();

      setLastRecord({
        type,
        timestamp: new Date().toLocaleString('pt-BR'),
        employee: employeeData?.name
      });
      setLastRecordType(type);

    } catch (error) {
      console.error('Erro ao registrar ponto:', error);
      setError(error.response?.data?.error || 'Erro ao registrar ponto');
    } finally {
      setRegisterLoading(false);
    }
  };

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

      {error && (
        <div className="error-message">
          <FiAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {employeeData ? (
        <>
          {/* Grid de Estatísticas */}
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

            {/* Novo card para solicitações pendentes */}
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

          {/* Time Clock */}
          <div className="time-clock-container">
            <div className="time-clock-card">
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
                {/* Botões de registro de ponto (mantidos iguais) */}
                {(!lastRecordType || lastRecordType === 'exit') && (
                  <button
                    className="btn btn-success btn-large"
                    onClick={() => registerTime('entry')}
                    disabled={registerLoading}
                  >
                    {registerLoading ? (
                      <>
                        <div className="loading-spinner"></div>
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <FiLogIn size={20} />
                        <span>Registrar Entrada</span>
                      </>
                    )}
                  </button>
                )}

                {lastRecordType === 'entry' && (
                  <button
                    className="btn btn-warning btn-large"
                    onClick={() => registerTime('pause')}
                    disabled={registerLoading}
                  >
                    {registerLoading ? (
                      <>
                        <div className="loading-spinner"></div>
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <FiPauseCircle size={20} />
                        <span>Registrar Pausa</span>
                      </>
                    )}
                  </button>
                )}

                {lastRecordType === 'pause' && (
                  <button
                    className="btn btn-success btn-large"
                    onClick={() => registerTime('entry')}
                    disabled={registerLoading}
                  >
                    {registerLoading ? (
                      <>
                        <div className="loading-spinner"></div>
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <FiLogIn size={20} />
                        <span>Registrar Retorno</span>
                      </>
                    )}
                  </button>
                )}

                {(lastRecordType === 'entry' || lastRecordType === 'pause') && (
                  <button
                    className="btn btn-danger btn-large"
                    onClick={() => registerTime('exit')}
                    disabled={registerLoading}
                  >
                    {registerLoading ? (
                      <>
                        <div className="loading-spinner"></div>
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <FiLogOut size={20} />
                        <span>Registrar Saída</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Botões de solicitação - Agora com modais */}
              <div className="request-buttons" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <h4 style={{ marginBottom: '15px', color: '#555' }}>Solicitações</h4>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-info"
                    onClick={() => setShowAbsenceModal(true)}
                  >
                    <FiCalendar size={16} />
                    <span>Solicitar Ausência</span>
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

          {/* Modal de Solicitação de Ausência */}
          {showAbsenceModal && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Solicitar Ausência</h3>
                  <button 
                    className="btn-close-modal" 
                    onClick={() => setShowAbsenceModal(false)}
                  >
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
                          {reason.name}
                        </option>
                      ))}
                      <option value="Outro">Outro (especifique na descrição)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Descrição Detalhada</label>
                    <div className="textarea-container">
                      <textarea
                        value={absenceForm.description}
                        onChange={(e) => setAbsenceForm({ ...absenceForm, description: e.target.value })}
                        placeholder="Forneça mais detalhes sobre sua ausência..."
                        rows="4"
                        className="description-textarea"
                      />
                      <div className="textarea-counter">
                        {absenceForm.description.length}/500
                      </div>
                    </div>
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

          {/* Modal de Solicitação de Registro de Ponto */}
          {showTimeRecordModal && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Solicitar Registro de Ponto</h3>
                  <button 
                    className="btn-close-modal" 
                    onClick={() => setShowTimeRecordModal(false)}
                  >
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
                      <option value="Esqueci de registrar">Esqueci de registrar o ponto</option>
                      <option value="Problema no sistema">Problema técnico no sistema</option>
                      <option value="Ausência justificada">Ausência justificada</option>
                      <option value="Emergência">Emergência pessoal</option>
                      <option value="Outro">Outro (especifique na descrição)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Descrição Detalhada</label>
                    <div className="textarea-container">
                      <textarea
                        value={timeRecordForm.description}
                        onChange={(e) => setTimeRecordForm({ ...timeRecordForm, description: e.target.value })}
                        placeholder="Forneça mais detalhes sobre o ocorrido..."
                        rows="4"
                        className="description-textarea"
                      />
                      <div className="textarea-counter">
                        {timeRecordForm.description.length}/500
                      </div>
                    </div>
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

          {/* Modal de Visualização de Solicitações */}
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

          {/* Restante do código (Registros Recentes e Card de Informações) permanece igual */}
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
                  Registro de Entrada
                </h4>
                <ul>
                  <li>Registre sua entrada ao chegar no trabalho</li>
                  <li>Clique no botão verde "Registrar Entrada"</li>
                  <li>O sistema captura automaticamente data e hora</li>
                </ul>
              </div>

              <div className="info-section">
                <h4>
                  <FiLogOut size={18} />
                  Registro de Saída
                </h4>
                <ul>
                  <li>Registre sua saída ao finalizar o expediente</li>
                  <li>Clique no botão vermelho "Registrar Saída"</li>
                  <li>Seus registros ficam salvos automaticamente</li>
                </ul>
              </div>

              <div className="info-section">
                <h4>Solicitações</h4>
                <ul>
                  <li>Use "Solicitar Ausência" para faltas justificadas</li>
                  <li>Use "Solicitar Ponto" para registrar horários esquecidos</li>
                  <li>Acompanhe o status em "Ver Minhas Solicitações"</li>
                  <li>O administrador pode adicionar observações na resposta</li>
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