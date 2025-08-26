// API Configuration for different environments
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // For GoDaddy hosting, use subdomain for API
    return process.env.REACT_APP_API_URL || 'https://api.wyenfos.in';
  }
  return 'http://localhost:5000';
};

const getWebSocketUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // For GoDaddy hosting, use subdomain for WebSocket
    return 'wss://api.wyenfos.in';
  }
  return 'ws://localhost:5000';
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  WEBSOCKET_URL: getWebSocketUrl(),
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    ...API_CONFIG.HEADERS,
    Authorization: token ? `Bearer ${token}` : '',
  };
};

// GoDaddy hosting specific configurations
export const GODADDY_CONFIG = {
  DOMAIN: 'wyenfos.in',
  API_SUBDOMAIN: 'api.wyenfos.in',
  APP_PATH: '/wyenfos_bills/#/wyenfos/4551',
  SSL_ENABLED: true,
};
