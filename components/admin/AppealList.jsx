"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { appealAPI, handleError } from '@/lib/api.service';
import Icon from '@/components/Icon';
import Toast from '@/components/ui/Toast';

const renderCount = { current: 0 };

export default function AppealList() {
  const [appeals, setAppeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'resolved'

  // Track renders for debugging
  const mountTime = useRef(Date.now());
  renderCount.current += 1;
  console.log(`[AppealList] Render #${renderCount.current} (mounted ${Math.round((Date.now() - mountTime.current) / 1000)}s ago)`);

  const showToast = useCallback((message, type) => {
    setToast({ message, type, show: true });
  }, []);

  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  useEffect(() => {
    let mounted = true;
    console.time('fetchAppeals');

    const fetchAppeals = async () => {
      setIsLoading(true);
      try {
        const response = await appealAPI.getAppeals();
        if (!mounted) return;
        console.timeEnd('fetchAppeals');
        console.log(`[AppealList] Fetched ${response.data?.appeals?.length || 0} appeals`);
        if (response.success) {
          setAppeals(response.data.appeals || []);
        } else {
          showToast(response.message || 'Failed to fetch queries', 'error');
        }
      } catch (error) {
        if (!mounted) return;
        console.timeEnd('fetchAppeals');
        handleError(error, showToast);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchAppeals();

    return () => {
      mounted = false;
      console.log('[AppealList] Cleanup - marking unmounted');
    };
  }, []);

  // Filter appeals by date range (memoized)
  const filterByDateRange = useCallback((appealsList) => {
    if (!dateFrom && !dateTo) return appealsList;

    return appealsList.filter(appeal => {
      const appealDate = new Date(appeal.createdAt || appeal.submittedAt);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

      if (from && appealDate < from) return false;
      if (to && appealDate > to) return false;
      return true;
    });
  }, [dateFrom, dateTo]);

  // Separate pending and resolved appeals with sorting (memoized)
  const pendingAppeals = useMemo(() =>
    filterByDateRange(
      appeals.filter(a => a.status === 'pending')
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [appeals, filterByDateRange]
  );

  const resolvedAppeals = useMemo(() =>
    filterByDateRange(
      appeals.filter(a => a.status !== 'pending')
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [appeals, filterByDateRange]
  );

  const getStatusBadge = useCallback((status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'badge-warning';
      case 'approved':
        return 'badge-success';
      case 'rejected':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }, []);

  const handleExportAppeals = useCallback(() => {
    const appealsToExport = activeTab === 'pending' ? pendingAppeals : resolvedAppeals;

    // Generate CSV
    const headers = ['Query ID', 'Employee ID', 'Company', 'Status', 'Date Submitted'];
    let csvContent = headers.join(',') + '\n';

    appealsToExport.forEach(appeal => {
      const row = [
        appeal.appealId || appeal.id,
        appeal.employeeId,
        appeal.verifierInfo?.companyName || 'N/A',
        appeal.status,
        new Date(appeal.createdAt || appeal.submittedAt).toLocaleDateString('en-GB')
      ];
      csvContent += row.map(v => `"${v}"`).join(',') + '\n';
    });

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Queries_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Queries exported successfully!', 'success');
  }, [activeTab, pendingAppeals, resolvedAppeals, showToast]);

  const renderAppealCard = (appeal) => (
    <div key={appeal.appealId || appeal.id} className="card bg-base-100 shadow-sm p-4 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-mono text-sm">{appeal.appealId || appeal.id}</p>
          <p className="text-sm font-medium">Employee: {appeal.employeeId}</p>
          <p className="text-xs text-base-content/70">
            {appeal.verifierInfo ? appeal.verifierInfo.companyName : 'N/A'}
          </p>
        </div>
        <span className={`badge ${getStatusBadge(appeal.status)} capitalize`}>
          {appeal.status}
        </span>
      </div>
      <div className="mt-2 text-xs text-base-content/50">
        {new Date(appeal.createdAt || appeal.submittedAt).toLocaleDateString('en-GB')}
      </div>
      <div className="mt-3 text-right">
        <Link href={`/admin/appeals/${appeal.appealId || appeal.id}`} className="btn btn-sm btn-outline btn-primary">
          View
          <Icon name="ArrowRight" className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );

  const renderAppealTable = (appealsList, emptyMessage) => {
    if (appealsList.length === 0) {
      return (
        <div className="text-center py-12 px-6 bg-base-200 rounded-lg">
          <Icon name="Inbox" className="w-12 h-12 mx-auto text-base-content/30" />
          <h3 className="mt-4 text-lg font-semibold text-base-content">{emptyMessage}</h3>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr className="bg-base-200">
              <th className="p-4">Query ID</th>
              <th>Employee ID</th>
              <th>Verifying Company</th>
              <th>Date Submitted</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {appealsList.map((appeal) => (
              <tr key={appeal.appealId || appeal.id} className="hover">
                <td className="p-4 font-mono text-xs">
                  {(appeal.appealId || appeal.id).substring(0, 8)}...
                </td>
                <td>{appeal.employeeId}</td>
                <td className="text-sm">
                  {appeal.verifierInfo ? appeal.verifierInfo.companyName : 'N/A'}
                </td>
                <td>{new Date(appeal.createdAt || appeal.submittedAt).toLocaleDateString('en-GB')}</td>
                <td>
                  <span className={`badge ${getStatusBadge(appeal.status)} capitalize`}>
                    {appeal.status}
                  </span>
                </td>
                <td className="text-right">
                  <Link href={`/admin/appeals/${appeal.appealId || appeal.id}`} className="btn btn-sm btn-outline btn-primary">
                    View
                    <Icon name="ArrowRight" className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <>
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      {/* Date Range Filter */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6 p-4 bg-base-200 rounded-lg">
        <div className="form-control w-full sm:w-auto">
          <label className="label">
            <span className="label-text text-sm font-medium">From Date</span>
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input input-bordered w-full"
          />
        </div>
        <div className="form-control w-full sm:w-auto">
          <label className="label">
            <span className="label-text text-sm font-medium">To Date</span>
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input input-bordered w-full"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="btn btn-ghost btn-sm"
          >
            <Icon name="X" className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
            <span className="sm:hidden">Clear</span>
          </button>
          <button
            onClick={handleExportAppeals}
            className="btn btn-outline btn-sm gap-2"
          >
            <Icon name="Download" className="w-4 h-4" />
            <span className="hidden sm:inline">Export {activeTab === 'pending' ? 'Pending' : 'Resolved'}</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Tabs for Pending and Resolved */}
      <div className="tabs tabs-boxed mb-6 overflow-x-auto whitespace-nowrap">
        <button
          className={`tab gap-2 ${activeTab === 'pending' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <Icon name="Clock" className="w-4 h-4" />
          <span className="hidden sm:inline">Pending Queries</span>
          <span className="sm:hidden">Pending</span>
          <span className="badge badge-warning badge-sm">{pendingAppeals.length}</span>
        </button>
        <button
          className={`tab gap-2 ${activeTab === 'resolved' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('resolved')}
        >
          <Icon name="CheckCircle" className="w-4 h-4" />
          <span className="hidden sm:inline">Resolved Queries</span>
          <span className="sm:hidden">Resolved</span>
          <span className="badge badge-success badge-sm">{resolvedAppeals.length}</span>
        </button>
      </div>

      {/* Appeal Cards for mobile, Table for desktop */}
      <div className="block sm:hidden">
        {activeTab === 'pending' 
          ? pendingAppeals.map(appeal => renderAppealCard(appeal))
          : resolvedAppeals.map(appeal => renderAppealCard(appeal))
        }
      </div>
      <div className="hidden sm:block">
        {activeTab === 'pending' ? (
          renderAppealTable(pendingAppeals, 'No pending queries found')
        ) : (
          renderAppealTable(resolvedAppeals, 'No resolved queries found')
        )}
      </div>
    </>
  );
}