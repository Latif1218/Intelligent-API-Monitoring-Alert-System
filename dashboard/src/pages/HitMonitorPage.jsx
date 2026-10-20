import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Send, Shuffle, XCircle } from 'lucide-react';
import { ingestApi } from '../api/api';
import { QUERY_KEYS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../lib/utils';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Select } from '../components/ui';
import styles from '../styles/modules/pages/Management.module.scss';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const SAMPLE_SERVICES = ['PatientDataAPI', 'AppointmentAPI', 'BillingAPI', 'LabResultsAPI'];
const SAMPLE_ENDPOINTS = ['/patients', '/appointments', '/invoices', '/lab-results', '/prescriptions'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function randomHit() {
    const roll = Math.random();
    const statusCode = roll < 0.7 ? 200 : roll < 0.8 ? 201 : roll < 0.9 ? 404 : 500;
    const latencyMs = statusCode >= 500 ? 800 + Math.floor(Math.random() * 4000) : 40 + Math.floor(Math.random() * 900);
    return { serviceName: pick(SAMPLE_SERVICES), endpoint: pick(SAMPLE_ENDPOINTS), method: pick(METHODS), statusCode, latencyMs };
}

const EMPTY_HIT = { serviceName: 'PatientDataAPI', endpoint: '/patients', method: 'GET', statusCode: '200', latencyMs: '120' };

/** Sends API hits to POST /api/hit exactly like an external service would (API key in x-api-key). */
export function HitMonitorPage() {
    const location = useLocation();
    const toast = useToast();
    const queryClient = useQueryClient();
    const refreshTimer = useRef(null);

    const [apiKey, setApiKey] = useState(location.state?.apiKey ?? '');
    const [hit, setHit] = useState(EMPTY_HIT);
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState([]);

    // Stop the delayed dashboard refresh if the user leaves the page.
    useEffect(() => () => clearTimeout(refreshTimer.current), []);

    const setField = (key) => (e) => setHit((h) => ({ ...h, [key]: e.target.value }));

    const sendOne = async (payload) => {
        try {
            const res = await ingestApi.sendHit(apiKey, payload);
            return { ok: true, text: `${payload.method} ${payload.serviceName}${payload.endpoint} → ${payload.statusCode} · queued (${res?.data?.eventId ?? 'no id'})` };
        } catch (err) {
            return { ok: false, text: `${payload.method} ${payload.serviceName}${payload.endpoint} → ${getErrorMessage(err, 'Request failed')}` };
        }
    };

    const run = async (payloads) => {
        if (!apiKey.trim()) {
            toast('Paste an API key first (create one under Clients → Manage).', 'error');
            return;
        }
        setSending(true);
        const outcomes = await Promise.all(payloads.map(sendOne));
        setSending(false);

        const stamped = outcomes.map((o, i) => ({ ...o, id: `${Date.now()}-${i}` }));
        setResults((prev) => [...stamped, ...prev].slice(0, 30));

        const okCount = outcomes.filter((o) => o.ok).length;
        if (okCount > 0) {
            toast(`${okCount} of ${outcomes.length} hit(s) queued`, okCount === outcomes.length ? 'success' : 'info');
            // The consumer saves hits asynchronously, so refresh the overview a moment later.
            clearTimeout(refreshTimer.current);
            refreshTimer.current = setTimeout(() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }), 2500);
        } else {
            toast('No hit was accepted. See the details below.', 'error');
        }
    };

    const submit = (e) => {
        e.preventDefault();
        run([{
            serviceName: hit.serviceName.trim(),
            endpoint: hit.endpoint.trim(),
            method: hit.method,
            statusCode: Number(hit.statusCode),
            latencyMs: Number(hit.latencyMs),
        }]);
    };

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <h2>API hit monitor</h2>
                <p>Send API hits the way an external service does, then watch the Overview charts update.</p>
            </div>

            <div className={styles.grid2}>
                <Card className={styles.card}>
                    <CardHeader>
                        <div className={styles.cardTitleRow}>
                            <Send aria-hidden="true" />
                            <CardTitle>Send a hit</CardTitle>
                        </div>
                        <CardDescription>POST /api/hit with the header x-api-key.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className={styles.form} onSubmit={submit}>
                            <Field label="API key" htmlFor="hit-key" hint="Create a key under Clients → Manage. It starts with apim_">
                                <Input id="hit-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" placeholder="apim_..." />
                            </Field>
                            <div className={styles.formRow2}>
                                <Field label="Service name" htmlFor="hit-service">
                                    <Input id="hit-service" value={hit.serviceName} onChange={setField('serviceName')} required />
                                </Field>
                                <Field label="Endpoint" htmlFor="hit-endpoint">
                                    <Input id="hit-endpoint" value={hit.endpoint} onChange={setField('endpoint')} required />
                                </Field>
                            </div>
                            <div className={styles.formRow2}>
                                <Field label="Method" htmlFor="hit-method">
                                    <Select id="hit-method" value={hit.method} onChange={setField('method')}>
                                        {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Status code" htmlFor="hit-status">
                                    <Input id="hit-status" type="number" min="100" max="599" value={hit.statusCode} onChange={setField('statusCode')} required />
                                </Field>
                                <Field label="Latency (ms)" htmlFor="hit-latency">
                                    <Input id="hit-latency" type="number" min="1" step="any" value={hit.latencyMs} onChange={setField('latencyMs')} required />
                                </Field>
                            </div>
                            <div className={styles.actions}>
                                <Button type="submit" disabled={sending}>
                                    <Send aria-hidden="true" size={16} /> {sending ? 'Sending…' : 'Send hit'}
                                </Button>
                                <Button type="button" variant="outline" disabled={sending} onClick={() => run(Array.from({ length: 10 }, randomHit))}>
                                    <Shuffle aria-hidden="true" size={16} /> Send 10 random hits
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className={styles.card}>
                    <CardHeader>
                        <CardTitle>Results</CardTitle>
                        <CardDescription>Hits are queued in RabbitMQ and saved by the consumer, so they reach the Overview a few seconds later.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {results.length === 0 ? (
                            <div className={styles.empty}>
                                <Send aria-hidden="true" />
                                <p>Nothing sent yet.</p>
                            </div>
                        ) : (
                            <ul className={styles.resultList}>
                                {results.map((r) => (
                                    <li key={r.id} className={`${styles.resultItem} ${r.ok ? styles.ok : styles.fail}`}>
                                        {r.ok ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
                                        <span>{r.text}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
