/**
 * Test Script: Verify RPTDBUAT Database Link Connection
 * Run this to test if lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT is accessible
 * 
 * Usage: node scripts/test-rptdbuat-connection.js
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
    connectString: process.env.ORACLE_CONNECTION_STRING || 
        `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT || '1521'}/${process.env.ORACLE_DATABASE}`,
};

async function testConnection() {
    let connection;
    
    try {
        console.log('🔄 Testing RPTDBUAT connection...');
        console.log('📋 Configuration:');
        console.log('   User:', ORACLE_CONFIG.user);
        console.log('   Connect String:', ORACLE_CONFIG.connectString ? '(Using .env.local)' : 'Need to build');
        
        connection = await oracledb.getConnection(ORACLE_CONFIG);
        console.log('✅ Oracle connection established successfully!');
        
        // Test 1: Check if database link exists
        console.log('\n🔄 Test 1: Checking database link...');
        try {
            const linkResult = await connection.execute(`
                SELECT db_link FROM user_db_links WHERE db_link = UPPER('RPTDBUAT')
            `);
            
            if (linkResult.rows.length > 0) {
                console.log('✅ Database link RPTDBUAT found');
            } else {
                console.log('⚠️  Database link RPTDBUAT not found in user_db_links');
                console.log('   Available links:');
                const allLinks = await connection.execute(`SELECT db_link FROM user_db_links`);
                allLinks.rows.forEach(row => {
                    console.log('   -', row[0]);
                });
            }
        } catch (error) {
            console.log('⚠️  Could not check database links:', error.message);
        }
        
        // Test 2: Count total employees
        console.log('\n🔄 Test 2: Counting employees in lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT;...');
        try {
            const countResult = await connection.execute(`
                SELECT COUNT(*) as total FROM lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT
             `);
            console.log('✅ Total employees in RPTDBUAT:', countResult.rows[0][0]);
        } catch (error) {
            console.error('❌ Failed to query RPTDBUAT:', error.message);
            console.error('   SQL: SELECT COUNT(*) FROM lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT;');
            console.error('   Make sure:');
            console.error('   1. Database link RPTDBUAT exists');
            console.error('   2. lmsautouser.employee_details table is accessible');
            console.error('   3. You have SELECT permission on the table');
            throw error;
        }
        
        // Test 3: Fetch sample employee
        console.log('\n🔄 Test 3: Fetching sample employee...');
        try {
            const sampleResult = await connection.execute(`
                SELECT 
                    EMPLOYEE_ID,
                    FIRST_NAME,
                    MIDDLE_NAME,
                    LAST_NAME,
                    FUNCTIONNAME,
                    DATE_OF_JOINING,
                    DATE_OF_RESIGNATION,
                    DESIGNATION,
                    DEPARTMENT,
                    STATUS_OF_RESIGNATION,
                    EMAIL,
                    STATUS
                 FROM lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT
                 WHERE ROWNUM <= 1
            `);
            
            if (sampleResult.rows.length > 0) {
                const row = sampleResult.rows[0];
                console.log('✅ Sample employee fetched:');
                console.log('   Employee ID:', row[0]);
                console.log('   Name:', [row[1], row[2], row[3]].filter(Boolean).join(' '));
                console.log('   Function:', row[4]);
                console.log('   Designation:', row[7]);
                console.log('   Date of Joining:', row[5]);
                console.log('   Status:', row[11]);
            }
        } catch (error) {
            console.error('❌ Failed to fetch sample employee:', error.message);
        }
        
        // Test 4: Search by employee ID
        console.log('\n🔄 Test 4: Testing employee lookup...');
        try {
            const searchResult = await connection.execute(`
                SELECT EMPLOYEE_ID, FIRST_NAME, LAST_NAME
                 FROM lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT
                 WHERE UPPER(EMPLOYEE_ID) = UPPER('EMP001')
            `);
            
            if (searchResult.rows.length > 0) {
                console.log('✅ Employee lookup works');
                console.log('   Found:', searchResult.rows[0][0], '-', searchResult.rows[0][1], searchResult.rows[0][2]);
            } else {
                console.log('⚠️  No employee found with ID EMP001 (this is okay if EMP001 doesn\'t exist)');
                console.log('   You can test with a real employee ID from RPTDBUAT');
            }
        } catch (error) {
            console.error('❌ Employee lookup failed:', error.message);
        }
        
        console.log('\n✅ All tests completed!');
        console.log('\n📝 Next steps:');
        console.log('   1. Set EMPLOYEE_DATA_SOURCE=RPTDBUAT in .env.local');
        console.log('   2. Restart the Next.js server');
        console.log('   3. Test employee verification with real data');
        
    } catch (error) {
        console.error('\n❌ Connection test failed:', error.message);
        console.error('   Full error:', error);
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('\n🔄 Connection closed');
            } catch (err) {
                console.error('Error closing connection:', err.message);
            }
        }
    }
    
    process.exit(0);
}

testConnection();
