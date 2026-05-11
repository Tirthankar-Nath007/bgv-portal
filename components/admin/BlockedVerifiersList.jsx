"use client";

import React, { useState, useEffect, useRef } from "react";
import Icon from "@/components/Icon";
import Toast from "@/components/ui/Toast";

const BlockedVerifiersList = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unblockingId, setUnblockingId] = useState(null);
    const [confirmRecord, setConfirmRecord] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const mounted = useRef(true);

    const showToast = (message, type) => {
        setToast({ message, type, show: true });
    };

    const closeToast = () => {
        setToast({ ...toast, show: false });
    };

    const fetchRecords = async () => {
        setLoading(true);
        setError(null);
        try {
            const sessionData = localStorage.getItem('admin_session');
            const session = sessionData ? JSON.parse(sessionData) : null;
            if (!session?.token) {
                setError('Session expired. Please login again.');
                return;
            }
            const response = await fetch('/api/admin/blocked-verifiers', {
                headers: { 'Authorization': `Bearer ${session.token}` }
            });
            const data = await response.json();
            if (data.success && mounted.current) {
                setRecords(data.data.records);
            } else if (mounted.current) {
                setError(data.message || 'Failed to fetch records');
            }
        } catch (err) {
            console.error('Error fetching blocked verifiers:', err);
            if (mounted.current) setError('An error occurred while fetching records');
        } finally {
            if (mounted.current) setLoading(false);
        }
    };

    useEffect(() => {
        mounted.current = true;
        fetchRecords();
        return () => { mounted.current = false; };
    }, []);

    const handleUnblock = async () => {
        if (!confirmRecord) return;
        const { verifierId, employeeId } = confirmRecord;
        const key = `${verifierId}-${employeeId}`;
        setUnblockingId(key);
        setConfirmRecord(null);
        try {
            const sessionData = localStorage.getItem('admin_session');
            const session = sessionData ? JSON.parse(sessionData) : null;
            const response = await fetch('/api/admin/blocked-verifiers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.token}`
                },
                body: JSON.stringify({ verifierId, employeeId })
            });
            const data = await response.json();
            if (data.success) {
                showToast('Verifier unblocked successfully', 'success');
                await fetchRecords();
            } else {
                showToast(data.message || 'Failed to unblock verifier', 'error');
            }
        } catch (err) {
            console.error('Error unblocking verifier:', err);
            showToast('An error occurred while unblocking', 'error');
        } finally {
            setUnblockingId(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    const formatAttempts = (count) => {
        if (count >= 3) {
            return <span className="font-semibold text-error">{count}</span>;
        }
        return <span>{count}</span>;
    };

    return (
        <div className="space-y-4">
            {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

            {error && (
                <div className="alert alert-error">
                    <Icon name="AlertTriangle" className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            <div className="hidden sm:block overflow-x-auto bg-base-100 rounded-lg shadow">
                <table className="table w-full">
                    <thead className="bg-base-200">
                        <tr>
                            <th>Verifier Company</th>
                            <th>Verifier Email</th>
                            <th>Employee ID</th>
                            <th>Employee Name</th>
                            <th>Attempts</th>
                            <th>Status</th>
                            <th>Blocked Since</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="8" className="text-center py-8">
                                    <span className="loading loading-spinner loading-md"></span>
                                </td>
                            </tr>
                        ) : records.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="text-center py-8 text-base-content/60">
                                    No blocked verifier records found
                                </td>
                            </tr>
                        ) : (
                            records.map((r) => {
                                const key = `${r.verifierId}-${r.employeeId}`;
                                return (
                                    <tr key={r.id || key} className="hover">
                                        <td className="font-medium">{r.verifierCompanyName || 'Unknown'}</td>
                                        <td className="text-sm">{r.verifierEmail || '-'}</td>
                                        <td className="font-mono text-sm">{r.employeeId}</td>
                                        <td className="text-sm">{r.employeeName || 'N/A'}</td>
                                        <td>{formatAttempts(r.attemptCount)}</td>
                                        <td>
                                            {r.isBlocked ? (
                                                <span className="badge badge-error text-white gap-1">
                                                    <Icon name="Lock" className="w-3 h-3" />
                                                    Blocked
                                                </span>
                                            ) : (
                                                <span className="badge badge-success text-white gap-1">
                                                    <Icon name="Unlock" className="w-3 h-3" />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-xs font-mono whitespace-nowrap">
                                            {formatDate(r.blockedAt)}
                                        </td>
                                        <td>
                                            {r.isBlocked ? (
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => setConfirmRecord(r)}
                                                    disabled={unblockingId === key}
                                                >
                                                    {unblockingId === key ? (
                                                        <span className="loading loading-spinner loading-xs"></span>
                                                    ) : (
                                                        <Icon name="Unlock" className="w-4 h-4" />
                                                    )}
                                                    Unblock
                                                </button>
                                            ) : (
                                                <span className="text-sm text-base-content/50">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="block sm:hidden space-y-4">
                {loading ? (
                    <div className="text-center py-8">
                        <span className="loading loading-spinner loading-md"></span>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-8 text-base-content/60">
                        No blocked verifier records found
                    </div>
                ) : (
                    records.map((r) => {
                        const key = `${r.verifierId}-${r.employeeId}`;
                        return (
                            <div key={r.id || key} className="card bg-base-100 shadow-sm p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-semibold">{r.verifierCompanyName || 'Unknown'}</p>
                                        <p className="text-xs text-base-content/60">{r.verifierEmail || '-'}</p>
                                    </div>
                                    {r.isBlocked ? (
                                        <span className="badge badge-error text-white gap-1">
                                            <Icon name="Lock" className="w-3 h-3" />
                                            Blocked
                                        </span>
                                    ) : (
                                        <span className="badge badge-success text-white gap-1">
                                            <Icon name="Unlock" className="w-3 h-3" />
                                            Active
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-base-content/50">Employee:</span>
                                        <span className="ml-1 font-mono">{r.employeeId}</span>
                                    </div>
                                    <div>
                                        <span className="text-base-content/50">Name:</span>
                                        <span className="ml-1">{r.employeeName || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-base-content/50">Attempts:</span>
                                        <span className="ml-1">{r.attemptCount}</span>
                                    </div>
                                    <div>
                                        <span className="text-base-content/50">Blocked:</span>
                                        <span className="ml-1 text-xs font-mono">{formatDate(r.blockedAt)}</span>
                                    </div>
                                </div>
                                {r.isBlocked && (
                                    <button
                                        className="btn btn-sm btn-primary mt-3 w-full"
                                        onClick={() => setConfirmRecord(r)}
                                        disabled={unblockingId === key}
                                    >
                                        {unblockingId === key ? (
                                            <span className="loading loading-spinner loading-xs"></span>
                                        ) : (
                                            <Icon name="Unlock" className="w-4 h-4" />
                                        )}
                                        Unblock
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {confirmRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="card bg-base-100 shadow-xl max-w-md w-full mx-4">
                        <div className="card-body">
                            <h3 className="card-title text-lg">
                                <Icon name="AlertTriangle" className="w-5 h-5 text-warning" />
                                Confirm Unblock
                            </h3>
                            <p className="text-sm text-base-content/70 mt-2">
                                Are you sure you want to unblock{' '}
                                <span className="font-semibold">{confirmRecord.verifierCompanyName || 'this verifier'}</span>
                                {' '}for employee{' '}
                                <span className="font-mono font-semibold">{confirmRecord.employeeId}</span>?
                            </p>
                            <p className="text-xs text-base-content/50">
                                This will reset their attempt count to 0 and remove the block.
                            </p>
                            <div className="card-actions justify-end mt-4">
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => setConfirmRecord(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleUnblock}
                                >
                                    <Icon name="Unlock" className="w-4 h-4" />
                                    Unblock
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlockedVerifiersList;
