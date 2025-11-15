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
    return <Navigate to="/login" />;
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
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Rotas para todos os usuários autenticados */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/my-time" element={
              <ProtectedRoute>
                <Layout>
                  <EmployeeDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Rotas apenas para administradores */}
            <Route path="/employees" element={
              <ProtectedRoute requireAdmin={true}>
                <Layout>
                  <EmployeeManagement />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/users" element={
              <ProtectedRoute requireAdmin={true}>
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute requireAdmin={true}>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/time-clock" element={
              <ProtectedRoute requireAdmin={true}>
                <Layout>
                  <TimeClock />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/requests" element={
              <ProtectedRoute>
                <Layout>
                  <Requests />
                </Layout>
              </ProtectedRoute>
            } />

            <Route
              path="/pause-reasons"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PauseReasons />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;