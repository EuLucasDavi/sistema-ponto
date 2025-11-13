import React, { useState } from 'react'; // 🆕 Importar useState
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// 🆕 Presumindo que você use react-icons
import { 
  FiMenu, FiX, FiLogOut, FiBarChart2, FiUsers, 
  FiUser, FiFileText, FiClock, FiBriefcase 
} from 'react-icons/fi';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // 🆕 Estado para controlar a abertura/fechamento da sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => { // 🆕 Função para alternar o menu
    setIsSidebarOpen(!isSidebarOpen);
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  // Função para fechar o menu e navegar (usado em mobile)
  const handleNavClick = (path) => {
    navigate(path);
    setIsSidebarOpen(false); // Fecha o menu após a navegação
  };

  return (
    <div className="layout">
      {/* 🆕 Adiciona a classe 'open' condicionalmente */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>🏢 Ponto App</h1>
          {/* 🆕 Botão de Fechar para Mobile/Tablet */}
          <button className="close-btn" onClick={toggleSidebar}>
            <FiX size={24} />
          </button>
        </div>
        <nav>
          <ul>
            <li>
              <a onClick={() => handleNavClick("/")} className={isActive('/')}>
                {user?.role === 'admin' ? <FiBarChart2 size={20} /> : <FiBriefcase size={20} />}
                {user?.role === 'admin' ? 'Dashboard' : 'Meu Resumo'}
              </a>
            </li>
            
            {user?.role === 'admin' ? (
              <>
                <li>
                  <a onClick={() => handleNavClick("/time-clock")} className={isActive('/time-clock')}>
                    <FiClock size={20} /> Registrar Ponto (Admin)
                  </a>
                </li>
                <li>
                  <a onClick={() => handleNavClick("/employees")} className={isActive('/employees')}>
                    <FiUsers size={20} /> Funcionários
                  </a>
                </li>
                <li>
                  <a onClick={() => handleNavClick("/users")} className={isActive('/users')}>
                    <FiUser size={20} /> Usuários
                  </a>
                </li>
                <li>
                  <a onClick={() => handleNavClick("/reports")} className={isActive('/reports')}>
                    <FiFileText size={20} /> Relatórios
                  </a>
                </li>
              </>
            ) : (
              <li>
                <a onClick={() => handleNavClick("/my-time")} className={isActive('/my-time')}>
                  <FiClock size={20} /> Meu Ponto
                </a>
              </li>
            )}
            
            {/* Link de Sair fixo no final do menu */}
            <li className="logout-mobile"> 
              <a onClick={handleLogout} className="btn-logout-link">
                <FiLogOut size={20} /> Sair
              </a>
            </li>
          </ul>
        </nav>
      </aside>
      
      {/* 🆕 Overlay de fundo que escurece quando o menu está aberto */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>} 

      <main className="main-content">
        <header className="navbar">
          {/* 🆕 Botão Hambúrguer (Visível apenas em mobile/tablet) */}
          <button className="menu-toggle" onClick={toggleSidebar}>
            <FiMenu size={24} />
          </button>
          
          <h2 className="app-title">Sistema de Ponto Eletrônico</h2> {/* 🆕 Classe para esconder no mobile */}
          
          <div className="navbar-user">
            <div className="user-info">
              <div className="user-name">{user?.username}</div>
              <div className="user-role badge badge-department">
                {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
              </div>
            </div>
            {/* 🆕 Botão de Sair em Desktop/Navbar */}
            <button onClick={handleLogout} className="btn btn-secondary btn-small">
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