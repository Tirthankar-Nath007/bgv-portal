"use client";

import React from 'react';
import Icon from '@/components/Icon';

/**
 * Session Timeout Warning Modal
 * Displays when user session is about to expire due to inactivity
 * Allows user to extend session or logout
 */
const SessionTimeoutWarning = ({
    isOpen,
    timeRemaining,
    onExtendSession,
    onLogout
}) => {
    if (!isOpen) return null;

    // Format remaining time as MM:SS
    const formatTime = (ms) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                className="card bg-base-100 shadow-2xl max-w-md w-full mx-4 animate-pulse-slow"
                style={{
                    animation: 'none',
                    border: '2px solid #FFA500'
                }}
            >
                <div className="card-body p-6">
                    {/* Warning Icon */}
                    <div className="flex justify-center mb-4">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#FFF3E0' }}
                        >
                            <Icon
                                name="Clock"
                                className="w-8 h-8"
                                style={{ color: '#FF9800' }}
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <h2
                        className="text-2xl font-bold text-center mb-2"
                        style={{
                            fontFamily: "'Montserrat', sans-serif",
                            color: '#333'
                        }}
                    >
                        Session Expiring Soon
                    </h2>

                    {/* Description */}
                    <p
                        className="text-center mb-4"
                        style={{
                            fontFamily: "'Lato', sans-serif",
                            color: '#666'
                        }}
                    >
                        Your session will expire due to inactivity. Would you like to stay logged in?
                    </p>

                    {/* Countdown Timer */}
                    <div
                        className="text-center py-4 px-6 rounded-lg mb-6"
                        style={{ backgroundColor: '#FFF3E0' }}
                    >
                        <p
                            className="text-sm mb-1"
                            style={{ color: '#666' }}
                        >
                            Time remaining
                        </p>
                        <p
                            className="text-4xl font-bold"
                            style={{
                                fontFamily: "'Montserrat', sans-serif",
                                color: '#FF5722'
                            }}
                        >
                            {formatTime(timeRemaining)}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={onExtendSession}
                            className="btn flex-1"
                            style={{
                                backgroundColor: '#007A3D',
                                borderColor: '#007A3D',
                                color: 'white',
                                fontFamily: "'Montserrat', sans-serif"
                            }}
                        >
                            <Icon name="RefreshCw" className="w-4 h-4 mr-2" />
                            Stay Logged In
                        </button>
                        <button
                            onClick={onLogout}
                            className="btn btn-outline flex-1"
                            style={{
                                borderColor: '#DC2626',
                                color: '#DC2626',
                                fontFamily: "'Montserrat', sans-serif"
                            }}
                        >
                            <Icon name="LogOut" className="w-4 h-4 mr-2" />
                            Logout
                        </button>
                    </div>

                    {/* Info Text */}
                    <p
                        className="text-xs text-center mt-4"
                        style={{ color: '#999' }}
                    >
                        For security, sessions automatically expire after 1 hour of inactivity.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SessionTimeoutWarning;
