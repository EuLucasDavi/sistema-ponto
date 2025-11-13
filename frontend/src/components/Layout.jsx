import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>🏢 Sistema Ponto</h1>
          <p>{user?.role === 'admin' ? 'Painel Admin' : 'Meu Painel'}</p>
        </div>
        <nav>
          <ul>
            <li>
              <Link to="/" className={isActive('/')}>
                📊 {user?.role === 'admin' ? 'Dashboard' : 'Meu Resumo'}
              </Link>
            </li>
            
            {user?.role === 'admin' ? (
              <>
                <li>
                  <Link to="/time-clock" className={isActive('/time-clock')}>
                    ⏰ Registrar Ponto (Admin)
                  </Link>
                </li>
                <li>
                  <Link to="/employees" className={isActive('/employees')}>
                    👥 Funcionários
                  </Link>
                </li>
                <li>
                  <Link to="/users" className={isActive('/users')}>
                    👤 Usuários
                  </Link>
                </li>
                <li>
                  <Link to="/reports" className={isActive('/reports')}>
                    📈 Relatórios
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <Link to="/my-time" className={isActive('/my-time')}>
                  ⏰ Meu Ponto
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="navbar">
          <h2>Sistema de Ponto Eletrônico</h2>
          <div className="navbar-user">
            <div className="user-info">
              <div className="user-name">{user?.username}</div>
              <div className="user-role">
                {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary">
              Sair
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