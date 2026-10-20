import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellOff } from 'lucide-react';
import { alertsApi } from '../api/api';
import { QUERY_KEYS } from '../constants';
import { useAlertsQuery, useAlertStatsQuery } from '../hooks/useAlertsQuery';
import { AlertCard } from '../components/alerts/AlertCard';
import { MonitorTester } from '../components/alerts/MonitorTester';
import { Button, Card, PageStatus } from '../components/ui';
import styles from '../styles/modules/pages/Alerts.module.scss';

const SEVERITIES = [
    { value: '', label: 'All severities' },
    { value: 'critical', label: 'Critical' },
    { value: 'warning', label: 'Warning' },
];
const STATUSES = [
    { value: 'active', label: 'Active' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'all', label: 'All' },
];

function Stat({ label, value, tone }) {
    return (
        <Card className={`${styles.stat} ${tone ? styles[tone] : ''}`}>
            <span className={styles.statValue}>{value ?? '-'}</span>
            <span className={styles.statLabel}>{label}</span>
        </Card>
    );
}

export function AlertsPage() {
    const [severity, setSeverity] = useState('');
    const [status, setStatus] = useState('active');
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();

    const filters = { status, page, limit: 12, ...(severity && { severity }) };
    const { data, isPending, error, refetch } = useAlertsQuery(filters);
    const { data: statsData } = useAlertStatsQuery();
    const stats = statsData?.data;

    const resolveMutation = useMutation({
        mutationFn: alertsApi.resolve,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERTS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERT_STATS });
        },
    });

    if (isPending || error) {
        return <PageStatus isLoading={isPending} error={error} onRetry={refetch} loadingText="Loading alerts..." errorText="Failed to load alerts" />;
    }

    const alerts = data?.data ?? [];
    const pagination = data?.pagination;

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <h2>Alerts</h2>
                <p>Anomalies detected in your external APIs, described in plain language.</p>
            </div>

            <div className={styles.statsRow}>
                <Stat label="Active alerts" value={stats?.active} />
                <Stat label="Critical" value={stats?.critical} tone="toneCritical" />
                <Stat label="Warning" value={stats?.warning} tone="toneWarning" />
                <Stat label="AI-written" value={stats?.aiGenerated} />
            </div>

            <MonitorTester />

            <div className={styles.filters}>
                <select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }} aria-label="Filter by severity">
                    {SEVERITIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
                    {STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span className={styles.filterHint}>Refreshes every 10 seconds</span>
            </div>

            {alerts.length === 0 ? (
                <div className={styles.empty}>
                    <BellOff aria-hidden="true" />
                    <p>No alerts match these filters.</p>
                    <span>Send a batch above to generate some.</span>
                </div>
            ) : (
                <div className={styles.alertList}>
                    {alerts.map((a) => (
                        <AlertCard
                            key={a._id}
                            alert={a}
                            onResolve={(id) => resolveMutation.mutate(id)}
                            resolving={resolveMutation.isPending}
                        />
                    ))}
                </div>
            )}

            {pagination && pagination.totalPages > 1 && (
                <div className={styles.pager}>
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
            )}
        </div>
    );
}
