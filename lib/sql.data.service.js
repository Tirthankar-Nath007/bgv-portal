/**
 * SQL Data Service
 * Server-side data operations using Oracle SQL
 * This replaces the MongoDB data service
 */

import { getConnection, executeQuery, executeStatement, ensureConnection } from './db/oracle.js';
import { findEmployeeById as findEmpById, getEmployees as getEmps } from '@/lib/services/employeeDataService';

const VERIFICATION_ATTEMPT_CONFIG = {
    MAX_ATTEMPTS: 3,
    EXIT_TEAM_EMAIL: 'biswajit.dash@codemate.ai',
    BLOCKED_MESSAGE: 'Maximum attempts reached. Please reach out to exit team - biswajit.dash@codemate.ai'
};

async function ensureDBConnection() {
    await ensureConnection();
}

// Helper to safely convert CLOB to string and parse JSON
function safeJSONParse(value) {
    if (value === null || value === undefined) {
        return null;
    }
    try {
        const str = typeof value === 'string' ? value : String(value);
        return str ? JSON.parse(str) : null;
    } catch (e) {
        return null;
    }
}

// Helper to convert CLOB to string
function clobToString(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'string') {
        return value;
    }
    if (value && typeof value.toString === 'function') {
        const str = value.toString();
        return str === '[object Object]' ? null : str;
    }
    return String(value);
}

// ==================== VERIFIER OPERATIONS ====================

export async function getVerifiers() {
    await ensureDBConnection();
    const sql = `SELECT * FROM BGV_VERIFIERS`;
    return await executeQuery(sql);
}

export async function addVerifier(verifierData) {
    await ensureDBConnection();
    const sql = `
        INSERT INTO BGV_VERIFIERS (
            email, password, company_name, is_email_verified, is_active,
            is_bgv_agency, test_mode, notifications, verification_requests, bypass_token, last_login_at
        ) VALUES (
            :email, :password, :company_name, :is_email_verified, :is_active,
            :is_bgv_agency, :test_mode, :notifications, :verification_requests, :bypass_token, :last_login_at
        )
        RETURNING id INTO :new_id
    `;
    
    const params = {
        email: verifierData.email,
        password: verifierData.password,
        company_name: verifierData.companyName,
        is_email_verified: verifierData.isEmailVerified ? 1 : 0,
        is_active: verifierData.isActive ? 1 : 0,
        is_bgv_agency: verifierData.isBgvAgency ? 1 : 0,
        test_mode: verifierData.testMode ? 1 : 0,
        notifications: verifierData.notifications ? JSON.stringify(verifierData.notifications) : null,
        verification_requests: verifierData.verificationRequests ? JSON.stringify(verifierData.verificationRequests) : null,
        bypass_token: verifierData.bypassToken || null,
        last_login_at: verifierData.lastLoginAt || null,
        new_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };

    const result = await executeStatement(sql, params);
    return { ...verifierData, id: result.outBinds?.new_id?.[0] };
}

export async function findVerifierByEmail(email) {
    await ensureDBConnection();
    const sql = `SELECT id, email, password, company_name, is_email_verified, is_active, is_bgv_agency, test_mode, notifications, verification_requests, last_login_at FROM BGV_VERIFIERS WHERE LOWER(email) = LOWER(:email)`;
    const rows = await executeQuery(sql, { email });
    if (rows.length > 0) {
        const v = rows[0];
        let notifications = [];
        let verificationRequests = [];
        
        notifications = safeJSONParse(v.NOTIFICATIONS) || [];
        verificationRequests = safeJSONParse(v.VERIFICATION_REQUESTS) || [];
        
        return {
            _id: v.ID,
            id: v.ID,
            email: v.EMAIL,
            password: v.PASSWORD,
            companyName: v.COMPANY_NAME,
            isEmailVerified: v.IS_EMAIL_VERIFIED === 1,
            isActive: v.IS_ACTIVE === 1,
            isBgvAgency: v.IS_BGV_AGENCY === 1,
            testMode: v.TEST_MODE === 1,
            notifications,
            verificationRequests,
            lastLoginAt: v.LAST_LOGIN_AT
        };
    }
    return null;
}

