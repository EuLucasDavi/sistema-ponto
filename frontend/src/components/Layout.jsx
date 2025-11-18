import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <div className="layout-content">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="main-content">
          {/* Outlet renderiza as rotas filhas definidas no App.jsx */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;