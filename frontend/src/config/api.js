// Configuração da API - COM DEBUG DETALHADO
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://sistema-ponto-backend-jm4o.onrender.com'
    : 'http://localhost:5000');

export { API_BASE_URL };
export const API_TIMEOUT = 20000;

// Debug detalhado
console.log('=== 🔧 CONFIGURAÇÃO DA API ===');
console.log('🌍 Modo:', import.meta.env.MODE);
console.log('🏷️ VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('🎯 API_BASE_URL final:', API_BASE_URL);
console.log('⏱️ Timeout:', API_TIMEOUT);
console.log('================================');