export async function findVerifierById(id) {
    await ensureDBConnection();
    const sql = `SELECT id, email, password, company_name, is_email_verified, is_active, is_bgv_agency, test_mode, notifications, verification_requests, last_login_at FROM BGV_VERIFIERS WHERE id = :id`;
    const rows = await executeQuery(sql, { id: parseInt(id) });
    if (rows.length > 0) {
        const v = rows[0];
        
        return {
            _id: v.ID,
            id: v.ID,
            email: v.EMAIL,
            password: v.PASSWORD,
            companyName: v.COMPANY_NAME,
            isEmailVerified: v.IS_EMAIL_VERIFIED === 1,
            isActive: v.IS_ACTIVE === 1,
            isBgvAgency: v.IS_BGV_AGENCY === 1,
            testMode: v.TEST_MODE === 1,
            notifications: safeJSONParse(v.NOTIFICATIONS) || [],
            verificationRequests: safeJSONParse(v.VERIFICATION_REQUESTS) || [],
            lastLoginAt: v.LAST_LOGIN_AT
        };
    }
    return null;
}

export async function updateVerifier(id, updatedData) {
    await ensureDBConnection();
    
    const updates = [];
    const params = { id: parseInt(id) };

    if (updatedData.companyName) {
        updates.push('company_name = :company_name');
        params.company_name = updatedData.companyName;
    }
    if (updatedData.email) {
        updates.push('email = :email');
        params.email = updatedData.email;
    }
    if (updatedData.password) {
        updates.push('password = :password');
        params.password = updatedData.password;
    }
    if (updatedData.isActive !== undefined) {
        updates.push('is_active = :is_active');
        params.is_active = updatedData.isActive ? 1 : 0;
    }
    if (updatedData.lastLoginAt) {
        updates.push('last_login_at = :last_login_at');
        params.last_login_at = updatedData.lastLoginAt;
    }
    if (updatedData.notifications !== undefined) {
        updates.push('notifications = :notifications');
        params.notifications = JSON.stringify(updatedData.notifications);
    }

    if (updates.length === 0) return null;

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `UPDATE BGV_VERIFIERS SET ${updates.join(', ')} WHERE id = :id`;
    await executeStatement(sql, params);
    
    return await findVerifierById(id);
}

export async function clearVerifierNotifications(verifierId) {
    await ensureDBConnection();
    const sql = `UPDATE BGV_VERIFIERS SET notifications = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = :id`;
    await executeStatement(sql, { id: parseInt(verifierId) });
    return await findVerifierById(verifierId);
}

// ==================== EMPLOYEE OPERATIONS ====================

export async function findEmployeeById(employeeId) {
    return await findEmpById(employeeId);
}

export async function findEmployeeByNumericId(numericId) {
    // For RPTDBUAT, search by employee_id directly
    return await findEmpById(numericId);
}

export async function getEmployees() {
    return await getEmps();
}

// ==================== ADMIN OPERATIONS ====================

export async function findAdminByUsername(username) {
    await ensureDBConnection();
    const sql = `SELECT id, username, email, password, full_name, role, department, permissions, is_active, test_mode, last_login_at FROM BGV_ADMINS WHERE LOWER(username) = LOWER(:username)`;
    const rows = await executeQuery(sql, { username });
    if (rows.length > 0) {
        const a = rows[0];
        
        return {
            _id: a.ID,
            id: a.ID,
            username: a.USERNAME,
            email: a.EMAIL,
            password: a.PASSWORD,
            fullName: a.FULL_NAME,
            role: a.ROLE,
            department: a.DEPARTMENT,
            permissions: safeJSONParse(a.PERMISSIONS) || [],
            isActive: a.IS_ACTIVE === 1,
            testMode: a.TEST_MODE === 1,
            lastLoginAt: a.LAST_LOGIN_AT
        };
    }
    return null;
}

