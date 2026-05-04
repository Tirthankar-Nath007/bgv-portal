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
    
    try {
        console.log('🔄 Testing RPTDBUAT connection...');
        connection = await oracledb.getConnection(ORACLE_CONFIG);
        console.log('✅ Oracle connection established!');
        
        // Test 1: Count employees
        console.log('\n🔄 Test 1: Counting employees...');
        const countResult = await connection.execute(
            "SELECT COUNT(*) as cnt FROM lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT"
        );
        console.log('✅ Total employees in RPTDBUAT:', countResult.rows[0][0]);
        
        // Test 2: Fetch sample employee
        console.log('\n🔄 Test 2: Fetching sample employee...');
        const sampleResult = await connection.execute(`
            SELECT EMPLOYEE_ID, FIRST_NAME, LAST_NAME, DESIGNATION, FUNCTIONNAME, BUSINESS
            FROM lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT
            WHERE ROWNUM <= 1
        `);
        
        if (sampleResult.rows.length > 0) {
            const row = sampleResult.rows[0];
            console.log('✅ Sample employee fetched:');
            console.log('   Employee ID:', row[0]);
            console.log('   Name:', [row[1], row[2]].filter(Boolean).join(' '));
            console.log('   Designation:', row[3]);
            console.log('   Department (FUNCTIONNAME):', row[4]);
            console.log('   Company (BUSINESS):', row[5]);
        }
        
        // Test 3: Search by employee ID
        console.log('\n🔄 Test 3: Testing employee lookup with a real ID...');
        const searchResult = await connection.execute(
            "SELECT EMPLOYEE_ID, FIRST_NAME, LAST_NAME FROM lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT WHERE ROWNUM <= 1"
        );
        
        if (searchResult.rows.length > 0) {
            const testId = searchResult.rows[0][0];
            console.log('   Using test ID:', testId);
            
            const lookupResult = await connection.execute(
                "SELECT EMPLOYEE_ID, FIRST_NAME, LAST_NAME FROM lmsautousr.employee_details@PUBLIC_SELECT_RPTDBUAT WHERE UPPER(EMPLOYEE_ID) = UPPER(:id)",
                { id: testId }
            );
            
            if (lookupResult.rows.length > 0) {
                console.log('✅ Employee lookup works!');
                console.log('   Found:', lookupResult.rows[0][0], '-', lookupResult.rows[0][1], lookupResult.rows[0][2]);
            }
        }
        
        console.log('\n✅ All tests completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. The RPTDBUAT connection is working correctly');
        console.log('   2. Schema lmsautousr is correct (not lmsautouser)');
        console.log('   3. You can now use RPTDBUAT as the employee data source');
        
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
