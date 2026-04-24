/**
 * Database Connection Test Script
 * Tests Oracle Database connectivity
 * 
 * Usage: node scripts/test-connection.js
 */

import oracledb from 'oracledb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const ORACLE_CONFIG = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
};

async function testConnection() {
    let connection;

    console.log('\n===========================================');
    console.log('  Oracle Database Connection Test');
    console.log('===========================================\n');

    console.log('📋 Configuration:');
    console.log(`   User: ${ORACLE_CONFIG.user}`);
    console.log(`   Connect String: ${ORACLE_CONFIG.connectString ? '(Using .env.local)' : 'NOT SET'}`);
    console.log('');

    if (!ORACLE_CONFIG.user || !ORACLE_CONFIG.password || !ORACLE_CONFIG.connectString) {
        console.error('❌ Missing Oracle configuration!');
        console.error('   Please set ORACLE_USER, ORACLE_PASSWORD, and ORACLE_CONNECTION_STRING in .env.local');
        process.exit(1);
    }

    // Test 1: Basic Connection
    console.log('🔄 Test 1: Establishing connection...');
    try {
        connection = await oracledb.getConnection(ORACLE_CONFIG);
        console.log('   ✅ Connection established successfully!\n');
    } catch (error) {
        console.error('   ❌ Connection failed:', error.message);
        console.error('\n   Error Details:');
        console.error(`   - Error Code: ${error.errorNum || 'N/A'}`);
        console.error(`   - Message: ${error.message}`);
        
        if (error.message.includes('ORA-12154')) {
            console.error('\n   💡 Suggestion: Check your ORACLE_CONNECTION_STRING');
        } else if (error.message.includes('ORA-12541')) {
            console.error('\n   💡 Suggestion: Check if Oracle server is running and port 1521 is accessible');
        } else if (error.message.includes('ORA-01017')) {
            console.error('\n   💡 Suggestion: Check username and password credentials');
        }
        
        process.exit(1);
    }

    // Test 2: Execute Simple Query
    console.log('🔄 Test 2: Executing simple query (SELECT SYSDATE FROM DUAL)...');
    try {
        const result = await connection.execute('SELECT SYSDATE FROM DUAL');
        console.log('   ✅ Query executed successfully!');
        console.log(`   📅 Server Date/Time: ${result.rows[0][0]}\n`);
    } catch (error) {
        console.error('   ❌ Query execution failed:', error.message);
        process.exit(1);
    }

    // Test 3: Check if BGV_ tables exist
    console.log('🔄 Test 3: Checking for BGV_ tables...');
    try {
        const result = await connection.execute(`
            SELECT table_name 
            FROM user_tables 
            WHERE table_name LIKE 'BGV_%' 
            ORDER BY table_name
        `);
        
        if (result.rows.length === 0) {
            console.log('   ⚠️  No BGV_ tables found!');
            console.log('   💡 Run: node scripts/migrate-to-oracle.js\n');
        } else {
            console.log(`   ✅ Found ${result.rows.length} BGV_ tables:`);
            result.rows.forEach(row => {
                console.log(`      - ${row[0]}`);
            });
            console.log('');
        }
    } catch (error) {
        console.error('   ❌ Table check failed:', error.message);
    }

    // Test 4: Query sample data (if tables exist)
    console.log('🔄 Test 4: Querying sample data...');
    try {
        const tables = ['BGV_ADMINS', 'BGV_VERIFIERS', 'BGV_EMPLOYEES'];
        
        for (const table of tables) {
            const result = await connection.execute(`SELECT COUNT(*) as cnt FROM ${table}`);
            const count = result.rows[0][0];
            console.log(`   ✅ ${table}: ${count} record(s)`);
        }
        console.log('');
    } catch (error) {
        console.log(`   ⚠️  Could not query sample data: ${error.message}`);
        console.log('   💡 Tables may not exist yet. Run migration first.\n');
    }

    // Close connection
    console.log('🔄 Closing connection...');
    try {
        await connection.close();
        console.log('   ✅ Connection closed.\n');
    } catch (error) {
        console.error('   ⚠️  Error closing connection:', error.message);
    }

    console.log('===========================================');
    console.log('  ✅ All connection tests passed!');
    console.log('===========================================\n');
}

testConnection()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
