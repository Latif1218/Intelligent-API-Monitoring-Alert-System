// Branding (shown in the sidebar, login page and browser tab)
export const APP_NAME = 'Intelligent API Monitoring & Alert';
export const APP_AUTHOR = 'by Md Abdul Latif';

export const QUERY_KEYS = {
    ALERTS: ['alerts'],
    ALERT_STATS: ['alertStats'],
    DASHBOARD: ['dashboard'],
    STATS: ['stats'],
    TOP_ENDPOINTS: ['topEndpoints'],
    TIME_SERIES: ['timeSeries'],
    CURRENT_CLIENT: ['currentClient'],
    API_KEYS: ['apiKeys'],
    CLIENTS: ['clients'],
    EMAIL_STATUS: ['emailStatus'],
};

export const REFETCH_INTERVAL = 30_000;

export const ROLE_LABELS = {
    super_admin: 'Super Admin',
    client_admin: 'Client Admin',
    client_viewer: 'Client Viewer',
};

// Same rules the backend enforces (SecurityUtils.PASSWORD_REQUIREMENTS)
export const PASSWORD_HINT =
    'At least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.';