export async function findAdminById(id) {
    await ensureDBConnection();
    const sql = `SELECT id, username, email, password, full_name, role, department, permissions, is_active, test_mode, last_login_at FROM BGV_ADMINS WHERE id = :id`;
    const rows = await executeQuery(sql, { id: parseInt(id) });
    if (rows.length > 0) {
        const a = rows[0];
        
        return {
            _id: a.ID,
            id: a.ID,
            username: a.USERNAME,
            email: a.EMAIL,
            password: a.PASSWORD,
            fullName: a.FULL_NAME,
            role: a.ROLE,
            department: a.DEPARTMENT,
            permissions: safeJSONParse(a.PERMISSIONS) || [],
            isActive: a.IS_ACTIVE === 1,
            testMode: a.TEST_MODE === 1,
            lastLoginAt: a.LAST_LOGIN_AT
        };
    }
    return null;
}

export async function updateAdminLastLogin(id) {
    await ensureDBConnection();
    const sql = `UPDATE BGV_ADMINS SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id`;
    await executeStatement(sql, { id: parseInt(id) });
    return await findAdminById(id);
}

// ==================== VERIFICATION RECORD OPERATIONS ====================

export async function getVerificationRecords() {
    await ensureDBConnection();
    const sql = `SELECT * FROM BGV_VERIFICATION_RECORDS ORDER BY created_at DESC`;
    const rows = await executeQuery(sql);
    return rows.map(formatVerificationRecord);
}

export async function findVerificationRecord(verificationId) {
    await ensureDBConnection();
    const sql = `SELECT * FROM BGV_VERIFICATION_RECORDS WHERE verification_id = :verificationId`;
    const rows = await executeQuery(sql, { verificationId });
    if (rows.length > 0) {
        return formatVerificationRecord(rows[0]);
    }
    return null;
}

export async function addVerificationRecord(recordData) {
    await ensureDBConnection();
    const sql = `
        INSERT INTO BGV_VERIFICATION_RECORDS (
            verification_id, employee_id, verifier_id, submitted_data,
            comparison_results, overall_status, match_score, consent_given,
            pdf_report_url, verification_completed_at
        ) VALUES (
            :verification_id, :employee_id, :verifier_id, :submitted_data,
            :comparison_results, :overall_status, :match_score, :consent_given,
            :pdf_report_url, :verification_completed_at
        )
        RETURNING id INTO :new_id
    `;
    
    const params = {
        verification_id: recordData.verificationId,
        employee_id: recordData.employeeId,
        verifier_id: recordData.verifierId,
        submitted_data: JSON.stringify(recordData.submittedData),
        comparison_results: recordData.comparisonResults ? JSON.stringify(recordData.comparisonResults) : null,
        overall_status: recordData.overallStatus,
        match_score: recordData.matchScore,
        consent_given: recordData.consentGiven ? 1 : 0,
        pdf_report_url: recordData.pdfReportUrl || null,
        verification_completed_at: recordData.verificationCompletedAt || null,
        new_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };

    const result = await executeStatement(sql, params);
    return { ...recordData, id: result.outBinds?.new_id?.[0] };
}

export async function getVerificationRecordsByVerifier(verifierId) {
    await ensureDBConnection();
    const verifierIdNum = parseInt(verifierId);
    const sql = `SELECT id, verification_id, employee_id, verifier_id, submitted_data, comparison_results, overall_status, match_score, consent_given, pdf_report_url, verification_completed_at, created_at, updated_at FROM BGV_VERIFICATION_RECORDS WHERE verifier_id = :verifierId ORDER BY created_at DESC`;
    const rows = await executeQuery(sql, { verifierId: verifierIdNum });
    return rows.map(formatVerificationRecord);
}

export async function updateVerificationRecord(verificationId, updateData) {
    await ensureDBConnection();
    
    const updates = [];
    const params = { verificationId };

    if (updateData.pdfReportUrl !== undefined) {
        updates.push('pdf_report_url = :pdf_report_url');
        params.pdf_report_url = updateData.pdfReportUrl;
    }
    if (updateData.overallStatus) {
        updates.push('overall_status = :overall_status');
        params.overall_status = updateData.overallStatus;
    }

    if (updates.length === 0) return null;

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `UPDATE BGV_VERIFICATION_RECORDS SET ${updates.join(', ')} WHERE verification_id = :verificationId`;
    await executeStatement(sql, params);
    
    return await findVerificationRecord(verificationId);
}

// ==================== APPEAL OPERATIONS ====================

