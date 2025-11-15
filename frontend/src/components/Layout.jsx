import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FiMenu, FiX, FiLogOut, FiBarChart2, FiUsers,
  FiUser, FiClock, FiBriefcase,
  FiHome, FiFileText, FiList
} from 'react-icons/fi';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="layout">
      {/* Botão de menu mobile */}
      <button
        className="mobile-menu-btn"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <FiBriefcase size={28} />
            <h1>Ponto Max</h1>
          </div>
          <p>{user?.role === 'admin' ? 'Painel Admin' : 'Meu Painel'}</p>
        </div>

        <nav>
          <ul>
            <li>
              <Link
                to="/"
                className={isActive('/')}
                onClick={() => setSidebarOpen(false)}
              >
                <FiHome size={20} />
                <span>{user?.role === 'admin' ? 'Dashboard' : 'Meu Resumo'}</span>
              </Link>
            </li>

            {user?.role === 'admin' ? (
              <>
                <li>
                  <Link
                    to="/time-clock"
                    className={isActive('/time-clock')}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <FiClock size={20} />
                    <span>Registrar Ponto (Admin)</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/employees"
                    className={isActive('/employees')}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <FiUsers size={20} />
                    <span>Funcionários</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/users"
                    className={isActive('/users')}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <FiUser size={20} />
                    <span>Usuários</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/requests"
                    className={isActive('/requests')}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <FiFileText size={20} />
                    <span>Solicitações</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pause-reasons"
                    className={isActive('/pause-reasons')}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <FiList size={20} />
                    <span>Justificativas</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/reports"
                    className={isActive('/reports')}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <FiBarChart2 size={20} />
                    <span>Relatórios</span>
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <Link
                  to="/my-time"
                  className={isActive('/my-time')}
                  onClick={() => setSidebarOpen(false)}
                >
                  <FiClock size={20} />
                  <span>Meu Ponto</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Footer da sidebar */}
        <div className="sidebar-footer">
          <div className="user-info-sidebar">
            <div className="user-avatar">
              <FiUser size={16} />
            </div>
            <div className="user-details">
              <div className="user-name">{user?.username}</div>
              <div className="user-role">
                {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-logout"
            title="Sair do sistema"
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="navbar">
          <div className="navbar-left">
            <h2>Ponto Max | Gestão de Jornada</h2>
          </div>

          {/* REMOVIDO: Botão de sair do topo */}
          <div className="navbar-user">
            <div className="user-info">
              <div className="user-avatar">
                <FiUser size={16} />
              </div>
              <div className="user-details">
                <div className="user-name">{user?.username}</div>
                <div className="user-role">
                  {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
                </div>
              </div>
            </div>
            {/* Botão de sair removido aqui */}
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