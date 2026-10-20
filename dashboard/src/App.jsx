import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Login from './components/Login';
import { authApi } from './api/api';
import { DashboardLayout } from './components/layout';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

const OverviewPage = lazy(() => import('./pages/OverviewPage').then(m => ({ default: m.OverviewPage })));
const AlertsPage = lazy(() => import('./pages/AlertsPage').then(m => ({ default: m.AlertsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const HitMonitorPage = lazy(() => import('./pages/HitMonitorPage').then(m => ({ default: m.HitMonitorPage })));
const ClientsPage = lazy(() => import('./pages/ClientsPage').then(m => ({ default: m.ClientsPage })));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage').then(m => ({ default: m.ClientDetailPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));

const pageFallback = (
    <div style={{ height: '60vh', display: 'grid', placeItems: 'center' }}>Loading…</div>
);

/** Only super admins may open this route. */
function SuperAdminOnly({ children }) {
    const { isSuperAdmin } = useAuth();
    return isSuperAdmin ? children : <Navigate to="/" replace />;
}

/** Only super admins and client admins may open this route. */
function ManagersOnly({ children }) {
    const { canManageClient } = useAuth();
    return canManageClient ? children : <Navigate to="/" replace />;
}

/** Super admin: list of all clients. Client admin: straight to their own client. */
function ClientsRoute() {
    const { isSuperAdmin, canManageClient, clientId } = useAuth();
    if (isSuperAdmin) return <ClientsPage />;
    if (canManageClient && clientId) return <Navigate to={`/clients/${clientId}`} replace />;
    return <Navigate to="/" replace />;
}

function AuthGate() {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [user, setUser] = useState(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        const controller = new AbortController();
        authApi.getProfile({ signal: controller.signal })
            .then((res) => {
                setUser(res?.data ?? null);
                setIsAuthenticated(true);
            })
            .catch((err) => {
                if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
                    setIsAuthenticated(false);
                }
            });
        return () => controller.abort();
    }, []);

    const handleLoginSuccess = (loggedInUser) => {
        setUser(loggedInUser ?? null);
        setIsAuthenticated(true);
    };

    const handleLogout = useCallback(async () => {
        try { await authApi.logout(); } catch { }
        queryClient.clear();
        setUser(null);
        setIsAuthenticated(false);
    }, [queryClient]);

    useEffect(() => {
        if (isAuthenticated !== true) return;
        const handle401 = () => {
            queryClient.clear();
            setUser(null);
            setIsAuthenticated(false);
        };
        window.addEventListener('auth:unauthorized', handle401);
        return () => window.removeEventListener('auth:unauthorized', handle401);
    }, [isAuthenticated, queryClient]);

    if (isAuthenticated === null) {
        return (
            <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
                Checking authentication…
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <AuthProvider user={user} setUser={setUser}>
            <DashboardLayout onLogout={handleLogout}>
                <Suspense fallback={pageFallback}>
                    <Routes>
                        <Route path="/" element={<OverviewPage />} />
                        <Route path="/alerts" element={<AlertsPage />} />
                        <Route path="/notifications" element={<NotificationsPage />} />
                        <Route path="/hit-monitor" element={<ManagersOnly><HitMonitorPage /></ManagersOnly>} />
                        <Route path="/clients" element={<ClientsRoute />} />
                        <Route path="/clients/:clientId" element={<ManagersOnly><ClientDetailPage /></ManagersOnly>} />
                        <Route path="/users" element={<SuperAdminOnly><AdminUsersPage /></SuperAdminOnly>} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </DashboardLayout>
        </AuthProvider>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <ToastProvider>
                    <BrowserRouter>
                        <AuthGate />
                    </BrowserRouter>
                </ToastProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default App;