export async function getAppeals() {
    await ensureDBConnection();
    const sql = `SELECT * FROM BGV_APPEALS ORDER BY created_at DESC`;
    const rows = await executeQuery(sql);
    return rows.map(formatAppeal);
}

export async function getAppealById(appealId) {
    await ensureDBConnection();
    console.log('Fetching appeal with ID:', appealId);
    const sql = `SELECT * FROM BGV_APPEALS WHERE appeal_id = :appealId`;
    const rows = await executeQuery(sql, { appealId });
    if (rows.length > 0) {
        return formatAppeal(rows[0]);
    }
    return null;
}

export async function addAppeal(appealData) {
    await ensureDBConnection();
    const sql = `
        INSERT INTO BGV_APPEALS (
            appeal_id, verification_id, verifier_id, employee_id,
            appeal_reason, documents, mismatched_fields, status
        ) VALUES (
            :appeal_id, :verification_id, :verifier_id, :employee_id,
            :appeal_reason, :documents, :mismatched_fields, :status
        )
        RETURNING id INTO :new_id
    `;
    
    const params = {
        appeal_id: appealData.appealId,
        verification_id: appealData.verificationId,
        verifier_id: appealData.verifierId,
        employee_id: appealData.employeeId,
        appeal_reason: appealData.appealReason,
        documents: appealData.documents ? JSON.stringify(appealData.documents) : null,
        mismatched_fields: appealData.mismatchedFields ? JSON.stringify(appealData.mismatchedFields) : null,
        status: appealData.status || 'pending',
        new_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };

    const result = await executeStatement(sql, params);
    return { ...appealData, id: result.outBinds?.new_id?.[0] };
}

export async function updateAppeal(appealId, updateData) {
    await ensureDBConnection();
    
    const updates = [];
    const params = { appealId };

    if (updateData.status) {
        updates.push('status = :status');
        params.status = updateData.status;
    }
    if (updateData.hrResponse) {
        updates.push('hr_response = :hr_response');
        params.hr_response = updateData.hrResponse;
    }
    if (updateData.hrComments) {
        updates.push('hr_comments = :hr_comments');
        params.hr_comments = updateData.hrComments;
    }
    if (updateData.reviewedBy) {
        updates.push('reviewed_by = :reviewed_by');
        params.reviewed_by = updateData.reviewedBy;
    }
    if (updateData.reviewedAt) {
        updates.push('reviewed_at = :reviewed_at');
        params.reviewed_at = updateData.reviewedAt;
    }

    if (updates.length === 0) return null;

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `UPDATE BGV_APPEALS SET ${updates.join(', ')} WHERE appeal_id = :appealId`;
    await executeStatement(sql, params);
    
    return await getAppealById(appealId);
}

// ==================== UTILITY FUNCTIONS ====================

export function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

export async function generateSequentialId(prefix, Model) {
    await ensureDBConnection();
    
    let tableName;
    if (Model?.modelName === 'VerificationRecord' || Model?.name === 'VerificationRecord') {
        tableName = 'BGV_VERIFICATION_RECORDS';
    } else if (Model?.modelName === 'Appeal' || Model?.name === 'Appeal') {
        tableName = 'BGV_APPEALS';
    } else {
        tableName = 'BGV_VERIFICATION_RECORDS';
    }

    const sql = `SELECT COUNT(*) as cnt FROM ${tableName}`;
    const rows = await executeQuery(sql);
    const count = rows[0]?.CNT || 0;
    const nextNumber = (count + 1).toString().padStart(6, '0');
    return `${prefix}${nextNumber}`;
}

