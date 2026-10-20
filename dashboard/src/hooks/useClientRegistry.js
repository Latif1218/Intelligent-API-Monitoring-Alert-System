import { useCallback, useState } from 'react';

// The backend has no "list clients" endpoint, so the dashboard remembers the clients you create
// (or add by ID) in this browser. Client IDs are not secrets; API keys are never stored here.
const STORAGE_KEY = 'apim.clients';

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function save(list) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
        /* storage can be unavailable (private mode): the list just won't persist */
    }
}

export function findStoredClient(id) {
    return load().find((c) => c._id === id) ?? null;
}

export function useClientRegistry() {
    const [clients, setClients] = useState(load);

    const add = useCallback((client) => {
        setClients((prev) => {
            const next = [client, ...prev.filter((c) => c._id !== client._id)];
            save(next);
            return next;
        });
    }, []);

    const remove = useCallback((id) => {
        setClients((prev) => {
            const next = prev.filter((c) => c._id !== id);
            save(next);
            return next;
        });
    }, []);

    return { clients, add, remove };
}
