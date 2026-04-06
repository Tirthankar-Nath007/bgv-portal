"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Configuration constants
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds
const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before timeout
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

const LAST_ACTIVITY_KEY = 'lastActivityTime';
const VERIFIER_SESSION_KEY = 'verifier_session';
const ADMIN_SESSION_KEY = 'admin_session';

/**
 * Custom hook to handle user session inactivity timeout
 * Monitors user activity and automatically logs out after 1 hour of inactivity
 * Shows a warning 5 minutes before timeout
 */
export function useInactivityTimeout() {
    const [showWarning, setShowWarning] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(WARNING_THRESHOLD);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const router = useRouter();
    const checkIntervalRef = useRef(null);
    const countdownIntervalRef = useRef(null);

    // Check if user is logged in
    const checkLoginStatus = useCallback(() => {
        if (typeof window === 'undefined') return false;
        const verifierSession = localStorage.getItem(VERIFIER_SESSION_KEY);
        const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);
        return !!(verifierSession || adminSession);
    }, []);

    // Update last activity timestamp
    const updateActivity = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (!checkLoginStatus()) return;

        const now = Date.now();
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());

        // Reset warning state if activity detected while warning is shown
        if (showWarning) {
            setShowWarning(false);
            setTimeRemaining(WARNING_THRESHOLD);
        }
    }, [checkLoginStatus, showWarning]);

    // Clear all session data and logout
    const logout = useCallback(() => {
        if (typeof window === 'undefined') return;

        // Clear sessions
        localStorage.removeItem(VERIFIER_SESSION_KEY);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);

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
        window.dispatchEvent(new Event('local-storage-changed'));

        setShowWarning(false);
        setIsLoggedIn(false);

        // Redirect to home page
        router.push('/');
    }, [router]);

    // Extend session (called when user clicks "Stay Logged In")
    const extendSession = useCallback(() => {
        updateActivity();
        setShowWarning(false);
        setTimeRemaining(WARNING_THRESHOLD);
    }, [updateActivity]);

    // Check for inactivity timeout
    const checkInactivity = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (!checkLoginStatus()) {
            setIsLoggedIn(false);
            return;
        }

        setIsLoggedIn(true);

        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (!lastActivity) {
            // Initialize if not set
            updateActivity();
            return;
        }

        const now = Date.now();
        const lastActivityTime = parseInt(lastActivity, 10);
        const elapsedTime = now - lastActivityTime;
        const remainingTime = INACTIVITY_TIMEOUT - elapsedTime;

        if (remainingTime <= 0) {
            // Session expired - logout immediately
            logout();
        } else if (remainingTime <= WARNING_THRESHOLD) {
            // Show warning
            setShowWarning(true);
            setTimeRemaining(remainingTime);
        } else {
            // Normal state - no warning needed
            setShowWarning(false);
            setTimeRemaining(WARNING_THRESHOLD);
        }
    }, [checkLoginStatus, updateActivity, logout]);

    // Set up activity event listeners
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Activity events to track
        const activityEvents = [
            'mousedown',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart',
            'click',
            'wheel'
        ];

        // Throttle activity updates to prevent excessive localStorage writes
        let lastUpdate = 0;
        const throttledUpdate = () => {
            const now = Date.now();
            if (now - lastUpdate > 5000) { // Update at most every 5 seconds
                lastUpdate = now;
                updateActivity();
            }
        };

        // Add event listeners
        activityEvents.forEach(event => {
            window.addEventListener(event, throttledUpdate, { passive: true });
        });

        // Handle storage changes from other tabs
        const handleStorageChange = (e) => {
            if (e.key === LAST_ACTIVITY_KEY) {
                // Activity detected in another tab - reset warning
                if (showWarning) {
                    setShowWarning(false);
                    setTimeRemaining(WARNING_THRESHOLD);
                }
            } else if (e.key === VERIFIER_SESSION_KEY || e.key === ADMIN_SESSION_KEY) {
                // Session changed in another tab
                checkInactivity();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Initialize activity time if logged in
        if (checkLoginStatus()) {
            const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
            if (!lastActivity) {
                updateActivity();
            }
        }

        // Cleanup
        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, throttledUpdate);
            });
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [updateActivity, checkLoginStatus, checkInactivity, showWarning]);

    // Set up inactivity check interval
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Initial check
        checkInactivity();

        // Set up periodic check
        checkIntervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL);

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, [checkInactivity]);

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
        extendSession,
        updateActivity
    };
}

/**
 * Initialize activity tracking - call this after successful login
 */
export function initializeActivityTracking() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export default useInactivityTimeout;