export async function getDashboardStats() {
    await ensureDBConnection();

    const totalEmployees = await executeQuery(`SELECT COUNT(*) as cnt FROM BGV_EMPLOYEES`);
    const totalVerifiers = await executeQuery(`SELECT COUNT(*) as cnt FROM BGV_VERIFIERS`);
    const totalVerifications = await executeQuery(`SELECT COUNT(*) as cnt FROM BGV_VERIFICATION_RECORDS`);
    const totalAppeals = await executeQuery(`SELECT COUNT(*) as cnt FROM BGV_APPEALS`);
    const pendingAppeals = await executeQuery(`SELECT COUNT(*) as cnt FROM BGV_APPEALS WHERE status = 'pending'`);
    const matchedVerifications = await executeQuery(`SELECT COUNT(*) as cnt FROM BGV_VERIFICATION_RECORDS WHERE overall_status = 'matched'`);
    const partialMatches = await executeQuery(`SELECT COUNT(*) as cnt FROM BGV_VERIFICATION_RECORDS WHERE overall_status = 'partial_match'`);
    const mismatches = await executeQuery(`SELECT COUNT(*) as cnt FROM BGV_VERIFICATION_RECORDS WHERE overall_status = 'mismatch'`);

    const recentVerifications = await executeQuery(`
        SELECT * FROM BGV_VERIFICATION_RECORDS 
        ORDER BY created_at DESC 
        FETCH FIRST 10 ROWS ONLY
    `);
    const recentAppeals = await executeQuery(`
        SELECT * FROM BGV_APPEALS 
        ORDER BY created_at DESC 
        FETCH FIRST 10 ROWS ONLY
    `);

    return {
        totalEmployees: totalEmployees[0]?.CNT || 0,
        totalVerifiers: totalVerifiers[0]?.CNT || 0,
        totalVerifications: totalVerifications[0]?.CNT || 0,
        totalAppeals: totalAppeals[0]?.CNT || 0,
        pendingAppeals: pendingAppeals[0]?.CNT || 0,
        recentVerifications: recentVerifications.map(formatVerificationRecord),
        recentAppeals: recentAppeals.map(formatAppeal),
        matchedVerifications: matchedVerifications[0]?.CNT || 0,
        partialMatches: partialMatches[0]?.CNT || 0,
        mismatches: mismatches[0]?.CNT || 0,
    };
}

// ==================== ACCESS LOG OPERATIONS ====================

export async function logAccess(data) {
    try {
        await ensureDBConnection();
        const sql = `
            INSERT INTO BGV_ACCESS_LOGS (
                email, role, action, status, ip_address, user_agent, failure_reason, metadata
            ) VALUES (
                :email, :role, :action, :status, :ip_address, :user_agent, :failure_reason, :metadata
            )
        `;
        
        const params = {
            email: data.email || 'unknown',
            role: data.role || 'unknown',
            action: data.action || 'LOGIN',
            status: data.status,
            ip_address: data.ipAddress || null,
            user_agent: data.userAgent || null,
            failure_reason: data.failureReason || null,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null
        };

        await executeStatement(sql, params);
        return true;
    } catch (error) {
        console.error('Failed to create access log:', error);
        return null;
    }
}

