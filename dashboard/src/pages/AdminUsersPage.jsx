import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldPlus } from 'lucide-react';
import { authApi } from '../api/api';
import { PASSWORD_HINT } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { formatDate, getErrorMessage } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input } from '../components/ui';
import styles from '../styles/modules/pages/Management.module.scss';

const EMPTY_FORM = { username: '', email: '', password: '' };

/** Super admin: register another super admin. (Client users are created inside Clients → Manage.) */
export function AdminUsersPage() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [created, setCreated] = useState([]);
    const toast = useToast();
    const { setUser } = useAuth();

    const registerMutation = useMutation({
        mutationFn: authApi.register,
        onSuccess: async (res) => {
            const user = res?.data;
            toast(`Super admin "${user?.username ?? ''}" registered. You are now signed in as this account.`, 'success', 6000);
            if (user) setCreated((list) => [user, ...list]);
            setForm(EMPTY_FORM);
            // The server signs the browser in as the account that was just registered,
            // so refresh who the dashboard thinks is logged in.
            try {
                const profile = await authApi.getProfile();
                setUser(profile?.data ?? null);
            } catch {
                /* if this fails the next page load will sort it out */
            }
        },
        onError: (err) => toast(getErrorMessage(err, 'Could not register the user'), 'error', 7000),
    });

    const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const submit = (e) => {
        e.preventDefault();
        registerMutation.mutate({
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
            role: 'super_admin',
        });
    };

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <h2>Super admins</h2>
                <p>Register another super admin. Users that belong to a client are created from Clients → Manage.</p>
                <p style={{ marginTop: '0.5rem' }}>Note: after registering, the server signs you in as the new account (it has the same super admin rights).</p>
            </div>

            <div className={styles.grid2}>
                <Card className={styles.card}>
                    <CardHeader>
                        <div className={styles.cardTitleRow}>
                            <ShieldPlus aria-hidden="true" />
                            <CardTitle>Register super admin</CardTitle>
                        </div>
                        <CardDescription>Super admins can see every client and manage the whole system.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className={styles.form} onSubmit={submit}>
                            <Field label="Username" htmlFor="admin-username" hint="Letters, numbers, dots, dashes and underscores. At least 3 characters.">
                                <Input id="admin-username" value={form.username} onChange={setField('username')} required minLength={3} autoComplete="off" placeholder="jane.admin" />
                            </Field>
                            <Field label="Email" htmlFor="admin-email">
                                <Input id="admin-email" type="email" value={form.email} onChange={setField('email')} required autoComplete="off" placeholder="jane@example.com" />
                            </Field>
                            <Field label="Password" htmlFor="admin-password" hint={PASSWORD_HINT}>
                                <Input id="admin-password" type="password" value={form.password} onChange={setField('password')} required minLength={8} autoComplete="new-password" />
                            </Field>
                            <div className={styles.actions}>
                                <Button type="submit" disabled={registerMutation.isPending}>
                                    <ShieldPlus aria-hidden="true" size={16} /> {registerMutation.isPending ? 'Registering…' : 'Register super admin'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className={styles.card}>
                    <CardHeader>
                        <CardTitle>Registered in this session</CardTitle>
                        <CardDescription>The backend has no "list users" endpoint yet, so only accounts you add now are shown.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {created.length === 0 ? (
                            <div className={styles.empty}>
                                <p>Nothing registered yet.</p>
                            </div>
                        ) : (
                            <ul className={styles.sessionList}>
                                {created.map((u) => (
                                    <li key={u._id} className={styles.sessionItem}>
                                        <span><strong>{u.username}</strong> · {u.email}</span>
                                        <span className={styles.badgeRow}>
                                            <Badge variant="default">super admin</Badge>
                                            <span className={styles.mutedText}>{formatDate(u.createdAt)}</span>
                                        </span>
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
