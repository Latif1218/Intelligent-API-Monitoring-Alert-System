import { Sparkles, FileText, CheckCircle2, Repeat, Mail, MailX } from 'lucide-react';
import { Badge, Button } from '../ui';
import styles from '../../styles/modules/pages/Alerts.module.scss';

const TYPE_LABELS = {
    HIGH_RESPONSE_TIME: 'Slow response',
    SERVER_ERROR: 'Server error',
    CLIENT_ERROR: 'Client error',
    ZERO_RECORDS: 'Zero records',
    MISSING_RECORDS: 'Missing records',
    INVALID_DATA: 'Invalid data',
};

function timeAgo(iso) {
    const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

export function AlertCard({ alert, onResolve, resolving }) {
    const isCritical = alert.severity === 'critical';
    const isResolved = alert.status === 'resolved';
    const m = alert.metrics || {};

    return (
        <article className={`${styles.alertCard} ${isCritical ? styles.critical : styles.warning}`}>
            <header className={styles.alertHeader}>
                <div className={styles.alertTitle}>
                    <h3>{alert.apiName}</h3>
                    <Badge variant={isCritical ? 'destructive' : 'warning'}>{alert.severity}</Badge>
                    {isResolved && <Badge variant="success">resolved</Badge>}
                </div>
                <span className={styles.alertTime}>{timeAgo(alert.lastSeenAt)}</span>
            </header>

            <p className={styles.alertMessage}>{alert.message}</p>

            <div className={styles.chips}>
                {alert.anomalyTypes.map((t) => (
                    <span key={t} className={styles.chip}>{TYPE_LABELS[t] || t}</span>
                ))}
            </div>

            <dl className={styles.metrics}>
                <div><dt>Status</dt><dd>{m.statusCode ?? '-'}</dd></div>
                <div><dt>Response</dt><dd>{m.responseTimeMs != null ? `${m.responseTimeMs} ms` : '-'}</dd></div>
                <div><dt>Records</dt><dd>{m.recordsReturned ?? 'missing'}</dd></div>
            </dl>

            <footer className={styles.alertFooter}>
                <span className={styles.source} title={alert.messageSource === 'llm' ? 'Message written by the LLM' : 'Template message (LLM unavailable or disabled)'}>
                    {alert.messageSource === 'llm' ? <Sparkles aria-hidden="true" /> : <FileText aria-hidden="true" />}
                    {alert.messageSource === 'llm' ? 'AI-generated' : 'Template'}
                </span>
                {alert.emailSent && (
                    <span className={styles.source} title="This alert was emailed to the team"><Mail aria-hidden="true" /> Emailed</span>
                )}
                {!alert.emailSent && alert.emailError && (
                    <span className={styles.source} title={alert.emailError}><MailX aria-hidden="true" /> Email failed</span>
                )}
                {alert.occurrences > 1 && (
                    <span className={styles.source}><Repeat aria-hidden="true" /> seen {alert.occurrences}×</span>
                )}
                {!isResolved && (
                    <Button size="sm" variant="outline" onClick={() => onResolve(alert._id)} disabled={resolving}>
                        <CheckCircle2 aria-hidden="true" /> Resolve
                    </Button>
                )}
            </footer>
        </article>
    );
}
