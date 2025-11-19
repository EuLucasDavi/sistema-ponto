import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  FiUser, FiClock, FiCalendar, FiBriefcase, FiLogIn, FiLogOut,
  FiCheckCircle, FiAlertCircle, FiInfo, FiArrowRight, FiHome,
  FiTrendingUp, FiPauseCircle, FiWatch, FiX, FiFileText, FiSave, FiEye, FiCheck
} from 'react-icons/fi';

// Funções de formatação (adicionadas/completadas para o componente funcionar)
const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');


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

  // NOVO: Efeito para controlar o scroll do body (aplicando a classe .modal-open)
  useEffect(() => {
    const isModalOpen = showAbsenceModal || showTimeRecordModal || showRequestsModal || showPauseModal || showSuccessModal || showErrorModal;
    
    if (isModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    // Função de limpeza
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showAbsenceModal, showTimeRecordModal, showRequestsModal, showPauseModal, showSuccessModal, showErrorModal]);
  // FIM NOVO EFEITO

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
    try {
      const response = await axios.get('/api/dashboard/stats');
      if (response.data.role === 'employee') {
        setEmployeeData(response.data.employee);
        setRecentRecords(response.data.recentRecords || []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do funcionário:', err);
      // Aqui você pode tratar o erro, talvez definindo employeeData como null ou mostrando uma mensagem.
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

    if (lastRecordType === null || lastRecordType === 'exit') {
      // Nenhum registro hoje ou após uma saída
      return ['entry'];
    }

    switch (lastRecordType) {
      case 'entry':
        // Após Entrada/Retorno, só pode Pausar ou Sair
        return ['pause', 'exit'];
      case 'pause':
        // Após Pausa, só pode Retornar (chamado de 'return' no frontend, que é 'entry' no backend)
        return ['return'];
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

  // Helper function to render action buttons (Usando classes do App.css: .btn-large)
  const renderTimeActionButton = (action) => {
    switch (action) {
      case 'entry':
        return (
          <button key="entry" className="btn btn-primary btn-large" onClick={() => handleRegisterRecord('entry')} disabled={registerLoading}>
            <FiLogIn size={20} />
            {registerLoading ? 'Registrando...' : 'Registrar Entrada'}
          </button>
        );
      case 'exit':
        return (
          <button key="exit" className="btn btn-danger btn-large" onClick={() => handleRegisterRecord('exit')} disabled={registerLoading}>
            <FiLogOut size={20} />
            {registerLoading ? 'Registrando...' : 'Registrar Saída'}
          </button>
        );
      case 'pause':
        return (
          <button key="pause" className="btn btn-warning btn-large" onClick={() => handleRegisterRecord('pause')} disabled={registerLoading}>
            <FiPauseCircle size={20} />
            {registerLoading ? 'Registrando...' : 'Registrar Pausa'}
          </button>
        );
      case 'return':
        return (
          <button key="return" className="btn btn-success btn-large" onClick={() => handleRegisterRecord('return')} disabled={registerLoading}>
            <FiCheckCircle size={20} />
            {registerLoading ? 'Registrando...' : 'Registrar Retorno'}
          </button>
        );
      default:
        return null;
    }
  };

  // Helper function to display record type badge (Usando classes do App.css: .record-type)
  const getRecordBadge = (type) => {
    const typeConfig = {
      entry: { class: 'entry', text: 'Entrada/Retorno', icon: <FiLogIn size={14} /> },
      exit: { class: 'exit', text: 'Saída', icon: <FiLogOut size={14} /> },
      pause: { class: 'pause', text: 'Pausa', icon: <FiPauseCircle size={14} /> },
    };
    
    const config = typeConfig[type] || { class: 'secondary', text: 'Ponto', icon: <FiClock size={14} /> };
    
    return (
      <span className={`record-type ${config.class}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  // Helper function to display request type/status badges (Usando classes do App.css: .badge)
  const renderRequestBadges = (type, status) => {
    let config = { type: type, text: 'Solicitação', icon: <FiFileText size={14} /> };
    
    switch (type) {
      case 'absence':
        config = { class: 'info', text: 'Ausência', icon: <FiCalendar size={14} /> };
        break;
      case 'time_record':
        config = { class: 'primary', text: 'Ajuste de Ponto', icon: <FiClock size={14} /> };
        break;
      default:
        config = { class: 'secondary', text: 'Outros', icon: <FiInfo size={14} /> };
    }

    let statusConfig = {};
    switch (status) {
      case 'pending':
        statusConfig = { class: 'warning', text: 'Pendente', icon: <FiAlertCircle size={14} /> };
        break;
      case 'approved':
        statusConfig = { class: 'success', text: 'Aprovada', icon: <FiCheckCircle size={14} /> };
        break;
      case 'rejected':
        statusConfig = { class: 'danger', text: 'Rejeitada', icon: <FiX size={14} /> };
        break;
      default:
        statusConfig = { class: 'secondary', text: 'Status Desconhecido', icon: <FiInfo size={14} /> };
    }

    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span className={`badge badge-${config.class}`}>
          {config.icon}
          <span style={{ marginLeft: '4px' }}>{config.text}</span>
        </span>
        <span className={`badge badge-${statusConfig.class}`}>
          {statusConfig.icon}
          <span style={{ marginLeft: '4px' }}>{statusConfig.text}</span>
        </span>
      </div>
    );
  };
  
  if (loading || lastRecordType === undefined) {
    return (
      <div className="loading-page">
        <div className="empty-content">
          <FiClock size={60} className="loading-spinner" style={{ width: '60px', height: '60px', border: '6px solid #007bff', borderTopColor: 'transparent', margin: '0' }} />
          <h3>Carregando Dashboard...</h3>
          <p>Aguarde enquanto buscamos seus dados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {employeeData ? (
        <>
          {/* Cabeçalho Principal */}
          <div className="header">
            <div className="header-title">
              <FiHome className="header-icon" size={32} />
              <div>
                <h1>Dashboard do Funcionário</h1>
                <p className="text-muted">Bem-vindo(a), {employeeData?.name || user.email}.</p>
              </div>
            </div>
            {/* Relógio Atual como um badge */}
            <div className="badge badge-secondary">
              <FiClock size={16} />
              <span>{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Seção de Controle de Ponto e Ações Rápidas */}
          <div className="time-clock-container">
            {/* Card de Controle de Ponto */}
            <div className="time-clock-card">
              <div className="section-header">
                <FiWatch size={24} />
                <h3>Registro de Ponto</h3>
              </div>
              
              {/* Display de Hora Atual */}
              <div className="current-time">
                <div className="time-display">{currentTime.toLocaleTimeString('pt-BR')}</div>
                <div className="date-display">{currentTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>

              {/* Botões de Ação */}
              <div className="time-buttons">
                {registerLoading ? (
                  <button className="btn btn-secondary btn-large" disabled>
                    <span className="loading-spinner" style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent' }}></span> 
                    Carregando Ações
                  </button>
                ) : (
                  availableActions.length > 0 ? (
                    availableActions.map(action => renderTimeActionButton(action))
                  ) : (
                    <div className="info-card error-card" style={{ gridColumn: '1 / -1', margin: '0', padding: '15px 20px' }}>
                      <p className="text-muted" style={{ margin: '0', fontStyle: 'normal' }}>
                        <FiCheckCircle size={16} style={{ color: '#28a745', marginRight: '5px' }} />
                        Seu dia parece completo.
                      </p>
                    </div>
                  )
                )}
              </div>
              
              {/* Último Registro */}
              <div className="last-record-card">
                <p className="text-muted" style={{ margin: '0' }}>
                  <FiInfo size={16} style={{ marginRight: '5px' }} />
                  Último registro de ponto: {lastRecord ? (
                    <>
                      {getRecordBadge(lastRecord.type)} às **{formatTime(lastRecord.timestamp)}**
                      {lastRecord.reason && <span className="text-muted" style={{ marginLeft: '10px' }}>(Motivo: {lastRecord.reason})</span>}
                    </>
                  ) : 'Nenhum registro hoje.'}
                </p>
              </div>
            </div>

            {/* Card de Ações Rápidas */}
            <div className="quick-actions-card">
              <div className="section-header">
                <FiArrowRight size={24} />
                <h3>Ações Rápidas</h3>
              </div>
              <div className="action-buttons">
                <button className="btn btn-warning" onClick={() => setShowTimeRecordModal(true)}>
                  <FiClock size={18} /><span>Ajustar Ponto Manualmente</span>
                </button>
                <button className="btn btn-warning" onClick={() => setShowAbsenceModal(true)}>
                  <FiCalendar size={18} /><span>Solicitar Ausência/Férias</span>
                </button>
                <button className="btn btn-secondary" onClick={() => setShowRequestsModal(true)}>
                  <FiFileText size={18} />
                  <span>Ver Minhas Solicitações</span>
                  {pendingRequestsCount > 0 && (
                    <span className="badge badge-danger" style={{ marginLeft: '8px' }}>{pendingRequestsCount}</span>
                  )}
                </button>
              </div>
            </div>
          </div>


          {/* Grid de Informações e Registros */}
          <div className="reports-grid" style={{ marginTop: '25px' }}>
            
            {/* Estatísticas Chave */}
            <div className="card">
              <div className="section-header">
                <FiTrendingUp size={24} />
                <h3>Estatísticas Chave</h3>
              </div>
              <div className="config-body">
                <div className="employee-info">
                  <FiBriefcase size={20} /> <span>Departamento: <strong>{employeeData.department}</strong></span>
                </div>
                <div className="employee-info">
                  <FiCalendar size={20} /> <span>Contratação: <strong>{new Date(employeeData.hire_date).toLocaleDateString('pt-BR')}</strong></span>
                </div>
                <div className="employee-info" style={{ borderLeft: employeeData.current_time_bank > 0 ? '4px solid #28a745' : '4px solid #dc3545', paddingLeft: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                  <FiClock size={20} /> <span>Banco de Horas: <strong>{employeeData.current_time_bank !== undefined ? (employeeData.current_time_bank >= 0 ? '+' : '-') + Math.floor(Math.abs(employeeData.current_time_bank) / 60) + 'h ' + (Math.abs(employeeData.current_time_bank) % 60) + 'm' : 'N/A'}</strong></span>
                </div>
              </div>
            </div>

            {/* Registros de Hoje */}
            <div className="card">
              <div className="section-header">
                <FiFileText size={24} />
                <h3>Registros de Hoje</h3>
              </div>
              <div className="config-body">
                {todayRecordsList.length > 0 ? (
                  todayRecordsList.map((record, index) => (
                    <div key={index} className="employee-info-summary" style={{ borderLeftColor: record.type === 'exit' ? '#dc3545' : record.type === 'pause' ? '#ffc107' : '#007bff' }}>
                      {getRecordBadge(record.type)}
                      <span>**{formatTime(record.timestamp)}**
                        {record.reason && <span className="text-muted" style={{ marginLeft: '10px' }}>({record.reason})</span>}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-content" style={{ padding: '0' }}>
                    <FiInfo size={30} style={{ color: '#dee2e6' }} />
                    <p>Nenhum registro encontrado para hoje.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Minhas Solicitações (Card) */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="table-header">
                <h3>Minhas Solicitações</h3>
                <button className="btn btn-secondary btn-small" onClick={() => setShowRequestsModal(true)}>
                  <FiEye size={16} /> Ver Todas
                  {pendingRequestsCount > 0 && <span className="badge badge-danger" style={{ marginLeft: '8px' }}>{pendingRequestsCount}</span>}
                </button>
              </div>
              <div className="table-container" style={{ boxShadow: 'none', margin: '0' }}>
                {myRequests.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tipo / Status</th>
                        <th>Detalhes</th>
                        <th>Data da Solicitação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRequests.slice(0, 5).map((request, index) => (
                        <tr key={index}>
                          <td>{renderRequestBadges(request.type, request.status)}</td>
                          <td>
                            {request.type === 'absence' ? `Data: ${new Date(request.date).toLocaleDateString('pt-BR')}` : `Ponto: ${new Date(request.date).toLocaleDateString('pt-BR')} ${request.time}`}
                            <br/>
                            <span className="text-muted">Motivo: {request.reason}</span>
                          </td>
                          <td>{new Date(request.createdAt).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-content" style={{ padding: '40px 20px 0' }}>
                    <FiFileText size={30} style={{ color: '#dee2e6' }} />
                    <p>Você não possui solicitações recentes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MODAIS */}
          
          {/* Modal de Pausa */}
          {showPauseModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h3><FiPauseCircle size={20} /> Registrar Pausa</h3>
                  <button type="button" className="btn-close-modal" onClick={() => setShowPauseModal(false)}><FiX size={24} /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Motivo da Pausa *</label>
                    <select
                      value={pauseForm.reason}
                      onChange={(e) => setPauseForm({ ...pauseForm, reason: e.target.value, description: e.target.value === 'outro' ? pauseForm.description : '' })}
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
                        placeholder="Descreva o motivo da pausa"
                      />
                    </div>
                  )}
                  <div className="modal-footer" style={{ borderTop: 'none', background: 'white', padding: '0' }}>
                    <button className="btn btn-secondary" onClick={() => setShowPauseModal(false)}>Cancelar</button>
                    <button 
                      className="btn btn-primary" 
                      disabled={!pauseForm.reason || (pauseForm.reason === 'outro' && !pauseForm.description) || registerLoading} 
                      onClick={handlePauseSubmit}
                    >
                      <FiSave size={16} /> {registerLoading ? 'Registrando...' : 'Confirmar Pausa'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Solicitações (Ver Todas) */}
          {showRequestsModal && (
            <div className="modal-overlay">
              <div className="modal-content large">
                <div className="modal-header">
                  <h3><FiEye size={20} /> Minhas Solicitações</h3>
                  <button type="button" className="btn-close-modal" onClick={() => setShowRequestsModal(false)}><FiX size={24} /></button>
                </div>
                <div className="modal-body">
                  {myRequests.length === 0 ? (
                    <div className="empty-content">
                      <FiFileText size={40} style={{ color: '#dee2e6' }} />
                      <p className="text-muted" style={{ fontStyle: 'normal' }}>Você não possui solicitações registradas.</p>
                    </div>
                  ) : (
                    <div className="table-container" style={{ boxShadow: 'none', margin: '0' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Tipo / Status</th>
                            <th>Detalhes</th>
                            <th>Data da Solicitação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myRequests.map((request, index) => (
                            <tr key={index}>
                              <td>{renderRequestBadges(request.type, request.status)}</td>
                              <td>
                                {request.type === 'absence' 
                                  ? `Data: ${new Date(request.date).toLocaleDateString('pt-BR')}` 
                                  : `Ponto: ${new Date(request.date).toLocaleDateString('pt-BR')} ${request.time}`}
                                <br/>
                                <span className="text-muted">Motivo: {request.reason}</span>
                                {request.description && <p className="text-muted" style={{ margin: '5px 0 0 0' }}>* {request.description}</p>}
                              </td>
                              <td>{new Date(request.createdAt).toLocaleDateString('pt-BR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowRequestsModal(false)}>Fechar</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Solicitação de Ausência */}
          {showAbsenceModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h3><FiCalendar size={20} /> Solicitar Ausência</h3>
                  <button type="button" className="btn-close-modal" onClick={() => setShowAbsenceModal(false)}><FiX size={24} /></button>
                </div>
                <form onSubmit={handleAbsenceSubmit}>
                  <div className="modal-body">
                    <p className="text-muted" style={{ marginBottom: '20px' }}>Use este formulário para solicitar dias de ausência ou férias.</p>
                    <div className="form-group">
                      <label>Data de Ausência *</label>
                      <input 
                        type="date" 
                        value={absenceForm.date} 
                        onChange={(e) => setAbsenceForm({...absenceForm, date: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Motivo *</label>
                      <select 
                        value={absenceForm.reason} 
                        onChange={(e) => setAbsenceForm({...absenceForm, reason: e.target.value})} 
                        required
                      >
                        <option value="">Selecione o motivo</option>
                        <option value="ferias">Férias</option>
                        <option value="licenca-medica">Licença Médica</option>
                        <option value="assuntos-pessoais">Assuntos Pessoais</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Detalhes/Descrição</label>
                      <textarea 
                        value={absenceForm.description} 
                        onChange={(e) => setAbsenceForm({...absenceForm, description: e.target.value})} 
                        rows="3"
                        style={{ height: 'auto', minHeight: '100px' }}
                      ></textarea>
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

          {/* Modal de Ajuste de Ponto Manual */}
          {showTimeRecordModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h3><FiClock size={20} /> Ajuste de Ponto</h3>
                  <button type="button" className="btn-close-modal" onClick={() => setShowTimeRecordModal(false)}><FiX size={24} /></button>
                </div>
                <form onSubmit={handleTimeRecordSubmit}>
                  <div className="modal-body">
                    <p className="text-muted" style={{ marginBottom: '20px' }}>Preencha o formulário para solicitar o registro de um ponto que você esqueceu de bater.</p>
                    <div className="form-group">
                      <label>Data do Ponto *</label>
                      <input 
                        type="date" 
                        value={timeRecordForm.date} 
                        onChange={(e) => setTimeRecordForm({...timeRecordForm, date: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Hora do Ponto *</label>
                      <input 
                        type="time" 
                        value={timeRecordForm.time} 
                        onChange={(e) => setTimeRecordForm({...timeRecordForm, time: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Motivo *</label>
                      <select 
                        value={timeRecordForm.reason} 
                        onChange={(e) => setTimeRecordForm({...timeRecordForm, reason: e.target.value})} 
                        required
                      >
                        <option value="">Selecione o motivo</option>
                        <option value="esquecimento">Esquecimento</option>
                        <option value="falha-equipamento">Falha de Equipamento</option>
                        <option value="trabalho-externo">Trabalho Externo</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Detalhes/Descrição</label>
                      <textarea 
                        value={timeRecordForm.description} 
                        onChange={(e) => setTimeRecordForm({...timeRecordForm, description: e.target.value})} 
                        rows="3"
                        style={{ height: 'auto', minHeight: '100px' }}
                      ></textarea>
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

          {/* Modal de Sucesso */}
          {showSuccessModal && (
            <div className="modal-overlay success-modal">
              <div className="modal-content">
                <div className="success-content">
                  <FiCheckCircle size={60} className="success-icon" />
                  <h3>{modalContent.title}</h3>
                  <p>{modalContent.message}</p>
                </div>
                <div className="modal-footer" style={{ borderTop: 'none', background: 'white' }}>
                  <button className="btn btn-success" onClick={closeAllModals}>
                    <FiCheck size={16} /> Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Erro */}
          {showErrorModal && (
            <div className="modal-overlay error-modal">
              <div className="modal-content">
                <div className="error-content">
                  <FiAlertCircle size={60} className="error-icon" />
                  <h3>{modalContent.title}</h3>
                  <p>{modalContent.message}</p>
                </div>
                <div className="modal-footer" style={{ borderTop: 'none', background: 'white' }}>
                  <button className="btn btn-danger" onClick={closeAllModals}>
                    <FiX size={16} /> Fechar
                  </button>
                </div>
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