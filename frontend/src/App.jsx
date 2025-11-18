import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployeeManagement from './components/EmployeeManagement';
import UserManagement from './components/UserManagement';
import Reports from './components/Reports';
import TimeClock from './components/TimeClock';
import Layout from './components/Layout';
import Requests from './components/Requests';
import PauseReasons from './components/PauseReasons';
import './App.css';

// Componente para lidar com rotas não encontradas
const NotFoundRedirect = () => {
  return <Navigate to="/" replace />;
};

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="container">
        <div className="error-message">
          ❌ Acesso restrito a administradores
        </div>
      </div>
    );
  }

  return children;
}

function App() {
  const { user } = useAuth();

  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Rota de login (acesso público) */}
            <Route path="/login" element={<Login />} />

            {/* Layout principal com rotas aninhadas */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Rota padrão - dashboard baseado no role */}
              <Route 
                index 
                element={
                  user?.role === 'admin' ? <Dashboard /> : <EmployeeDashboard />
                } 
              />
              
              {/* Rota específica para funcionários */}
              <Route 
                path="my-time" 
                element={<EmployeeDashboard />} 
              />

              {/* Rotas apenas para administradores */}
              <Route 
                path="employees" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <EmployeeManagement />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="users" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <UserManagement />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="reports" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <Reports />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="time-clock" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <TimeClock />
                  </ProtectedRoute>
                } 
              />

              {/* Rotas para todos os usuários autenticados */}
              <Route 
                path="requests" 
                element={<Requests />} 
              />

              <Route 
                path="pause-reasons" 
                element={<PauseReasons />} 
              />
            </Route>

            {/* Fallback para rotas não encontradas */}
            <Route path="*" element={<NotFoundRedirect />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;