import axios from 'axios';

const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL ?? '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url ?? '';
        // A 401 from /auth/* or /monitor (wrong monitor key) is not an expired login session.
        const isAuthRoute = url.includes('/auth/') || url.includes('/monitor');
        if (error.response?.status === 401 && !isAuthRoute) {
            window.dispatchEvent(new Event('auth:unauthorized'));
        }
        return Promise.reject(error);
    }
);

/* ---------------------------------------------------------------- Auth */
export const authApi = {
    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },
    // First-time setup only: works while no user exists yet.
    onboardSuperAdmin: async (data) => {
        const response = await api.post('/auth/onboard-super-admin', data);
        return response.data;
    },
    // Super admin only: creates another super admin account.
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },
    getProfile: async (options) => {
        const response = await api.get('/auth/profile', { signal: options?.signal });
        return response.data;
    },
    logout: async () => {
        const response = await api.get('/auth/logout');
        return response.data;
    },
};

/* ----------------------------------------------------------- Analytics */
export const analyticsApi = {
    getDashboard: async () => {
        const response = await api.get('/analytics/dashboard');
        const payload = response.data || {};

        payload.data = payload.data || {};

        payload.data.stats = payload.data.stats ?? {
            totalHits: 0,
            avgLatency: 0,
            errorRate: 0,
            errorHits: 0,
            successHits: 0,
            uniqueServices: 0,
            uniqueEndpoints: 0,
        };

        payload.data.topEndpoints = payload.data.topEndpoints ?? [];
        payload.data.recentActivity = payload.data.recentActitivy ?? payload.data.recentActivity ?? [];

        return payload;
    },
    getStats: async (params) => {
        const response = await api.get('/analytics/stats', { params });
        return response.data;
    },
};

/* -------------------------------------------------------------- Alerts */
export const alertsApi = {
    getAlerts: async (params) => {
        const response = await api.get('/alerts', { params });
        return response.data;
    },
    getStats: async () => {
        const response = await api.get('/alerts/stats');
        return response.data;
    },
    // Email setup (masked address, no passwords) + counters
    getEmailStatus: async () => {
        const response = await api.get('/alerts/email-status');
        return response.data;
    },
    // Sends a test email. Note: the server answers 200 even when SMTP fails; check data.sent.
    sendTestEmail: async () => {
        const response = await api.post('/alerts/email-test');
        return response.data;
    },
    resolve: async (id) => {
        const response = await api.patch(`/alerts/${id}/resolve`);
        return response.data;
    },
    // Sends a batch of API responses to POST /monitor (used by the "Test monitor" card)
    monitor: async (records) => {
        const response = await api.post('/monitor', records);
        return response.data;
    },
};

/* ------------------------------------------------- Clients & API keys */
export const clientApi = {
    // Super admin: every client. Client users: only their own.
    listClients: async () => {
        const response = await api.get('/admin/clients');
        return response.data;
    },
    // Super admin only
    createClient: async (clientData) => {
        const response = await api.post('/admin/clients/onboard', clientData);
        return response.data;
    },
    createClientUser: async (clientId, userData) => {
        const response = await api.post(`/admin/clients/${clientId}/users`, userData);
        return response.data;
    },
    createApiKey: async (clientId, keyData) => {
        const response = await api.post(`/admin/clients/${clientId}/api/keys`, keyData);
        return response.data;
    },
    getApiKeys: async (clientId) => {
        const response = await api.get(`/admin/clients/${clientId}/api/keys`);
        return response.data;
    },
};

/* ------------------------------------------------------------- API hits */
export const ingestApi = {
    // External services authenticate with an API key (x-api-key), not with the login cookie,
    // so this uses a plain axios call and never sends cookies.
    sendHit: async (apiKey, hit) => {
        const response = await axios.post(`${API_BASE_URL}/hit`, hit, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': String(apiKey).trim(),
            },
            withCredentials: false,
        });
        return response.data;
    },
};

export default api;
