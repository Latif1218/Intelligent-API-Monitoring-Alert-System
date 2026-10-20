import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { alertsApi } from '../../api/api';
import { QUERY_KEYS } from '../../constants';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui';
import styles from '../../styles/modules/pages/Alerts.module.scss';

const EXAMPLE = JSON.stringify(
    [
        { api_name: 'PatientDataAPI', response_time_ms: 1200, status_code: 200, records_returned: 50 },
        { api_name: 'AppointmentAPI', response_time_ms: 5500, status_code: 500, records_returned: 0 },
    ],
    null,
    2
);

/** Lets you POST a batch to /monitor from the UI (handy for demos and the walkthrough video). */
export function MonitorTester() {
    const [text, setText] = useState(EXAMPLE);
    const [parseError, setParseError] = useState('');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (records) => alertsApi.monitor(records),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERTS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERT_STATS });
        },
    });

    const submit = () => {
        try {
            setParseError('');
            mutation.mutate(JSON.parse(text));
        } catch {
            setParseError('This is not valid JSON.');
        }
    };

    const summary = mutation.data?.data?.summary;

    return (
        <Card className={styles.testerCard}>
            <CardHeader>
                <CardTitle>Test the monitor</CardTitle>
                <CardDescription>Send a batch of API responses to POST /monitor and watch alerts appear below.</CardDescription>
            </CardHeader>
            <CardContent>
                <textarea
                    className={styles.jsonInput}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    spellCheck={false}
                    aria-label="JSON batch of API responses"
                />
                <div className={styles.testerActions}>
                    <Button onClick={submit} disabled={mutation.isPending}>
                        <Play aria-hidden="true" /> {mutation.isPending ? 'Analysing…' : 'Run monitor'}
                    </Button>
                    {parseError && <span className={styles.errorText}>{parseError}</span>}
                    {mutation.isError && <span className={styles.errorText}>{mutation.error?.response?.data?.message || 'Request failed'}</span>}
                    {summary && (
                        <span className={styles.resultText}>
                            {summary.received} received · {summary.anomalies} anomalies · {summary.healthy} healthy · {summary.invalid} invalid
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
