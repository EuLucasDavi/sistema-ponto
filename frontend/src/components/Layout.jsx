import React, {useState} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FiMenu, FiX, FiLogOut, FiBarChart2, FiUsers,
  FiUser, FiFileText, FiClock, FiBriefcase
} from 'react-icons/fi';

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
    setIsSidebarOpen(false); // Fecha o menu após a navegação
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Ponto Max</h1>
          <button className="close-btn" onClick={toggleSidebar}>
            <FiX size={24} />
          </button>
          <p>{user?.role === 'admin' ? 'Painel Admin' : 'Meu Painel'}</p>
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
            <li className="logout-mobile"> 
              <a onClick={handleLogout} className="btn-logout-link">
                <FiLogOut size={20} /> Sair
              </a>
            </li>
          </ul>
        </nav>
      </aside>
      {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <main className="main-content">
        <header className="navbar">
          <button className="menu-toggle" onClick={toggleSidebar}>
            <FiMenu size={24} />
          </button>
          <h2 className="app-title">Ponto Max | Gestão de Jornada</h2>
          <div className="navbar-user">
            <div className="user-info">
              <div className="user-name">{user?.username}</div>
              <div className="user-role badge badge-department">
                {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
              </div>
            </div>
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