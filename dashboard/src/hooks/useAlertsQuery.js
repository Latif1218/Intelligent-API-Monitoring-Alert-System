import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '../api/api';
import { QUERY_KEYS } from '../constants';

const REFRESH_MS = 10_000;

export function useAlertsQuery(filters) {
    return useQuery({
        queryKey: [...QUERY_KEYS.ALERTS, filters],
        queryFn: () => alertsApi.getAlerts(filters),
        refetchInterval: REFRESH_MS,
        placeholderData: (prev) => prev,
    });
}

export function useAlertStatsQuery() {
    return useQuery({
        queryKey: QUERY_KEYS.ALERT_STATS,
        queryFn: alertsApi.getStats,
        refetchInterval: REFRESH_MS,
    });
}
