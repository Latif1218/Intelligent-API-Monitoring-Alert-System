import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '../components/ui';
import { ThemeSelector } from '../components/ThemeSelector';
import { Palette, UserRound } from 'lucide-react';
import { ROLE_LABELS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/modules/pages/PageComponents.module.scss';
import profileStyles from '../styles/modules/pages/Management.module.scss';

const PERMISSION_LABELS = {
    canViewAnalytics: 'View analytics',
    canCreateApiKeys: 'Create API keys',
    canManageUsers: 'Manage users',
    canExportData: 'Export data',
};

export function SettingsPage() {
    const { user } = useAuth();
    const permissions = user?.permissions ?? {};

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <h2>Settings</h2>
                <p>Your account and preferences</p>
            </div>

            {user && (
                <Card className={styles.sectionCard}>
                    <CardHeader>
                        <div className={styles.cardTitleRow}>
                            <UserRound className={styles.cardTitleIcon} aria-hidden="true" />
                            <CardTitle>Profile</CardTitle>
                        </div>
                        <CardDescription>The account you are signed in with</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <dl className={profileStyles.profileGrid}>
                            <div><dt>Username</dt><dd>{user.username}</dd></div>
                            <div><dt>Email</dt><dd>{user.email}</dd></div>
                            <div><dt>Role</dt><dd>{ROLE_LABELS[user.role] ?? user.role}</dd></div>
                            {user.clientId && <div><dt>Client ID</dt><dd>{String(user.clientId)}</dd></div>}
                        </dl>
                        {user.role !== 'super_admin' && (
                            <div className={profileStyles.badgeRow} style={{ marginTop: '1rem' }}>
                                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                    <Badge key={key} variant={permissions[key] ? 'success' : 'secondary'}>{label}</Badge>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className={styles.sectionCard}>
                <CardHeader>
                    <div className={styles.cardTitleRow}>
                        <Palette className={styles.cardTitleIcon} aria-hidden="true" />
                        <CardTitle>Appearance</CardTitle>
                    </div>
                    <CardDescription>Customize the look and feel of your dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                    <ThemeSelector />
                </CardContent>
            </Card>
        </div>
    );
}
