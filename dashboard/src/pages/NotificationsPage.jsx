import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCircle2, Mail, MailCheck, MailX, Send, XCircle } from 'lucide-react';
import { alertsApi } from '../api/api';
import { QUERY_KEYS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAlertsQuery } from '../hooks/useAlertsQuery';
import { formatDate, getErrorMessage } from '../lib/utils';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui';
import styles from '../styles/modules/pages/Management.module.scss';

const ENV_EXAMPLE = `ALERT_EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=you@gmail.com
ALERT_EMAIL_TO=team@example.com`;

/** Email setup (read from the server), a "send test email" button, and which alerts were emailed. */
export function NotificationsPage() {
    const { canManageClient } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [testResult, setTestResult] = useState(null);

    const statusQuery = useQuery({ queryKey: QUERY_KEYS.EMAIL_STATUS, queryFn: alertsApi.getEmailStatus });
    const alertsQuery = useAlertsQuery({ status: 'all', page: 1, limit: 50 });

    const status = statusQuery.data?.data;
    const alerts = alertsQuery.data?.data ?? [];

    // Use the server's counters when present, otherwise count from the alerts we already loaded.
    const sentCount = status?.sent ?? alerts.filter((a) => a.emailSent).length;
    const failedCount = status?.failed ?? alerts.filter((a) => a.emailError && !a.emailSent).length;

    const testMutation = useMutation({
        mutationFn: alertsApi.sendTestEmail,
        onSuccess: (res) => {
            const result = res?.data;
            const ok = Boolean(result?.sent);
            setTestResult({ ok, text: result?.message ?? (ok ? 'Test email sent.' : 'The test email could not be sent.') });
            toast(ok ? 'Test email sent' : 'Test email failed', ok ? 'success' : 'error', 6000);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMAIL_STATUS });
        },
        onError: (err) => {
            const text = getErrorMessage(err, 'Could not send the test email');
            setTestResult({ ok: false, text });
            toast(text, 'error', 7000);
        },
    });

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <h2>Notifications</h2>
                <p>New alerts are emailed automatically when email is enabled on the server.</p>
            </div>

            <div className={styles.grid2}>
                <Card className={styles.card}>
                    <CardHeader>
                        <div className={styles.cardTitleRow}>
                            <Mail aria-hidden="true" />
                            <CardTitle>Email setup</CardTitle>
                        </div>
                        <CardDescription>Read from the server settings. Passwords are never shown.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statusQuery.isPending && <p className={styles.mutedText}>Checking…</p>}
                        {statusQuery.error && <p className={styles.errorText}>{getErrorMessage(statusQuery.error, 'Could not read the email settings')}</p>}
                        {status && (
                            <div className={styles.form}>
                                <div className={styles.statusRow}>
                                    <Badge variant={status.enabled ? 'success' : 'secondary'}>{status.enabled ? 'Enabled' : 'Disabled'}</Badge>
                                    <span className={styles.mutedText}>{status.reason}</span>
                                </div>

                                <dl className={styles.profileGrid}>
                                    <div><dt>SMTP host</dt><dd>{status.host ?? '-'}{status.port ? `:${status.port}` : ''}</dd></div>
                                    <div><dt>From</dt><dd>{status.from ?? '-'}</dd></div>
                                    <div><dt>To</dt><dd>{status.to ?? '-'}</dd></div>
                                    <div><dt>SMTP login</dt><dd>{status.authConfigured ? 'Configured' : 'Not set'}</dd></div>
                                    <div><dt>Emails sent</dt><dd>{sentCount}</dd></div>
                                    <div><dt>Emails failed</dt><dd>{failedCount}</dd></div>
                                </dl>

                                {!status.enabled && (
                                    <>
                                        <p className={styles.mutedText}>
                                            To turn email on, add these to <code>server/.env</code> and recreate the api-app container:
                                        </p>
                                        <pre className={styles.codeBlock}>{ENV_EXAMPLE}</pre>
                                    </>
                                )}

                                {canManageClient && (
                                    <div className={styles.actions}>
                                        <Button onClick={() => { setTestResult(null); testMutation.mutate(); }} disabled={!status.enabled || testMutation.isPending}>
                                            <Send aria-hidden="true" size={16} /> {testMutation.isPending ? 'Sending…' : 'Send test email'}
                                        </Button>
                                        {!status.enabled && <span className={styles.mutedText}>Enable email first.</span>}
                                    </div>
                                )}

                                {testResult && (
                                    <ul className={styles.resultList}>
                                        <li className={`${styles.resultItem} ${testResult.ok ? styles.ok : styles.fail}`}>
                                            {testResult.ok ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
                                            <span>{testResult.text}</span>
                                        </li>
                                    </ul>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className={styles.card}>
                    <CardHeader>
                        <div className={styles.cardTitleRow}>
                            <BellRing aria-hidden="true" />
                            <CardTitle>Recent alerts and email status</CardTitle>
                        </div>
                        <CardDescription>The latest {alerts.length} alerts and whether each one was emailed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {alertsQuery.isPending && <p className={styles.mutedText}>Loading alerts…</p>}
                        {alertsQuery.error && <p className={styles.errorText}>{getErrorMessage(alertsQuery.error, 'Failed to load alerts')}</p>}
                        {alertsQuery.isSuccess && alerts.length === 0 && (
                            <div className={styles.empty}>
                                <BellRing aria-hidden="true" />
                                <p>No alerts yet.</p>
                            </div>
                        )}
                        {alerts.length > 0 && (
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr><th>API</th><th>Severity</th><th>Status</th><th>Email</th><th>Last seen</th></tr>
                                    </thead>
                                    <tbody>
                                        {alerts.map((a) => {
                                            const failed = !a.emailSent && Boolean(a.emailError);
                                            return (
                                                <tr key={a._id}>
                                                    <td>{a.apiName}</td>
                                                    <td><Badge variant={a.severity === 'critical' ? 'destructive' : 'warning'}>{a.severity}</Badge></td>
                                                    <td>{a.status}</td>
                                                    <td title={failed ? a.emailError : undefined}>
                                                        <span className={styles.statusRow}>
                                                            {a.emailSent ? <MailCheck size={16} aria-hidden="true" /> : <MailX size={16} aria-hidden="true" />}
                                                            {a.emailSent ? 'Sent' : failed ? 'Failed' : 'Not sent'}
                                                        </span>
                                                    </td>
                                                    <td>{formatDate(a.lastSeenAt)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
