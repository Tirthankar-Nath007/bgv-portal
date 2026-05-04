/**
 * Employee Data Service
 * Abstracts employee data source - can switch between BGV_EMPLOYEES and RPTDBUAT
 */

import { executeQuery } from '@/lib/db/oracle.js';

// Configuration: Set which source to use
const EMPLOYEE_DATA_SOURCE = process.env.EMPLOYEE_DATA_SOURCE || 'BGV_EMPLOYEES'; // 'BGV_EMPLOYEES' or 'RPTDBUAT'

/**
 * Find employee by ID - main entry point
 * @param {string} employeeId - Employee ID to search
 * @returns {Object|null} Employee record in app format
 */
export async function findEmployeeById(employeeId) {
    try {
        if (EMPLOYEE_DATA_SOURCE === 'RPTDBUAT') {
            console.log('Using RPTDBUAT as employee data source');
            return await findEmployeeInRPTDBUAT(employeeId);
        } else {
            return await findEmployeeInBGV(employeeId);
        }
    } catch (error) {
        console.error('Error fetching employee:', error);
        if (EMPLOYEE_DATA_SOURCE === 'RPTDBUAT') {
            console.warn('RPTDBUAT failed, falling back to BGV_EMPLOYEES');
            return await findEmployeeInBGV(employeeId);
        }
        throw error;
    }
}

/**
 * Get all employees
 * @returns {Array} Array of employee records
 */
export async function getEmployees() {
    try {
        if (EMPLOYEE_DATA_SOURCE === 'RPTDBUAT') {
            return await getEmployeesFromRPTDBUAT();
        } else {
            return await getEmployeesFromBGV();
        }
    } catch (error) {
        console.error('Error fetching employees:', error);
        if (EMPLOYEE_DATA_SOURCE === 'RPTDBUAT') {
            console.warn('RPTDBUAT failed, falling back to BGV_EMPLOYEES');
            return await getEmployeesFromBGV();
        }
        throw error;
    }
}

// ==================== RPTDBUAT Implementation ====================

async function findEmployeeInRPTDBUAT(employeeId) {
    console.log('Querying RPTDBUAT for employee ID:', employeeId);
    const sql = `
        SELECT 
            EMPLOYEE_ID,
            FIRST_NAME,
            MIDDLE_NAME,
            LAST_NAME,
            FUNCTIONNAME,
            BUSINESS,
            DATE_OF_JOINING,
            DATE_OF_RESIGNATION,
            DESIGNATION,
            DEPARTMENT,
            STATUS_OF_RESIGNATION,
            EMAIL,
            STATUS,
            LAST_WORKING_DATE
         FROM lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT
         WHERE UPPER(EMPLOYEE_ID) = UPPER(:employeeId)
    `;
    
    const rows = await executeQuery(sql, { employeeId });
    
    if (rows.length > 0) {
        return mapRPTDBUATToAppFields(rows[0]);
    }
    return null;
}

async function getEmployeesFromRPTDBUAT() {
    const sql = `
        SELECT 
            EMPLOYEE_ID,
            FIRST_NAME,
            MIDDLE_NAME,
            LAST_NAME,
            FUNCTIONNAME,
            BUSINESS,
            DATE_OF_JOINING,
            DATE_OF_RESIGNATION,
            DESIGNATION,
            DEPARTMENT,
            STATUS_OF_RESIGNATION,
            EMAIL,
            STATUS
         FROM lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT
         ORDER BY DATE_OF_JOINING DESC
    `;
    
    const rows = await executeQuery(sql);
    return rows.map(row => mapRPTDBUATToAppFields(row));
}

function mapRPTDBUATToAppFields(row) {
    // Concatenate name parts
    const nameParts = [row.FIRST_NAME, row.MIDDLE_NAME, row.LAST_NAME].filter(Boolean);
    const fullName = nameParts.join(' ').trim();
    
    return {
        employeeId: row.EMPLOYEE_ID,
        name: fullName,
        entityName: row.BUSINESS || '',  // BUSINESS is the company name
        dateOfJoining: row.DATE_OF_JOINING,
        dateOfLeaving: row.DATE_OF_RESIGNATION || null,
        designation: row.DESIGNATION || '',
        exitReason: row.STATUS_OF_RESIGNATION || '',
        email: row.EMAIL || '',
        department: row.FUNCTIONNAME || '',  // FUNCTIONNAME is the department
        fnfStatus: calculateFnFFromRPTDBUAT(row.STATUS_OF_RESIGNATION, row.DATE_OF_RESIGNATION, row.LAST_WORKING_DATE)
    };
}

function calculateFnFFromRPTDBUAT(statusOfResignation, dateOfResignation, lastWorkingDate) {
    if (!statusOfResignation) return 'Pending';
    
    const status = statusOfResignation.toUpperCase();
    
    if (status === 'WORKING') return 'Not Applicable';
    
    if (['RESIGNED', 'RETIRED', 'TERMINATED', 'CONTRACT COMPLETED'].includes(status)) {
        if (!dateOfResignation && !lastWorkingDate) return 'Pending';
        
        const refDate = new Date(lastWorkingDate || dateOfResignation);
        const today = new Date();
        const daysSince = Math.floor((today - refDate) / (1000 * 60 * 60 * 24));
        
        return daysSince > 45 ? 'Completed' : 'Pending';
    }
    
    return 'Pending';
}

// ==================== BGV_EMPLOYEES Implementation ====================

async function findEmployeeInBGV(employeeId) {
    const sql = `SELECT id, employee_id, name, email, entity_name, date_of_joining, date_of_leaving, designation, exit_reason, fnf_status, department, created_at, updated_at FROM BGV_EMPLOYEES WHERE UPPER(employee_id) = UPPER(:employeeId)`;
    const rows = await executeQuery(sql, { employeeId });
    
    if (rows.length > 0) {
        const emp = rows[0];
        return {
            id: emp.ID,
            _id: emp.ID,
            employeeId: emp.EMPLOYEE_ID,
            name: emp.NAME,
            email: emp.EMAIL,
            entityName: emp.ENTITY_NAME,
            dateOfJoining: emp.DATE_OF_JOINING,
            dateOfLeaving: emp.DATE_OF_LEAVING,
            designation: emp.DESIGNATION,
            exitReason: emp.EXIT_REASON,
            fnfStatus: emp.FNF_STATUS,
            department: emp.DEPARTMENT,
            createdAt: emp.CREATED_AT,
            updatedAt: emp.UPDATED_AT
        };
    }
    return null;
}

async function getEmployeesFromBGV() {
    const sql = `SELECT * FROM BGV_EMPLOYEES ORDER BY created_at DESC`;
    const rows = await executeQuery(sql);
    return rows.map(emp => ({
        _id: emp.ID,
        employeeId: emp.EMPLOYEE_ID,
        name: emp.NAME,
        email: emp.EMAIL,
        entityName: emp.ENTITY_NAME,
        dateOfJoining: emp.DATE_OF_JOINING,
        dateOfLeaving: emp.DATE_OF_LEAVING,
        designation: emp.DESIGNATION,
        exitReason: emp.EXIT_REASON,
        fnfStatus: emp.FNF_STATUS,
        department: emp.DEPARTMENT,
        createdAt: emp.CREATED_AT,
        updatedAt: emp.UPDATED_AT
    }));
}
