import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('userData');

      if (token && userData) {
        // Configurar token padrão para requisições
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Verificar se o token ainda é válido
        try {
          await axios.get('/api/dashboard/stats');
          setUser(JSON.parse(userData));
        } catch (error) {
          // Token inválido - limpar dados
          logout();
        }
      }
    } catch (error) {
      console.error('Erro na verificação de autenticação:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/login', {
        username,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data;
        
        // Salvar no localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('userData', JSON.stringify(user));
        
        // Configurar header padrão
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(user);
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erro ao fazer login';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};