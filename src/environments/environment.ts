const isLocalHost = typeof window !== 'undefined'
  ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  : true;

const localBackend = 'http://localhost:8080';
const railwayBackend = 'https://urec-live-backend-production.up.railway.app';

export const environment = {
  production: false,
<<<<<<< HEAD
  apiUrl: 'http://localhost:8081/api',
  wsUrl: 'http://localhost:8081/ws'
};
=======
  apiUrl: `${isLocalHost ? localBackend : railwayBackend}/api`,
  wsUrl: `${isLocalHost ? localBackend : railwayBackend}/ws`
};
>>>>>>> 85e71d6a21a1575430b1d74c2ecd02f344bbe4ce
