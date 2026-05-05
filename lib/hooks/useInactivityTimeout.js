"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Configuration constants
const VERIFIER_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before timeout
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

const VERIFIER_SESSION_KEY = 'verifier_session';
const ADMIN_SESSION_KEY = 'admin_session';

/**
 * Custom hook to handle verifier session timeout
 * Verifiers are logged out after exactly 10 minutes from login
 * Shows a warning 5 minutes before timeout
 * Admins use JWT expiry (7 days) - no client-side timeout
 */
export function useInactivityTimeout() {
    const [showWarning, setShowWarning] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(WARNING_THRESHOLD);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const router = useRouter();
    const checkIntervalRef = useRef(null);
    const countdownIntervalRef = useRef(null);

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

    // Check if user is logged in and get session info
    const checkLoginStatus = useCallback(() => {
        if (typeof window === 'undefined') return { isLoggedIn: false, isVerifier: false };

        const verifierSession = localStorage.getItem(VERIFIER_SESSION_KEY);
        const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);

        if (verifierSession) {
            try {
                const session = JSON.parse(verifierSession);
                const payload = decodeJWT(session.token);

                if (payload && payload.exp) {
                    const currentTime = Date.now() / 1000;
                    if (payload.exp < currentTime) {
                        // Token expired - return not logged in
                        return { isLoggedIn: false, isVerifier: true, session: null };
                    }
                }

                return { isLoggedIn: true, isVerifier: true, session };
            } catch (e) {
                return { isLoggedIn: false, isVerifier: false, session: null };
            }
        }

        if (adminSession) {
            // Admin - just check if session exists (JWT validated server-side)
            return { isLoggedIn: true, isVerifier: false, session: null };
        }

        return { isLoggedIn: false, isVerifier: false, session: null };
    }, []);

    // Clear all session data and logout
    const logout = useCallback(() => {
        if (typeof window === 'undefined') return;

        // Check which session exists BEFORE removing
        const hasVerifierSession = !!localStorage.getItem(VERIFIER_SESSION_KEY);
        const hasAdminSession = !!localStorage.getItem(ADMIN_SESSION_KEY);

        console.log('[Logout] Logging out. Verifier:', hasVerifierSession, 'Admin:', hasAdminSession);

        // Clear sessions
        localStorage.removeItem(VERIFIER_SESSION_KEY);
        localStorage.removeItem(ADMIN_SESSION_KEY);

        // Clear intervals
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        // Notify other components
        window.dispatchEvent(new Event('localStorage-changed'));

        setShowWarning(false);
        setIsLoggedIn(false);

        // Use window.location for reliable redirect
        if (hasVerifierSession) {
            console.log('[Logout] Redirecting verifier to /login');
            window.location.href = '/login';
        } else if (hasAdminSession) {
            console.log('[Logout] Redirecting admin to /admin/login');
            window.location.href = '/admin/login';
        } else {
            console.log('[Logout] No session found, redirecting to /login (fallback)');
            window.location.href = '/login';
        }
    }, [router]);

    // Extend session (called when user clicks "Stay Logged In")
    const extendSession = useCallback(() => {
        const verifierSession = localStorage.getItem(VERIFIER_SESSION_KEY);
        if (verifierSession) {
            try {
                const session = JSON.parse(verifierSession);
                session.loginTime = Date.now();
                localStorage.setItem(VERIFIER_SESSION_KEY, JSON.stringify(session));
                setShowWarning(false);
                setTimeRemaining(WARNING_THRESHOLD);
            } catch (e) {
                console.error('Failed to extend session:', e);
            }
        }
    }, []);

    // Check for session timeout (verifier only)
    const checkTimeout = useCallback(() => {
        if (typeof window === 'undefined') return;

        const { isLoggedIn: loggedIn, isVerifier, session } = checkLoginStatus();

        if (!loggedIn) {
            setIsLoggedIn(false);
            // If it was a verifier session that expired, trigger logout for redirect
            if (isVerifier) {
                logout();
            }
            return;
        }

        setIsLoggedIn(true);

        // Only apply timeout for verifiers
        if (!isVerifier) {
            setShowWarning(false);
            return;
        }

        // Calculate time remaining for verifier
        const loginTime = session?.loginTime || Date.now();
        const elapsed = Date.now() - loginTime;
        const remaining = VERIFIER_TIMEOUT - elapsed;

        if (remaining <= 0) {
            // Session expired - logout immediately
            logout();
        } else if (remaining <= WARNING_THRESHOLD) {
            // Show warning
            setShowWarning(true);
            setTimeRemaining(remaining);
        } else {
            // Normal state - no warning needed
            setShowWarning(false);
            setTimeRemaining(WARNING_THRESHOLD);
        }
    }, [checkLoginStatus, logout]);

    // Set up activity event listeners (no longer used for timeout, just for UI)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // We don't track activity for timeout anymore
        // But we keep the hook structure for potential future use

        return () => {
            // Cleanup if needed
        };
    }, []);

    // Set up timeout check interval
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

    // Countdown timer when warning is shown
    useEffect(() => {
        if (!showWarning) {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
            return;
        }

        countdownIntervalRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                const newTime = prev - 1000;
                if (newTime <= 0) {
                    logout();
                    return 0;
                }
                return newTime;
            });
        }, 1000);

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [showWarning, logout]);

    return {
        showWarning,
        timeRemaining,
        isLoggedIn,
        logout,
        extendSession
    };
}

/**
 * Initialize activity tracking - call this after successful login
 * Note: This is now handled directly in the login forms
 */
export function initializeActivityTracking() {
    if (typeof window === 'undefined') return;
    // Login time is now stored in the session data itself in the login forms
    // This function kept for backward compatibility
}

export default useInactivityTimeout;
