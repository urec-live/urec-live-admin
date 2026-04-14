const isLocalHost = typeof window !== 'undefined'
  ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  : true;

const localBackend = 'http://localhost:8080';
const railwayBackend = 'https://urec-live-backend-production.up.railway.app';

export const environment = {
  production: false,
  apiUrl: `${isLocalHost ? localBackend : railwayBackend}/api`,
  wsUrl: `${isLocalHost ? localBackend : railwayBackend}/ws`
};
