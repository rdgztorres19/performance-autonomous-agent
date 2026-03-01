export const environment = {
  production: import.meta.env.PROD,
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  wsUrl: import.meta.env.VITE_WS_URL ?? '',
};
