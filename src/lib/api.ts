import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const orgId = localStorage.getItem('active_org_id');
    if (orgId) {
      config.headers['x-organization-id'] = orgId;
    }
  }
  return config;
});

// Single-flight refresh: quando vários requests em paralelo tomam 401 ao mesmo
// tempo (o Inbox dispara ~6+ queries no mount), todos compartilham UMA única
// chamada de refresh. Sem isso, cada request disparava seu próprio POST
// /auth/refresh com o mesmo refresh token; se o backend rotaciona o token, só o
// primeiro sucede e os demais caíam no catch → logout do usuário no meio da sessão.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { data } = await axios.post(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken },
  );
  localStorage.setItem('access_token', data.data.accessToken);
  localStorage.setItem('refresh_token', data.data.refreshToken);
  return data.data.accessToken as string;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = refreshAccessToken(refreshToken).finally(() => {
              refreshPromise = null;
            });
          }
          const accessToken = await refreshPromise;
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return api(error.config);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    const message = error.response?.data?.message || error.message;
    return Promise.reject(new Error(Array.isArray(message) ? message[0] : message));
  },
);
