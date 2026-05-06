"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Configuration
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

const VERIFIER_SESSION_KEY = 'verifier_session';
const ADMIN_SESSION_KEY = 'admin_session';

/**
 * Custom hook to handle session expiry based on JWT token
 * Checks JWT exp claim periodically and redirects when expired
 * No activity tracking - tokens expire after set time regardless of activity
 */
export function useSessionChecker() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const router = useRouter();
    const checkIntervalRef = useRef(null);

    // Decode JWT payload without verification (client-side safe)
    const decodeJWT = (token) => {
        try {
            const base64Payload = token.split('.')[1];
            const payload = JSON.parse(atob(base64Payload));
            return payload;
        } catch (e) {
            return null;
        }
    };

    // Check if user is logged in by verifying JWT expiry
    const checkLoginStatus = useCallback(() => {
        if (typeof window === 'undefined') return { isLoggedIn: false };

        const verifierSession = localStorage.getItem(VERIFIER_SESSION_KEY);
        const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);

        if (verifierSession) {
            try {
                const session = JSON.parse(verifierSession);
                if (session.token) {
                    const payload = decodeJWT(session.token);
                    if (payload && payload.exp) {
                        const currentTime = Date.now() / 1000;
                        if (payload.exp < currentTime) {
                            // Token expired
                            localStorage.removeItem(VERIFIER_SESSION_KEY);
                            window.dispatchEvent(new Event('localStorage-changed'));
                            return { isLoggedIn: false, type: 'verifier' };
                        }
                        return { isLoggedIn: true, type: 'verifier' };
                    }
                }
            } catch (e) {
                localStorage.removeItem(VERIFIER_SESSION_KEY);
                return { isLoggedIn: false, type: 'verifier' };
            }
        }

        if (adminSession) {
            try {
                const session = JSON.parse(adminSession);
                if (session.token) {
                    const payload = decodeJWT(session.token);
                    if (payload && payload.exp) {
                        const currentTime = Date.now() / 1000;
                        if (payload.exp < currentTime) {
                            // Token expired
                            localStorage.removeItem(ADMIN_SESSION_KEY);
                            window.dispatchEvent(new Event('localStorage-changed'));
                            return { isLoggedIn: false, type: 'admin' };
                        }
                        return { isLoggedIn: true, type: 'admin' };
                    }
                }
            } catch (e) {
                localStorage.removeItem(ADMIN_SESSION_KEY);
                return { isLoggedIn: false, type: 'admin' };
            }
        }

        return { isLoggedIn: false, type: null };
    }, []);

    // Logout and redirect to appropriate login page
    const logout = useCallback(() => {
        if (typeof window === 'undefined') return;

        const verifierSession = localStorage.getItem(VERIFIER_SESSION_KEY);
        const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);

        localStorage.removeItem(VERIFIER_SESSION_KEY);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        window.dispatchEvent(new Event('localStorage-changed'));

        if (verifierSession) {
            window.location.href = '/login';
        } else {
            window.location.href = '/admin/login';
        }
    }, []);

    // Check for session timeout
    const checkTimeout = useCallback(() => {
        if (typeof window === 'undefined') return;

        const { isLoggedIn: loggedIn } = checkLoginStatus();

        if (!loggedIn) {
            setIsLoggedIn(false);
            // Redirect will be handled by the layout or component
        } else {
            setIsLoggedIn(true);
        }
    }, [checkLoginStatus]);

    // Set up periodic JWT expiry check
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Initial check
        checkTimeout();

        // Set up periodic check
        checkIntervalRef.current = setInterval(checkTimeout, CHECK_INTERVAL);

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, [checkTimeout]);

    return {
        isLoggedIn,
        logout
    };
}

// Keep old export name for backward compatibility
export default useSessionChecker;
