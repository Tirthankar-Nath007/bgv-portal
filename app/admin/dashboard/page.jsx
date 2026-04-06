"use client";

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import AppealList from '@/components/admin/AppealList';
import AccessLogList from '@/components/admin/AccessLogList';
import ExcelExportButton from '@/components/admin/ExcelExportButton';
import Icon from '@/components/Icon';
import Toast from '@/components/ui/Toast';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appeals');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type) => {
    setToast({ message, type, show: true });
  };

  const closeToast = () => {
    setToast({ ...toast, show: false });
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);

        // Get token from admin session
        const sessionData = localStorage.getItem('admin_session');
        const session = sessionData ? JSON.parse(sessionData) : null;

        if (!session?.token) {
          showToast('Please log in again', 'error');
          return;
        }

        // Fetch dashboard stats from API
        const response = await fetch('/api/admin/dashboard', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`
          }
        });

        const data = await response.json();

        if (data.success && data.data?.summary) {
          setStats(data.data.summary);
        } else {
          showToast(data.message || 'Failed to load dashboard data', 'error');
        }
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <>
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      <motion.div
        className="w-full max-w-6xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-base-content tracking-tight flex items-center gap-3">
              <Icon name="LayoutDashboard" className="w-9 h-9 text-primary" />
              Admin Dashboard
            </h1>
            <p className="mt-2 text-lg text-base-content/70">
              Review and manage employee verification queries.
            </p>
          </div>
          <ExcelExportButton />
        </div>

        {/* Statistics Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card bg-base-100 shadow-md">
                <div className="card-body p-6">
                  <div className="loading loading-spinner loading-sm"></div>
                </div>
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card bg-base-100 shadow-md border-l-4 border-primary">
              <div className="card-body p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/60">Total Verifications</p>
                    <p className="text-2xl font-bold text-primary">{stats.totalVerifications}</p>
                  </div>
                  <Icon name="FileCheck2" className="w-8 h-8 text-primary/20" />
                </div>
                <p className="text-xs text-base-content/50 mt-2">Last 30 days: {stats.recentVerifications}</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md border-l-4 border-warning">
              <div className="card-body p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/60">Pending Queries</p>
                    <p className="text-2xl font-bold text-warning">{stats.pendingAppeals}</p>
                  </div>
                  <Icon name="FileWarning" className="w-8 h-8 text-warning/20" />
                </div>
                <p className="text-xs text-base-content/50 mt-2">Total: {stats.totalAppeals}</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md border-l-4 border-success">
              <div className="card-body p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/60">Active Verifiers</p>
                    <p className="text-2xl font-bold text-success">{stats.activeVerifiers}</p>
                  </div>
                  <Icon name="Users" className="w-8 h-8 text-success/20" />
                </div>
                <p className="text-xs text-base-content/50 mt-2">Total: {stats.totalVerifiers}</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md border-l-4 border-info">
              <div className="card-body p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/60">Employees</p>
                    <p className="text-2xl font-bold text-info">{stats.totalEmployees}</p>
                  </div>
                  <Icon name="Database" className="w-8 h-8 text-info/20" />
                </div>
                <p className="text-xs text-base-content/50 mt-2">In records</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Tabs and Content */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-0">
            <div role="tablist" className="tabs tabs-bordered tabs-lg w-full">
              <a
                role="tab"
                className={`tab h-14 ${activeTab === 'appeals' ? 'tab-active font-bold' : ''}`}
                onClick={() => setActiveTab('appeals')}
              >
                Query Management
                {stats && stats.pendingAppeals > 0 && (
                  <span className="badge badge-warning badge-sm ml-2">
                    {stats.pendingAppeals}
                  </span>
                )}
              </a>
              <a
                role="tab"
                className={`tab h-14 ${activeTab === 'logs' ? 'tab-active font-bold' : ''}`}
                onClick={() => setActiveTab('logs')}
              >
                Access Logs
              </a>
            </div>

            <div className="p-6">
              {activeTab === 'appeals' ? (
                <AppealList />
              ) : (
                <AccessLogList />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}