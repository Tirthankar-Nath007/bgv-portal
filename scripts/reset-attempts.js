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

async function resetAttempts() {
    let connection;
    try {
        console.log('🔄 Connecting to Oracle...');
        connection = await oracledb.getConnection(ORACLE_CONFIG);
        console.log('✅ Connected!');
        
        // Reset all verification attempts for verifier ID 1
        const result = await connection.execute(`
            UPDATE BGV_VERIFICATION_ATTEMPTS 
            SET attempt_count = 0, is_blocked = 0, blocked_at = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE verifier_id = 1
        `, [], { autoCommit: true });
        
        console.log('✅ Reset verification attempts for verifier ID 1');
        console.log('   Rows affected:', result.rowsAffected);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.close();
            console.log('🔄 Connection closed');
        }
    }
    
    process.exit(0);
}

resetAttempts();
