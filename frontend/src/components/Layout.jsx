import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// Simulação de importação do contexto de autenticação para evitar erro de módulo:
let useAuth = () => ({ user: { role: 'user', username: 'Convidado' }, logout: () => console.log('Logout simulado') });
try {
  useAuth = require('../contexts/AuthContext').useAuth;
} catch (e) {
  console.warn("AuthContext não encontrado. Usando autenticação simulada.");
}

// 💡 Importando todos os ícones necessários do react-icons/fi, assumindo que a dependência está instalada.
import { 
  FiMenu, FiX, FiLogOut, FiBarChart2, FiUsers, 
  FiUser, FiFileText, FiClock, FiBriefcase, FiAperture 
} from 'react-icons/fi';

// As funções de ícones SVG inline foram removidas, usando FiAperture como ícone do logotipo.

// 🎯 Novo nome do App: Ponto Max
const APP_NAME = "Ponto Max"; 
const NAVBAR_TITLE = "Ponto Max | Gestão de Jornada";

const Layout = ({ children }) => {
  // O uso de useAuth é mantido na lógica, mas a simulação acima previne o erro de 'require'
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleNavClick = (path) => {
    navigate(path);
    setIsSidebarOpen(false); // Fecha o menu após a navegação (mobile)
  };

  return (
    <div className="layout">
      {/* Sidebar: Adiciona a classe 'open' condicionalmente */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          {/* 🏢 Usando FiAperture como ícone da marca */}
          <h1><FiAperture size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> {APP_NAME}</h1>
          {/* Botão de Fechar para Mobile/Tablet */}
          <button className="close-btn" onClick={toggleSidebar} style={{ cursor: 'pointer' }}>
            <FiX size={24} />
          </button>
        </div>
        <nav>
          <ul>
            <li>
              <a 
                onClick={() => handleNavClick("/")} 
                className={isActive('/')}
                style={{ cursor: 'pointer' }} /* Cursor pointer adicionado */
              >
                {/* 📊 Dashboard vs. Pasta de trabalho */}
                {user?.role === 'admin' ? <FiBarChart2 /> : <FiBriefcase />}
                {user?.role === 'admin' ? 'Dashboard' : 'Meu Resumo'}
              </a>
            </li>
            
            {user?.role === 'admin' ? (
              <>
                <li>
                  <a 
                    onClick={() => handleNavClick("/time-clock")} 
                    className={isActive('/time-clock')}
                    style={{ cursor: 'pointer' }} /* Cursor pointer adicionado */
                  >
                    <FiClock /> Registrar Ponto (Admin)
                  </a>
                </li>
                <li>
                  <a 
                    onClick={() => handleNavClick("/employees")} 
                    className={isActive('/employees')}
                    style={{ cursor: 'pointer' }} /* Cursor pointer adicionado */
                  >
                    <FiUsers /> Funcionários
                  </a>
                </li>
                <li>
                  <a 
                    onClick={() => handleNavClick("/users")} 
                    className={isActive('/users')}
                    style={{ cursor: 'pointer' }} /* Cursor pointer adicionado */
                  >
                    <FiUser /> Usuários
                  </a>
                </li>
                <li>
                  <a 
                    onClick={() => handleNavClick("/reports")} 
                    className={isActive('/reports')}
                    style={{ cursor: 'pointer' }} /* Cursor pointer adicionado */
                  >
                    <FiFileText /> Relatórios
                  </a>
                </li>
              </>
            ) : (
              <li>
                <a 
                  onClick={() => handleNavClick("/my-time")} 
                  className={isActive('/my-time')}
                  style={{ cursor: 'pointer' }} /* Cursor pointer adicionado */
                >
                  <FiClock /> Meu Ponto
                </a>
              </li>
            )}
            
            <li className="logout-mobile"> 
              <a 
                onClick={handleLogout} 
                className="btn-logout-link"
                style={{ cursor: 'pointer' }} /* Cursor pointer adicionado */
              >
                <FiLogOut /> Sair
              </a>
            </li>
          </ul>
        </nav>
      </aside>
      
      {/* Overlay de fundo que escurece quando o menu está aberto */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>} 

      <main className="main-content">
        <header className="navbar">
          {/* Botão Hambúrguer (Visível apenas em mobile/tablet) */}
          <button className="menu-toggle" onClick={toggleSidebar} style={{ cursor: 'pointer' }}>
            <FiMenu size={24} />
          </button>
          
          {/* Título da Navbar mais descritivo */}
          <h2 className="app-title">{NAVBAR_TITLE}</h2>
          
          <div className="navbar-user">
            <div className="user-info">
              <div className="user-name">{user?.username}</div>
              <div className="user-role badge badge-department">
                {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
              </div>
            </div>
            {/* Botão de Sair em Desktop/Navbar */}
            <button onClick={handleLogout} className="btn btn-secondary btn-small" style={{ cursor: 'pointer' }}>
              <FiLogOut size={16} /> Sair
            </button>
          </div>
        </header>
        
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;