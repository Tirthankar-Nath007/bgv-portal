/**
 * Oracle Database Connection Handler
 * Manages connection pool for Oracle Database using oracledb
 */

import oracledb from 'oracledb';

// Auto-fetch CLOB columns as strings instead of LOB objects
oracledb.fetchAsString = [oracledb.CLOB];

const ORACLE_CONFIG = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
};

if (!ORACLE_CONFIG.user || !ORACLE_CONFIG.password || !ORACLE_CONFIG.connectString) {
    throw new Error('Oracle configuration missing. Please set ORACLE_USER, ORACLE_PASSWORD, and ORACLE_CONNECTION_STRING environment variables');
}

let pool = null;

/**
 * Build Oracle connection descriptor from components
 * Format: (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=...)(PORT=...))(CONNECT_DATA=(SERVICE_NAME=...)))
 */
function buildConnectString(host, port, serviceName) {
    return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${serviceName})))`;
}

/**
 * Initialize Oracle connection pool
 * @returns {Promise<oracledb.Pool>} Connection pool
 */
export async function initializePool() {
    if (pool) {
        console.log('✅ Using existing Oracle connection pool');
        return pool;
    }

    try {
        console.log('🔄 Initializing Oracle connection pool...');
        console.log('📋 Connection details:', {
            user: ORACLE_CONFIG.user,
            connectString: ORACLE_CONFIG.connectString ? '(Using custom connection string)' : 'Need to build'
        });

        await oracledb.createPool({
            user: ORACLE_CONFIG.user,
            password: ORACLE_CONFIG.password,
            connectString: ORACLE_CONFIG.connectString,
            poolMin: 2,
            poolMax: 10,
            poolIncrement: 2,
            poolTimeout: 60,
            queueTimeout: 15000,
            stmtCacheSize: 30,
        });

        pool = await oracledb.getPool();
        console.log('✅ Oracle connection pool initialized successfully:', {
            poolMin: 2,
            poolMax: 10,
            queueTimeout: 15000,
            stmtCacheSize: 30,
            connectionsOpen: pool.connectionsOpen,
            connectionsInUse: pool.connectionsInUse,
        });
        
        return pool;
    } catch (error) {
        console.error('❌ Failed to initialize Oracle connection pool:', error.message);
        throw error;
    }
}

/**
 * Get a connection from the pool
 * @returns {Promise<oracledb.Connection>} Database connection
 */
export async function getConnection() {
    if (!pool) {
        await initializePool();
    }

    try {
        const t = Date.now();
        const connection = await pool.getConnection();
        const waitTime = Date.now() - t;
        if (waitTime > 100) {
            console.warn(`⚠️ Pool connection waited ${waitTime}ms`, {
                connectionsOpen: pool.connectionsOpen,
                connectionsInUse: pool.connectionsInUse,
            });
        }
        return connection;
    } catch (error) {
        console.error('❌ Failed to get connection from pool:', {
            error: error.message,
            connectionsOpen: pool?.connectionsOpen,
            connectionsInUse: pool?.connectionsInUse,
            queueMax: pool?.queueMax,
        });
        throw error;
    }
}

/**
 * Execute a query with parameters
 * @param {string} sql - SQL query
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
export async function executeQuery(sql, params = {}, timeoutMs = 30000) {
    const connection = await getConnection();
    const t = Date.now();
    const sqlLabel = sql.split(' ').slice(0, 4).join(' ');
    try {
        if (timeoutMs > 0) {
            connection.callTimeout = timeoutMs;
        }
        const result = await connection.execute(sql, params, {
            outFormat: oracledb.OUT_FORMAT_ARRAY,
        });
        
        if (!result.rows) {
            return [];
        }
        
        const meta = result.metaData || [];
        const columns = meta.map(col => col.name.toUpperCase());
        
        const plainRows = result.rows.map(row => {
            const obj = {};
            columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj;
        });
        
        return plainRows;
    } finally {
        await connection.close();
        const elapsed = Date.now() - t;
        if (elapsed > 500) {
            console.warn(`⚠️ Slow query (${elapsed}ms): ${sqlLabel}`);
        }
    }
}

/**
 * Execute an INSERT/UPDATE/DELETE statement
 * @param {string} sql - SQL statement
 * @param {Object} params - Parameters
 * @param {boolean} autoCommit - Whether to commit automatically
 * @returns {Promise<Object>} Result with lastRowId if applicable
 */
export async function executeStatement(sql, params = {}, autoCommit = true, timeoutMs = 30000) {
    const connection = await getConnection();
    const t = Date.now();
    const sqlLabel = sql.split(' ').slice(0, 4).join(' ');
    try {
        if (timeoutMs > 0) {
            connection.callTimeout = timeoutMs;
        }
        const result = await connection.execute(sql, params, {
            autoCommit,
            outFormat: oracledb.OUT_FORMAT_ARRAY,
        });
        
        // Return only serializable parts of the result
        return {
            rowsAffected: result.rowsAffected,
            outBinds: result.outBinds,
            metaData: result.metaData ? result.metaData.map(m => ({ name: m.name })) : []
        };
    } finally {
        await connection.close();
        const elapsed = Date.now() - t;
        if (elapsed > 500) {
            console.warn(`⚠️ Slow statement (${elapsed}ms): ${sqlLabel}`);
        }
    }
}

/**
 * Execute multiple statements in a transaction
 * @param {Array<{sql: string, params: Object}>} statements - Array of {sql, params}
 * @returns {Promise<Object>} Transaction result
 */
export async function executeTransaction(statements) {
    const connection = await getConnection();
    try {
        await connection.execute(`BEGIN`);

        const results = [];
        for (const stmt of statements) {
            const result = await connection.execute(stmt.sql, stmt.params || {}, {
                autoCommit: false,
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });
            results.push(result);
        }

        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.close();
    }
}

/**
 * Close the connection pool
 */
export async function closePool() {
    if (pool) {
        try {
            await pool.close(10);
            pool = null;
            console.log('✅ Oracle connection pool closed');
        } catch (error) {
            console.error('❌ Error closing Oracle connection pool:', error.message);
        }
    }
}

/**
 * Ensure database connection is ready
 * @returns {Promise<void>}
 */
export async function ensureConnection() {
    await initializePool();
}

export default {
    initializePool,
    getConnection,
    executeQuery,
    executeStatement,
    executeTransaction,
    closePool,
    ensureConnection,
};
