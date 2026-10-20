import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/api';
import { Activity, Lock, Mail, User, Loader2 } from 'lucide-react';
import { APP_NAME, APP_AUTHOR, PASSWORD_HINT } from '../constants';
import { getErrorMessage } from '../lib/utils';
import styles from '../styles/modules/Login.module.scss';

function Login({ onLoginSuccess }) {
    // 'login' = normal sign in, 'setup' = create the very first super admin
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const isSetup = mode === 'setup';

    const authMutation = useMutation({
        mutationFn: (payload) => (isSetup ? authApi.onboardSuperAdmin(payload) : authApi.login(payload)),
        onSuccess: (data) => {
            if (data.success) {
                // Server sets cookie `authToken`; don't persist token in localStorage
                onLoginSuccess(data.data);
            } else {
                setError(data.message);
            }
        },
        onError: (err) => {
            setError(getErrorMessage(err, 'Failed to connect to server'));
        },
    });

    const switchMode = () => {
        setError('');
        setPassword('');
        setMode(isSetup ? 'login' : 'setup');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        authMutation.mutate(isSetup ? { username, email, password } : { username, password });
    };

    return (
        <div className={styles.container}>
            {/* Animated background elements */}
            <div className={styles.backgroundElements}>
                <div className={`${styles.backgroundOrb} ${styles.orb1}`}></div>
                <div className={`${styles.backgroundOrb} ${styles.orb2}`}></div>
                <div className={`${styles.backgroundOrb} ${styles.orb3}`}></div>
            </div>

            <div className={styles.loginCard}>
                <div className={styles.cardHeader}>
                    <div className={styles.logoContainer}>
                        <Activity />
                    </div>
                    <h1 className={styles.title}>
                        {APP_NAME}
                    </h1>
                    <p className={styles.byline}>{APP_AUTHOR}</p>
                    <p className={styles.description}>
                        {isSetup
                            ? 'First-time setup: create the super admin account'
                            : 'Sign in to access your dashboard'}
                    </p>
                </div>
                <div className={styles.cardContent}>
                    {error && (
                        <div className={styles.errorMessage}>
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="username" className={styles.label}>
                                Username
                            </label>
                            <div className={styles.inputContainer}>
                                <User />
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    disabled={authMutation.isPending}
                                    className={styles.input}
                                    placeholder="Enter your username"
                                />
                            </div>
                        </div>
                        {isSetup && (
                            <div className={styles.inputGroup}>
                                <label htmlFor="email" className={styles.label}>
                                    Email
                                </label>
                                <div className={styles.inputContainer}>
                                    <Mail />
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={authMutation.isPending}
                                        className={styles.input}
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>
                        )}
                        <div className={styles.inputGroup}>
                            <label htmlFor="password" className={styles.label}>
                                Password
                            </label>
                            <div className={styles.inputContainer}>
                                <Lock />
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={authMutation.isPending}
                                    className={styles.input}
                                    placeholder="Enter your password"
                                    autoComplete={isSetup ? 'new-password' : 'current-password'}
                                />
                            </div>
                            {isSetup && <p className={styles.byline}>{PASSWORD_HINT}</p>}
                        </div>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={authMutation.isPending}
                        >
                            <div className={styles.buttonContent}>
                                {authMutation.isPending ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        {isSetup ? 'Creating account...' : 'Signing in...'}
                                    </>
                                ) : (
                                    isSetup ? 'Create super admin' : 'Sign In'
                                )}
                            </div>
                        </button>
                    </form>
                    <button type="button" className={styles.switchLink} onClick={switchMode}>
                        {isSetup ? 'Back to sign in' : 'First time here? Create the super admin account'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;
