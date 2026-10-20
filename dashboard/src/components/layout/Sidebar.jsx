import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
    LayoutDashboard,
    BellRing,
    Mail,
    Send,
    Building2,
    ShieldPlus,
    Settings,
    Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { APP_NAME, APP_AUTHOR } from '../../constants';
import styles from '../../styles/modules/layout/Sidebar.module.scss';

const SUPER = 'super_admin';
const CLIENT_ADMIN = 'client_admin';

// `roles` = who sees the link. No `roles` means everyone who is logged in.
const navItems = [
    { title: 'Overview', href: '/', icon: LayoutDashboard },
    { title: 'Alerts', href: '/alerts', icon: BellRing },
    { title: 'Notifications', href: '/notifications', icon: Mail },
    { title: 'API Hit Monitor', href: '/hit-monitor', icon: Send, roles: [SUPER, CLIENT_ADMIN] },
    { title: 'Clients', href: '/clients', icon: Building2, roles: [SUPER, CLIENT_ADMIN] },
    { title: 'Super Admins', href: '/users', icon: ShieldPlus, roles: [SUPER] },
];

const bottomNavItems = [
    { title: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ isOpen, onClose }) {
    const { user, isSuperAdmin } = useAuth();

    const visibleItems = navItems
        .filter((item) => !item.roles || item.roles.includes(user?.role))
        // A client admin only has one client, so "Clients" reads better as "My Client".
        .map((item) => (item.href === '/clients' && !isSuperAdmin ? { ...item, title: 'My Client' } : item));

    return (
        <>
            {isOpen && (
                <div
                    className={styles.mobileOverlay}
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}
            <aside
                className={cn(styles.sidebar, !isOpen && styles.closed)}
                aria-label="Sidebar"
                aria-expanded={isOpen}
            >
                <div className={styles.sidebarContainer}>
                    <div className={styles.logoSection}>
                        <div className={cn(styles.logoIcon, 'theme-logo-bg')}>
                            <Zap aria-hidden="true" />
                        </div>
                        <div className={styles.logoText}>
                            <h2 className="theme-text-gradient">{APP_NAME}</h2>
                            <p>{APP_AUTHOR}</p>
                        </div>
                    </div>
                    <nav className={styles.navigation} aria-label="Main navigation">
                        <div className={styles.navList}>
                            {visibleItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <NavLink
                                        key={item.href}
                                        to={item.href}
                                        end={item.href === '/'}
                                        onClick={onClose}
                                        className={({ isActive }) =>
                                            cn(styles.navLink, isActive && styles.active)
                                        }
                                    >
                                        <Icon aria-hidden="true" />
                                        <div className={styles.navItem}>
                                            <div>{item.title}</div>
                                        </div>
                                    </NavLink>
                                );
                            })}
                        </div>
                    </nav>
                    <div className={styles.bottomNavigation}>
                        {bottomNavItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.href}
                                    to={item.href}
                                    onClick={onClose}
                                    className={({ isActive }) =>
                                        cn(styles.navLink, isActive && styles.active)
                                    }
                                >
                                    <Icon aria-hidden="true" />
                                    <div className={styles.navItem}>
                                        <div>{item.title}</div>
                                    </div>
                                </NavLink>
                            );
                        })}
                    </div>
                </div>
            </aside>
        </>
    );
}
