// Configuração da API para ambiente de produção e desenvolvimento
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://sistema-ponto-backend-jm4o.onrender.com/' 
  : 'http://localhost:5000';

export const API_TIMEOUT = 15000;

console.log('🔄 Ambiente:', import.meta.env.MODE);
console.log('🔗 API Base URL:', API_BASE_URL);