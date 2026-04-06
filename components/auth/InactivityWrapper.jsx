"use client";

import React from 'react';
import { useInactivityTimeout } from '@/lib/hooks/useInactivityTimeout';
import SessionTimeoutWarning from '@/components/auth/SessionTimeoutWarning';

/**
 * Wrapper component that handles session inactivity timeout
 * Renders the warning modal and manages session expiration
 */
const InactivityWrapper = ({ children }) => {
    const {
        showWarning,
        timeRemaining,
        isLoggedIn,
        logout,
        extendSession
    } = useInactivityTimeout();

    return (
        <>
            {children}
            {isLoggedIn && (
                <SessionTimeoutWarning
                    isOpen={showWarning}
                    timeRemaining={timeRemaining}
                    onExtendSession={extendSession}
                    onLogout={logout}
                />
            )}
        </>
    );
};

export default InactivityWrapper;
