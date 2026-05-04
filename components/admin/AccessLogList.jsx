"use client";

import React, { useState, useEffect } from "react";
import Icon from "@/components/Icon";

/**
 * AccessLogList Component
 * Displays system access logs with filtering and pagination
 */
const AccessLogList = () => {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState({ status: 'ALL', role: 'ALL' });
    const [error, setError] = useState(null);

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const sessionData = localStorage.getItem('admin_session');
            const session = sessionData ? JSON.parse(sessionData) : null;

            if (!session?.token) {
                setError('Session expired. Please login again.');
                return;
            }

            const queryParams = new URLSearchParams({
                page,
                limit: pagination.limit,
                ...(filter.status !== 'ALL' && { status: filter.status }),
                ...(filter.role !== 'ALL' && { role: filter.role })
            });

            const response = await fetch(`/api/admin/logs?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${session.token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setLogs(data.data.logs);
                setPagination(data.data.pagination);
            } else {
                setError(data.message || 'Failed to fetch logs');
            }
        } catch (err) {
            console.error('Error fetching logs:', err);
            setError('An error occurred while fetching logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(1);
    }, [filter]); // Re-fetch when filters change

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            fetchLogs(newPage);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilter(prev => ({ ...prev, [key]: value }));
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const formatIP = (ip) => {
        if (!ip) return '-';
        if (ip === '::1') return 'Localhost';
        if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
        return ip;
    };

    const formatUserAgent = (ua) => {
        if (!ua) return '-';

        // OS detection - more complete
        let os = 'Unknown OS';
        if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
        else if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac OS X')) os = 'macOS';
        else if (ua.includes('Mac')) os = 'Mac';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iPhone')) os = 'iPhone';
        else if (ua.includes('iPad')) os = 'iPad';

        // Browser detection - order matters, check more specific first
        let browser = 'Unknown Browser';
        if (ua.includes('Edg/')) browser = 'Edge';
        else if (ua.includes('Firefox/')) browser = 'Firefox';
        else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
        else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
        else if (ua.includes('curl/')) browser = 'cURL';
        else if (ua.includes('Postman/')) browser = 'Postman';

        return `${browser} on ${os}`;
    };

    const renderLogCard = (log) => (
    <div key={log._id} className="card bg-base-100 shadow-sm p-4 mb-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="font-mono text-xs">{formatDate(log.timestamp)}</p>
          <p className="font-medium text-sm">{log.email}</p>
          <div className="flex gap-2 mt-1">
            <span className={`badge badge-sm ${log.role === 'admin' ? 'badge-primary' : log.role === 'verifier' ? 'badge-info' : 'badge-ghost'}`}>
              {log.role}
            </span>
            <span className={`badge badge-sm ${log.status === 'SUCCESS' ? 'badge-success text-white' : 'badge-error text-white'}`}>
              {log.status === 'SUCCESS' ? <Icon name="Check" className="w-3 h-3 mr-1" /> : <Icon name="X" className="w-3 h-3 mr-1" />}
              {log.status}
            </span>
            <span className="badge badge-sm badge-outline">
              {log.action}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-base-content/70">
        IP: {formatIP(log.ipAddress)} | {formatUserAgent(log.userAgent)}
      </div>
      {log.failureReason && (
        <div className="mt-2 text-xs text-error">{log.failureReason}</div>
      )}
      {log.metadata && (
        <details className="mt-2">
          <summary className="cursor-pointer text-primary text-xs">View Metadata</summary>
          <pre className="text-xs bg-base-200 p-2 rounded mt-1 whitespace-pre-wrap">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );

  return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-between bg-base-100 p-4 rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <select
                        className="select select-bordered select-sm w-full sm:w-auto"
                        value={filter.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="SUCCESS">Success</option>
                        <option value="FAILURE">Failure</option>
                    </select>

                    <select
                        className="select select-bordered select-sm w-full sm:w-auto"
                        value={filter.role}
                        onChange={(e) => handleFilterChange('role', e.target.value)}
                    >
                        <option value="ALL">All Roles</option>
                        <option value="verifier">Verifier</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <button
                    onClick={() => fetchLogs(pagination.page)}
                    className="btn btn-sm btn-ghost self-end sm:self-auto"
                    disabled={loading}
                >
                    <Icon name="RefreshCw" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="alert alert-error">
                    <Icon name="AlertTriangle" className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Logs Cards for mobile, Table for desktop */}
            <div className="block sm:hidden space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  No logs found matching your criteria
                </div>
              ) : (
                logs.map(log => renderLogCard(log))
              )}
            </div>
            <div className="hidden sm:block overflow-x-auto bg-base-100 rounded-lg shadow">
                <table className="table w-full">
                    <thead className="bg-base-200">
                        <tr>
                            <th>Timestamp</th>
                            <th>User (Email)</th>
                            <th>Role</th>
                            <th>Action</th>
                            <th>Status</th>
                            <th>IP Address</th>
                            <th>Browser / OS</th>
                            <th>Failure Reason</th>
                            <th>Metadata</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="9" className="text-center py-8">
                                    <span className="loading loading-spinner loading-md"></span>
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="text-center py-8 text-base-content/60">
                                    No logs found matching your criteria
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log._id} className="hover">
                                    <td className="text-xs font-mono whitespace-nowrap">
                                        {formatDate(log.timestamp)}
                                    </td>
                                    <td>
                                        <div className="font-medium">{log.email}</div>
                                    </td>
                                    <td>
                                        <span className={`badge badge-sm ${log.role === 'admin' ? 'badge-primary' : log.role === 'verifier' ? 'badge-info' : 'badge-ghost'}`}>
                                            {log.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge badge-sm badge-outline">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge badge-sm ${log.status === 'SUCCESS' ? 'badge-success text-white' : 'badge-error text-white'}`}>
                                            {log.status === 'SUCCESS' ? <Icon name="Check" className="w-3 h-3 mr-1" /> : <Icon name="X" className="w-3 h-3 mr-1" />}
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="font-mono text-xs">
                                        {formatIP(log.ipAddress)}
                                    </td>
                                    <td className="text-xs">
                                        {log.status === 'FAILURE' ? (
                                            <span className="text-error">{log.failureReason || '-'}</span>
                                        ) : (
                                            <span className="text-base-content/70" title={log.userAgent}>
                                                {formatUserAgent(log.userAgent)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-xs max-w-xs">
                                        {log.failureReason ? (
                                            <span className="text-error text-wrap">{log.failureReason}</span>
                                        ) : '-'}
                                    </td>
                                    <td className="text-xs max-w-xs">
                                        {log.metadata ? (
                                            <details>
                                                <summary className="cursor-pointer text-primary">View</summary>
                                                <pre className="text-xs bg-base-200 p-2 rounded mt-1 whitespace-pre-wrap">
                                                    {JSON.stringify(log.metadata, null, 2)}
                                                </pre>
                                            </details>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-4">
                <div className="join">
                    <button
                        className="join-item btn btn-sm"
                        disabled={pagination.page <= 1 || loading}
                        onClick={() => handlePageChange(pagination.page - 1)}
                    >
                        «
                    </button>
                    <button className="join-item btn btn-sm no-animation bg-base-100">
                        Page {pagination.page} of {pagination.pages || 1}
                    </button>
                    <button
                        className="join-item btn btn-sm"
                        disabled={pagination.page >= pagination.pages || loading}
                        onClick={() => handlePageChange(pagination.page + 1)}
                    >
                        »
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccessLogList;
