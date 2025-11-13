import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// --- Funções de Ícones SVG (Substituindo react-icons) ---
const IconBarChart = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
);
const IconUsers = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
const IconUser = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);
const IconClock = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);
const IconFileText = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9"></polyline></svg>
);
const IconLogOut = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);
const IconMenu = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
);
const IconX = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const IconBriefcase = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);
// -----------------------------------------------------------

const Layout = ({ children }) => {
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
          <h1>🏢 Ponto App</h1>
          {/* Botão de Fechar para Mobile/Tablet */}
          <button className="close-btn" onClick={toggleSidebar}>
            <IconX size={24} />
          </button>
        </div>
        <nav>
          <ul>
            <li>
              <a onClick={() => handleNavClick("/")} className={isActive('/')}>
                {user?.role === 'admin' ? <IconBarChart /> : <IconBriefcase />}
                {user?.role === 'admin' ? 'Dashboard' : 'Meu Resumo'}
              </a>
            </li>
            
            {user?.role === 'admin' ? (
              <>
                <li>
                  <a onClick={() => handleNavClick("/time-clock")} className={isActive('/time-clock')}>
                    <IconClock /> Registrar Ponto (Admin)
                  </a>
                </li>
                <li>
                  <a onClick={() => handleNavClick("/employees")} className={isActive('/employees')}>
                    <IconUsers /> Funcionários
                  </a>
                </li>
                <li>
                  <a onClick={() => handleNavClick("/users")} className={isActive('/users')}>
                    <IconUser /> Usuários
                  </a>
                </li>
                <li>
                  <a onClick={() => handleNavClick("/reports")} className={isActive('/reports')}>
                    <IconFileText /> Relatórios
                  </a>
                </li>
              </>
            ) : (
              <li>
                <a onClick={() => handleNavClick("/my-time")} className={isActive('/my-time')}>
                  <IconClock /> Meu Ponto
                </a>
              </li>
            )}
            
            <li className="logout-mobile"> 
              <a onClick={handleLogout} className="btn-logout-link">
                <IconLogOut /> Sair
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
          <button className="menu-toggle" onClick={toggleSidebar}>
            <IconMenu size={24} />
          </button>
          
          <h2 className="app-title">Sistema de Ponto Eletrônico</h2>
          
          <div className="navbar-user">
            <div className="user-info">
              <div className="user-name">{user?.username}</div>
              <div className="user-role badge badge-department">
                {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
              </div>
            </div>
            {/* Botão de Sair em Desktop/Navbar */}
            <button onClick={handleLogout} className="btn btn-secondary btn-small">
              <IconLogOut size={16} /> Sair
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