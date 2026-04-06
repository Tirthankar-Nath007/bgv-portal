"use client";

import { useState } from 'react';
import Icon from '@/components/Icon';

/**
 * Excel Export Button Component
 * Fetches data from API and generates Excel file download
 */
export default function ExcelExportButton() {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);

        try {
            // Get admin token
            const sessionData = localStorage.getItem('admin_session');
            const session = sessionData ? JSON.parse(sessionData) : null;

            if (!session?.token) {
                alert('Please log in again');
                return;
            }

            // Fetch export data from API
            const response = await fetch('/api/admin/export', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.token}`
                }
            });

            const data = await response.json();

            if (!data.success || !data.data?.records) {
                alert(data.message || 'Failed to export data');
                return;
            }

            // Generate CSV content (Excel-compatible)
            const records = data.data.records;
            const headers = data.data.headers;

            // Build CSV
            let csvContent = headers.join(',') + '\n';

            records.forEach(record => {
                const row = headers.map(header => {
                    const value = record[header] || '';
                    // Escape special characters for CSV
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                });
                csvContent += row.join(',') + '\n';
            });

            // Create downloadable file
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Verification_Report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export data. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn btn-outline btn-success gap-2"
        >
            {isExporting ? (
                <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Exporting...
                </>
            ) : (
                <>
                    <Icon name="FileSpreadsheet" className="w-5 h-5" />
                    Export to Excel
                </>
            )}
        </button>
    );
}
