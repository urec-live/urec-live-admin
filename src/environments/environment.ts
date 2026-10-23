const isLocalHost = typeof window !== 'undefined'
  ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  : true;

const localBackend = 'http://localhost:8080';
const productionBackend = 'https://urec-live-backend.onrender.com';

export const environment = {
  production: false,
  apiUrl: `${isLocalHost ? localBackend : productionBackend}/api`,
  wsUrl: `${isLocalHost ? localBackend : productionBackend}/ws`
};
