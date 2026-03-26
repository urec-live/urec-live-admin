const backendHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const environment = {
  production: true,
  apiUrl: `http://${backendHost}:8080/api`,
  wsUrl: `http://${backendHost}:8080/ws`
};
