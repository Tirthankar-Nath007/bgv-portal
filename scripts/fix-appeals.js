import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING
};

async function main() {
    const conn = await oracledb.getConnection(config);
    
    // Update test appeals with proper text
    await conn.execute(`UPDATE BGV_APPEALS SET 
        appeal_reason = 'Previous employment verification shows different tenure - requesting review',
        hr_response = NULL,
        hr_comments = NULL,
        status = 'pending',
        reviewed_by = NULL,
        reviewed_at = NULL
    WHERE appeal_id IN ('APP000005', 'APP000006')`, [], { autoCommit: true });
    
    console.log('Fixed appeals data');
    
    await conn.close();
    process.exit(0);
}

main();