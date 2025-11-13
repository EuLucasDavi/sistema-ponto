import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('🔄 Inicializando AuthContext...');
    console.log('🔗 URL da API:', API_BASE_URL);
    
    // Configurar axios
    axios.defaults.baseURL = API_BASE_URL;
    axios.defaults.timeout = API_TIMEOUT;
    
    // Verificar token salvo
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      console.log('📦 Token encontrado no localStorage, verificando...');
      try {
        const userObj = JSON.parse(userData);
        setUser(userObj);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('✅ Usuário restaurado:', userObj.username);
      } catch (parseError) {
        console.error('❌ Erro ao parsear user data:', parseError);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      console.log('📦 Nenhum token encontrado no localStorage');
    }
    
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    console.log('🔐 Iniciando processo de login...');
    console.log('🎯 URL da API:', API_BASE_URL);
    console.log('👤 Usuário:', username);
    
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/login', {
        username,
        password
      });

      console.log('✅ Resposta do servidor:', response.data);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        // Salvar no localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        
        console.log('🎉 Login realizado com sucesso!');
        return { success: true };
      } else {
        throw new Error(response.data.error || 'Erro no login');
      }
      
    } catch (error) {
      console.error('❌ ERRO NO LOGIN:', error);
      
      let errorMessage = 'Erro ao conectar com o servidor';
      
      if (error.response) {
        // Servidor respondeu com erro
        console.error('📡 Resposta de erro:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
        errorMessage = error.response.data?.error || `Erro ${error.response.status}`;
      } else if (error.request) {
        // Requisição foi feita mas não houve resposta
        console.error('🌐 Não houve resposta do servidor:', error.request);
        errorMessage = 'Servidor não respondeu. Verifique a conexão.';
      } else {
        // Erro na configuração
        console.error('⚙️ Erro na configuração:', error.message);
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('🚪 Realizando logout...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError('');
  };

  const clearError = () => setError('');

  const value = {
    user,
    login,
    logout,
    loading,
    error,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};