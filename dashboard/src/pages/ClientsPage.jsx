import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, Globe, Mail, Plus } from 'lucide-react';
import { clientApi } from '../api/api';
import { QUERY_KEYS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { formatDate, getErrorMessage } from '../lib/utils';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input } from '../components/ui';
import styles from '../styles/modules/pages/Management.module.scss';

const EMPTY_FORM = { name: '', email: '', description: '', website: '' };

/** Super admin: onboard new clients and open any client to manage its users and API keys. */
export function ClientsPage() {
    const [form, setForm] = useState(EMPTY_FORM);
    const toast = useToast();
    const queryClient = useQueryClient();

    const { data, isPending, error, refetch } = useQuery({
        queryKey: QUERY_KEYS.CLIENTS,
        queryFn: clientApi.listClients,
    });
    const clients = data?.data ?? [];

    const createMutation = useMutation({
        mutationFn: clientApi.createClient,
        onSuccess: (res) => {
            toast(`Client "${res?.data?.name ?? 'new client'}" created`, 'success');
            setForm(EMPTY_FORM);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CLIENTS });
        },
        onError: (err) => toast(getErrorMessage(err, 'Could not create the client'), 'error', 6000),
    });

    const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const submit = (e) => {
        e.preventDefault();
        createMutation.mutate({
            name: form.name.trim(),
            email: form.email.trim(),
            description: form.description.trim(),
            website: form.website.trim(),
        });
    };

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <h2>Clients</h2>
                <p>Each client is a company whose APIs are monitored. Create one, then add its users and API keys.</p>
            </div>

            <div className={styles.grid2}>
                <Card className={styles.card}>
                    <CardHeader>
                        <div className={styles.cardTitleRow}>
                            <Plus aria-hidden="true" />
                            <CardTitle>Create client</CardTitle>
                        </div>
                        <CardDescription>Only a super admin can onboard a new client.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className={styles.form} onSubmit={submit}>
                            <Field label="Client name" htmlFor="client-name" hint="Used to build the client's slug, e.g. City Hospital → city-hospital">
                                <Input id="client-name" value={form.name} onChange={setField('name')} required minLength={2} maxLength={100} placeholder="City Hospital" />
                            </Field>
                            <Field label="Contact email" htmlFor="client-email">
                                <Input id="client-email" type="email" value={form.email} onChange={setField('email')} required placeholder="ops@cityhospital.com" />
                            </Field>
                            <Field label="Website (optional)" htmlFor="client-website">
                                <Input id="client-website" value={form.website} onChange={setField('website')} placeholder="https://cityhospital.com" />
                            </Field>
                            <Field label="Description (optional)" htmlFor="client-description">
                                <Input id="client-description" value={form.description} onChange={setField('description')} maxLength={500} placeholder="What this client does" />
                            </Field>
                            <div className={styles.actions}>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    <Plus aria-hidden="true" size={16} /> {createMutation.isPending ? 'Creating…' : 'Create client'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className={styles.card}>
                    <CardHeader>
                        <div className={styles.cardTitleRow}>
                            <Building2 aria-hidden="true" />
                            <CardTitle>All clients ({clients.length})</CardTitle>
                        </div>
                        <CardDescription>Open a client to create its users and API keys.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isPending && <p className={styles.mutedText}>Loading clients…</p>}
                        {error && (
                            <div className={styles.empty}>
                                <p className={styles.errorText}>{getErrorMessage(error, 'Failed to load clients')}</p>
                                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
                            </div>
                        )}
                        {!isPending && !error && clients.length === 0 && (
                            <div className={styles.empty}>
                                <Building2 aria-hidden="true" />
                                <p>No clients yet. Create the first one on the left.</p>
                            </div>
                        )}
                        {clients.length > 0 && (
                            <div className={styles.clientGrid}>
                                {clients.map((c) => (
                                    <article key={c._id} className={styles.clientCard}>
                                        <h4>{c.name}</h4>
                                        <div className={styles.badgeRow}>
                                            <Badge variant={c.isActive ? 'success' : 'destructive'}>{c.isActive ? 'active' : 'inactive'}</Badge>
                                            {c.slug && <Badge variant="outline">{c.slug}</Badge>}
                                        </div>
                                        {c.email && <span className={styles.metaLine}><Mail aria-hidden="true" /> {c.email}</span>}
                                        {c.website && <span className={styles.metaLine}><Globe aria-hidden="true" /> {c.website}</span>}
                                        <span className={styles.metaLine}>Created {formatDate(c.createdAt)}</span>
                                        <Link className={styles.manageLink} to={`/clients/${c._id}`}>
                                            Manage <ArrowRight aria-hidden="true" />
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
