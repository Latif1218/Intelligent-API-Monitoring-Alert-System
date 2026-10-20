import { createContext, useContext, useMemo } from 'react';

const AuthContext = createContext({
    user: null,
    setUser: () => {},
    isSuperAdmin: false,
    isClientAdmin: false,
    canManageClient: false,
    clientId: null,
});

/** Makes the logged-in user (and role helpers) available to every page. */
export function AuthProvider({ user, setUser, children }) {
    const value = useMemo(() => {
        const role = user?.role;
        return {
            user,
            setUser,
            isSuperAdmin: role === 'super_admin',
            isClientAdmin: role === 'client_admin',
            canManageClient: role === 'super_admin' || role === 'client_admin',
            clientId: user?.clientId ? String(user.clientId) : null,
        };
    }, [user, setUser]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
