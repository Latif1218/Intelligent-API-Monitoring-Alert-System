import { clsx } from 'clsx';

export function cn(...inputs) {
    return clsx(inputs);
}

export function getMethodColor(method) {
    const palette = {
        GET: { background: 'rgba(59,130,246,0.2)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.5)' },
        POST: { background: 'rgba(34,197,94,0.2)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.5)' },
        PUT: { background: 'rgba(234,179,8,0.2)', color: '#facc15', borderColor: 'rgba(234,179,8,0.5)' },
        DELETE: { background: 'rgba(239,68,68,0.2)', color: '#f87171', borderColor: 'rgba(239,68,68,0.5)' },
        PATCH: { background: 'rgba(249,115,22,0.2)', color: '#fb923c', borderColor: 'rgba(249,115,22,0.5)' },
    };
    return palette[method] ?? { background: 'rgba(100,116,139,0.2)', color: '#94a3b8', borderColor: 'rgba(100,116,139,0.5)' };
}

export function getStatusVariant(status) {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    return 'destructive';
}

/** Turns an axios error into a message that is safe and useful to show to the user. */
export function getErrorMessage(error, fallback = 'Something went wrong') {
    if (!error) return fallback;
    if (!error.response) {
        return 'Cannot reach the server. Please check that the backend is running.';
    }
    const { status, data } = error.response;
    if (data && typeof data === 'object') {
        if (Array.isArray(data.error) && data.error.length > 0) return data.error.join('. ');
        if (data.message) return data.message;
    }
    if ([502, 503, 504].includes(status)) {
        return 'The server is temporarily unavailable. Please try again in a moment.';
    }
    return fallback;
}

export function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}
