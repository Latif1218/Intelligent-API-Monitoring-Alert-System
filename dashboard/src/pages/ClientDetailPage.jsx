import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, KeyRound, Send, UserPlus } from 'lucide-react';
import { clientApi } from '../api/api';
import { PASSWORD_HINT, QUERY_KEYS, ROLE_LABELS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDate, getErrorMessage } from '../lib/utils';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, CopyButton, Field, Input, Select } from '../components/ui';
import styles from '../styles/modules/pages/Management.module.scss';

const EMPTY_USER = { username: '', email: '', password: '', role: 'client_viewer' };
const EMPTY_KEY = { name: '', description: '', environment: 'production' };
const ENVIRONMENTS = ['production', 'staging', 'development', 'testing'];

/** One client: create its users, create/list its API keys. */
export function ClientDetailPage() {
    const { clientId } = useParams();
    const { isSuperAdmin, canManageClient } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [userForm, setUserForm] = useState(EMPTY_USER);
    const [createdUsers, setCreatedUsers] = useState([]);
    const [keyForm, setKeyForm] = useState(EMPTY_KEY);
    const [newKey, setNewKey] = useState(null);

    // Name/email come from the client list (a client admin's list contains only their own client).
    const clientsQuery = useQuery({ queryKey: QUERY_KEYS.CLIENTS, queryFn: clientApi.listClients });
    const client = (clientsQuery.data?.data ?? []).find((c) => c._id === clientId) ?? null;

    const keysQuery = useQuery({
        queryKey: [...QUERY_KEYS.API_KEYS, clientId],
        queryFn: () => clientApi.getApiKeys(clientId),
        retry: false,
    });

    const userMutation = useMutation({
        mutationFn: (payload) => clientApi.createClientUser(clientId, payload),
        onSuccess: (res) => {
            const user = res?.data;
            toast(`User "${user?.username ?? ''}" created`, 'success');
            if (user) setCreatedUsers((list) => [user, ...list]);
            setUserForm(EMPTY_USER);
        },
        onError: (err) => toast(getErrorMessage(err, 'Could not create the user'), 'error', 7000),
    });

    const keyMutation = useMutation({
        mutationFn: (payload) => clientApi.createApiKey(clientId, payload),
        onSuccess: (res) => {
            setNewKey(res?.data ?? null);
            setKeyForm(EMPTY_KEY);
            toast('API key created', 'success');
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.API_KEYS, clientId] });
        },
        onError: (err) => toast(getErrorMessage(err, 'Could not create the API key'), 'error', 7000),
    });

    const setUserField = (key) => (e) => setUserForm((f) => ({ ...f, [key]: e.target.value }));
    const setKeyField = (key) => (e) => setKeyForm((f) => ({ ...f, [key]: e.target.value }));

    const submitUser = (e) => {
        e.preventDefault();
        userMutation.mutate({
            username: userForm.username.trim(),
            email: userForm.email.trim(),
            password: userForm.password,
            role: userForm.role,
        });
    };

    const submitKey = (e) => {
        e.preventDefault();
        setNewKey(null);
        keyMutation.mutate({
            name: keyForm.name.trim(),
            description: keyForm.description.trim(),
            environment: keyForm.environment,
        });
    };

    const keys = keysQuery.data?.data ?? [];

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                {isSuperAdmin && (
                    <Link to="/clients" className={styles.backLink}><ArrowLeft aria-hidden="true" /> All clients</Link>
                )}
                <h2>{client?.name ?? 'Client'}</h2>
                <p>
                    {client?.email ?? 'Manage this client\'s users and API keys.'}
                    {client?.website ? ` · ${client.website}` : ''}
                </p>
                <div className={styles.badgeRow} style={{ marginTop: '0.75rem' }}>
                    {client && <Badge variant={client.isActive ? 'success' : 'destructive'}>{client.isActive ? 'active' : 'inactive'}</Badge>}
                    {client?.slug && <Badge variant="outline">{client.slug}</Badge>}
                    <Badge variant="secondary">ID {clientId}</Badge>
                </div>
            </div>

            {/* ---------------------------------------------------- API keys */}
            <div className={styles.grid2}>
                {canManageClient && (
                    <Card className={styles.card}>
                        <CardHeader>
                            <div className={styles.cardTitleRow}>
                                <KeyRound aria-hidden="true" />
                                <CardTitle>Create API key</CardTitle>
                            </div>
                            <CardDescription>External services send their API hits with this key (header x-api-key).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className={styles.form} onSubmit={submitKey}>
                                <Field label="Key name" htmlFor="key-name">
                                    <Input id="key-name" value={keyForm.name} onChange={setKeyField('name')} required maxLength={100} placeholder="Patient service key" />
                                </Field>
                                <Field label="Environment" htmlFor="key-env">
                                    <Select id="key-env" value={keyForm.environment} onChange={setKeyField('environment')}>
                                        {ENVIRONMENTS.map((env) => <option key={env} value={env}>{env}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Description (optional)" htmlFor="key-desc">
                                    <Input id="key-desc" value={keyForm.description} onChange={setKeyField('description')} maxLength={500} placeholder="What this key is used for" />
                                </Field>
                                <div className={styles.actions}>
                                    <Button type="submit" disabled={keyMutation.isPending}>
                                        <KeyRound aria-hidden="true" size={16} /> {keyMutation.isPending ? 'Creating…' : 'Create API key'}
                                    </Button>
                                </div>
                            </form>

                            {newKey?.keyValue && (
                                <div className={styles.secretBox} style={{ marginTop: '1rem' }}>
                                    <strong>Copy your new API key now. It is shown only once.</strong>
                                    <code>{newKey.keyValue}</code>
                                    <div className={styles.actions}>
                                        <CopyButton value={newKey.keyValue} label="Copy key" />
                                        <Link to="/hit-monitor" state={{ apiKey: newKey.keyValue }}>
                                            <Button type="button" size="sm" variant="outline">
                                                <Send aria-hidden="true" size={14} /> Test this key
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card className={styles.card}>
                    <CardHeader>
                        <CardTitle>API keys ({keys.length})</CardTitle>
                        <CardDescription>For security the key value is never shown again after creation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {keysQuery.isPending && <p className={styles.mutedText}>Loading keys…</p>}
                        {keysQuery.error && <p className={styles.errorText}>{getErrorMessage(keysQuery.error, 'Failed to load API keys')}</p>}
                        {keysQuery.isSuccess && keys.length === 0 && (
                            <div className={styles.empty}>
                                <KeyRound aria-hidden="true" />
                                <p>No API keys yet.</p>
                            </div>
                        )}
                        {keys.length > 0 && (
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr><th>Name</th><th>Environment</th><th>Status</th><th>Created</th></tr>
                                    </thead>
                                    <tbody>
                                        {keys.map((k) => (
                                            <tr key={k.keyId ?? k._id}>
                                                <td>{k.name}</td>
                                                <td>{k.environment}</td>
                                                <td><Badge variant={k.isActive ? 'success' : 'destructive'}>{k.isActive ? 'active' : 'inactive'}</Badge></td>
                                                <td>{formatDate(k.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ---------------------------------------------------- users */}
            {canManageClient && (
                <div className={styles.grid2}>
                    <Card className={styles.card}>
                        <CardHeader>
                            <div className={styles.cardTitleRow}>
                                <UserPlus aria-hidden="true" />
                                <CardTitle>Create client user</CardTitle>
                            </div>
                            <CardDescription>A client admin can manage keys and users. A viewer can only look at the dashboard.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className={styles.form} onSubmit={submitUser}>
                                <div className={styles.formRow2}>
                                    <Field label="Username" htmlFor="user-username">
                                        <Input id="user-username" value={userForm.username} onChange={setUserField('username')} required minLength={3} autoComplete="off" placeholder="nurse.amy" />
                                    </Field>
                                    <Field label="Role" htmlFor="user-role">
                                        <Select id="user-role" value={userForm.role} onChange={setUserField('role')}>
                                            <option value="client_viewer">{ROLE_LABELS.client_viewer}</option>
                                            <option value="client_admin">{ROLE_LABELS.client_admin}</option>
                                        </Select>
                                    </Field>
                                </div>
                                <Field label="Email" htmlFor="user-email">
                                    <Input id="user-email" type="email" value={userForm.email} onChange={setUserField('email')} required autoComplete="off" placeholder="amy@cityhospital.com" />
                                </Field>
                                <Field label="Password" htmlFor="user-password" hint={PASSWORD_HINT}>
                                    <Input id="user-password" type="password" value={userForm.password} onChange={setUserField('password')} required minLength={8} autoComplete="new-password" />
                                </Field>
                                <div className={styles.actions}>
                                    <Button type="submit" disabled={userMutation.isPending}>
                                        <UserPlus aria-hidden="true" size={16} /> {userMutation.isPending ? 'Creating…' : 'Create user'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className={styles.card}>
                        <CardHeader>
                            <CardTitle>Created in this session</CardTitle>
                            <CardDescription>The backend has no "list users" endpoint yet, so only users you add now are shown.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {createdUsers.length === 0 ? (
                                <div className={styles.empty}>
                                    <p>No users created yet.</p>
                                </div>
                            ) : (
                                <ul className={styles.sessionList}>
                                    {createdUsers.map((u) => (
                                        <li key={u._id} className={styles.sessionItem}>
                                            <span><strong>{u.username}</strong> · {u.email}</span>
                                            <Badge variant={u.role === 'client_admin' ? 'default' : 'secondary'}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