export async function getAccessLogs({ page = 1, limit = 20, status, role } = {}) {
    await ensureDBConnection();

    const conditions = [];
    const params = {};
    const countParams = {};

    if (status && status !== 'ALL') {
        conditions.push('status = :status');
        params.status = status;
        countParams.status = status;
    }
    if (role && role !== 'ALL') {
        conditions.push('role = :role');
        params.role = role;
        countParams.role = role;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const offset = (page - 1) * limit;
    params.limit = limit;
    params.offset = offset;

    const countSql = `SELECT COUNT(*) as total FROM BGV_ACCESS_LOGS ${whereClause}`;
    const countResult = await executeQuery(countSql, countParams);
    const total = countResult[0]?.TOTAL || 0;

    const sql = `
        SELECT * FROM BGV_ACCESS_LOGS 
        ${whereClause}
        ORDER BY timestamp DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;
    
    const logs = await executeQuery(sql, params);

    return {
        logs: logs.map(log => ({
            _id: log.ID,
            email: log.EMAIL,
            role: log.ROLE,
            action: log.ACTION,
            status: log.STATUS,
            ipAddress: log.IP_ADDRESS,
            userAgent: log.USER_AGENT,
            failureReason: log.FAILURE_REASON,
            metadata: safeJSONParse(log.METADATA),
            timestamp: log.TIMESTAMP
        })),
        pagination: {
            total,
            pages: Math.ceil(total / limit),
            page,
            limit
        }
    };
}

// ==================== VERIFICATION ATTEMPT OPERATIONS ====================

export async function isVerificationBlocked(verifierId, employeeId) {
    await ensureDBConnection();
    const normalizedEmployeeId = employeeId.toString().toUpperCase().trim();
    const verifierIdNum = parseInt(verifierId);
    
    try {
        const sql = `
            SELECT is_blocked FROM BGV_VERIFICATION_ATTEMPTS 
            WHERE verifier_id = :verifierId AND UPPER(employee_id) = :employeeId
        `;
        const rows = await executeQuery(sql, { verifierId: verifierIdNum, employeeId: normalizedEmployeeId });
        return rows.length > 0 && (rows[0].IS_BLOCKED === 1 || rows[0].IS_BLOCKED === '1');
    } catch (err) {
        console.error('Error checking verification block:', err.message);
        return false;
    }
}

export async function getVerificationAttempt(verifierId, employeeId) {
    await ensureDBConnection();
    const normalizedEmployeeId = employeeId.toString().toUpperCase().trim();
    const verifierIdNum = parseInt(verifierId);
    
    try {
        const sql = `
            SELECT id, verifier_id, employee_id, attempt_count, is_blocked, blocked_at, last_attempt_at 
            FROM BGV_VERIFICATION_ATTEMPTS 
            WHERE verifier_id = :verifierId AND UPPER(employee_id) = :employeeId
        `;
        const rows = await executeQuery(sql, { verifierId: verifierIdNum, employeeId: normalizedEmployeeId });
        if (rows.length > 0) {
            return formatVerificationAttempt(rows[0]);
        }
    } catch (err) {
        console.error('Error getting verification attempt:', err.message);
    }
    return null;
}

export async function incrementVerificationAttempt(verifierId, employeeId) {
    await ensureDBConnection();
    const normalizedEmployeeId = employeeId.toString().toUpperCase().trim();
    const verifierIdNum = parseInt(verifierId);

    const checkSql = `SELECT id, attempt_count, is_blocked FROM BGV_VERIFICATION_ATTEMPTS WHERE verifier_id = :verifierId AND UPPER(employee_id) = :employeeId`;
    const existing = await executeQuery(checkSql, { verifierId: verifierIdNum, employeeId: normalizedEmployeeId });

    let result;
    if (existing.length === 0) {
        // Insert new attempt record
        try {
            const insertSql = `
                INSERT INTO BGV_VERIFICATION_ATTEMPTS (verifier_id, employee_id, attempt_count, last_attempt_at)
                VALUES (:verifierId, :employeeId, 1, CURRENT_TIMESTAMP)
                RETURNING id, attempt_count INTO :new_id, :attempt_count
            `;
            result = await executeStatement(insertSql, {
                verifierId: verifierIdNum,
                employeeId: normalizedEmployeeId,
                new_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
                attempt_count: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            });
        } catch (err) {
            console.error('Error inserting verification attempt:', err.message);
            return { attemptCount: 1, isBlocked: false, justBlocked: false };
        }
    } else {
        // Update existing attempt
        try {
            const attempt = existing[0];
            const newCount = parseInt(attempt.ATTEMPT_COUNT) + 1;
            const isBlocked = newCount >= VERIFICATION_ATTEMPT_CONFIG.MAX_ATTEMPTS ? 1 : (attempt.IS_BLOCKED || 0);
            
            const updateSql = `
                UPDATE BGV_VERIFICATION_ATTEMPTS 
                SET attempt_count = :count, is_blocked = :blocked, last_attempt_at = CURRENT_TIMESTAMP,
                    blocked_at = CASE WHEN :blocked = 1 AND (is_blocked IS NULL OR is_blocked = 0) THEN CURRENT_TIMESTAMP ELSE blocked_at END
                WHERE id = :id
                RETURNING id, attempt_count INTO :new_id, :attempt_count
            `;
            
            result = await executeStatement(updateSql, {
                count: newCount,
                blocked: isBlocked,
                id: parseInt(attempt.ID),
                new_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
                attempt_count: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            });
        } catch (err) {
            console.error('Error updating verification attempt:', err.message);
            return { attemptCount: 1, isBlocked: false, justBlocked: false };
        }
    }

    const attemptCount = result?.outBinds?.attempt_count?.[0] || 1;
    const isBlockedResult = attemptCount >= VERIFICATION_ATTEMPT_CONFIG.MAX_ATTEMPTS;

    return {
        attemptCount,
        isBlocked: isBlockedResult,
        justBlocked: isBlockedResult
    };
}

export async function resetVerificationAttempt(verifierId, employeeId) {
    await ensureDBConnection();
    const normalizedEmployeeId = employeeId.toString().toUpperCase().trim();
    const verifierIdNum = parseInt(verifierId);
    
    try {
        const sql = `
            UPDATE BGV_VERIFICATION_ATTEMPTS 
            SET attempt_count = 0, is_blocked = 0, blocked_at = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE verifier_id = :verifierId AND UPPER(employee_id) = :employeeId
        `;
        await executeStatement(sql, { verifierId: verifierIdNum, employeeId: normalizedEmployeeId });
        return true;
    } catch (err) {
        console.error('Error resetting verification attempt:', err.message);
        return false;
    }
}

export function getBlockedMessage() {
    return VERIFICATION_ATTEMPT_CONFIG.BLOCKED_MESSAGE;
}

// ==================== HELPER FUNCTIONS ====================

function formatVerificationRecord(row) {
    return {
        _id: row.ID,
        id: row.ID,
        verificationId: row.VERIFICATION_ID,
        employeeId: row.EMPLOYEE_ID,
        verifierId: parseInt(row.VERIFIER_ID) || row.VERIFIER_ID,
        submittedData: safeJSONParse(row.SUBMITTED_DATA) || {},
        comparisonResults: safeJSONParse(row.COMPARISON_RESULTS) || [],
        overallStatus: row.OVERALL_STATUS,
        matchScore: parseInt(row.MATCH_SCORE) || 0,
        consentGiven: row.CONSENT_GIVEN === 1,
        pdfReportUrl: row.PDF_REPORT_URL,
        verificationCompletedAt: row.VERIFICATION_COMPLETED_AT,
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT
    };
}

function formatAppeal(row) {
    return {
        _id: row.ID,
        id: row.ID,
        appealId: row.APPEAL_ID,
        verificationId: parseInt(row.VERIFICATION_ID) || row.VERIFICATION_ID,
        verifierId: parseInt(row.VERIFIER_ID) || row.VERIFIER_ID,
        employeeId: parseInt(row.EMPLOYEE_ID) || row.EMPLOYEE_ID,
        appealReason: row.APPEAL_REASON || '',
        documents: safeJSONParse(row.DOCUMENTS) || [],
        mismatchedFields: safeJSONParse(row.MISMATCHED_FIELDS) || [],
        status: row.STATUS,
        hrResponse: row.HR_RESPONSE || '',
        hrComments: row.HR_COMMENTS || '',
        reviewedBy: row.REVIEWED_BY,
        reviewedAt: row.REVIEWED_AT,
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT
    };
}

function formatVerificationAttempt(row) {
    return {
        _id: row.ID,
        verifierId: row.VERIFIER_ID,
        employeeId: row.EMPLOYEE_ID,
        attemptCount: parseInt(row.ATTEMPT_COUNT) || 0,
        isBlocked: row.IS_BLOCKED === 1 || row.IS_BLOCKED === '1',
        blockedAt: row.BLOCKED_AT,
        lastAttemptAt: row.LAST_ATTEMPT_AT,
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT
    };
}

import oracledb from 'oracledb';

export default {
    getVerifiers,
    addVerifier,
    findVerifierByEmail,
    findVerifierById,
    updateVerifier,
    clearVerifierNotifications,
    findEmployeeById,
    findEmployeeByNumericId,
    getEmployees,
    findAdminByUsername,
    findAdminById,
    updateAdminLastLogin,
    getVerificationRecords,
    findVerificationRecord,
    addVerificationRecord,
    getVerificationRecordsByVerifier,
    updateVerificationRecord,
    getAppeals,
    getAppealById,
    addAppeal,
    updateAppeal,
    generateId,
    generateSequentialId,
    getDashboardStats,
    logAccess,
    getAccessLogs,
    isVerificationBlocked,
    getVerificationAttempt,
    incrementVerificationAttempt,
    resetVerificationAttempt,
    getBlockedMessage
};
