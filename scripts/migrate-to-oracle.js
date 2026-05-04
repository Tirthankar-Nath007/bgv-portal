/**
 * Migration Script: Create Oracle Tables for BGV Portal
 * Run this script to create all required tables in Oracle Database
 * 
 * Usage: node scripts/migrate-to-oracle.js
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

const TABLES_SQL = [
    {
        name: 'BGV_EMPLOYEES',
        sql: `
            CREATE TABLE BGV_EMPLOYEES (
                id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                employee_id VARCHAR2(50) UNIQUE NOT NULL,
                name VARCHAR2(255) NOT NULL,
                email VARCHAR2(255),
                entity_name VARCHAR2(20) CHECK (entity_name IN ('TVSCSHIB', 'HIB')),
                date_of_joining DATE NOT NULL,
                date_of_leaving DATE NOT NULL,
                designation VARCHAR2(255) NOT NULL,
                exit_reason VARCHAR2(500) NOT NULL,
                fnf_status VARCHAR2(20) CHECK (fnf_status IN ('Completed', 'Pending')),
                department VARCHAR2(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `
    },
    {
        name: 'BGV_VERIFIERS',
        sql: `
            CREATE TABLE BGV_VERIFIERS (
                id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                email VARCHAR2(255) UNIQUE NOT NULL,
                password VARCHAR2(255) NOT NULL,
                company_name VARCHAR2(255) NOT NULL,
                is_email_verified NUMBER(1) DEFAULT 0,
                is_active NUMBER(1) DEFAULT 1,
                is_bgv_agency NUMBER(1) DEFAULT 0,
                test_mode NUMBER(1) DEFAULT 0,
                notifications CLOB,
                verification_requests CLOB,
                bypass_token VARCHAR2(255),
                last_login_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `
    },
    {
        name: 'BGV_ADMINS',
        sql: `
            CREATE TABLE BGV_ADMINS (
                id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                username VARCHAR2(100) UNIQUE NOT NULL,
                email VARCHAR2(255) UNIQUE NOT NULL,
                password VARCHAR2(255) NOT NULL,
                full_name VARCHAR2(255) NOT NULL,
                role VARCHAR2(50) CHECK (role IN ('super_admin', 'hr_manager', 'hr_staff')),
                department VARCHAR2(255) NOT NULL,
                permissions CLOB,
                is_active NUMBER(1) DEFAULT 1,
                test_mode NUMBER(1) DEFAULT 0,
                last_login_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `
    },
    {
        name: 'BGV_VERIFICATION_RECORDS',
        sql: `
            CREATE TABLE BGV_VERIFICATION_RECORDS (
                id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                verification_id VARCHAR2(50) UNIQUE NOT NULL,
                employee_id VARCHAR2(50) NOT NULL,
                verifier_id NUMBER NOT NULL,
                submitted_data CLOB NOT NULL,
                comparison_results CLOB,
                overall_status VARCHAR2(20) CHECK (overall_status IN ('matched', 'partial_match', 'mismatch')),
                match_score NUMBER(3,0),
                consent_given NUMBER(1) NOT NULL,
                pdf_report_url VARCHAR2(500),
                verification_completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_vr_verifier FOREIGN KEY (verifier_id) REFERENCES BGV_VERIFIERS(id)
            )
        `
    },
    {
        name: 'BGV_APPEALS',
        sql: `
            CREATE TABLE BGV_APPEALS (
                id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                appeal_id VARCHAR2(50) UNIQUE NOT NULL,
                verification_id NUMBER NOT NULL,
                verifier_id NUMBER NOT NULL,
                employee_id VARCHAR2(50) NOT NULL,
                appeal_reason CLOB NOT NULL,
                documents CLOB,
                mismatched_fields CLOB,
                status VARCHAR2(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
                hr_response CLOB,
                hr_comments CLOB,
                reviewed_by VARCHAR2(255),
                reviewed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_appeal_vr FOREIGN KEY (verification_id) REFERENCES BGV_VERIFICATION_RECORDS(id),
                CONSTRAINT fk_appeal_verifier FOREIGN KEY (verifier_id) REFERENCES BGV_VERIFIERS(id)
            )
        `
    },
    {
        name: 'BGV_VERIFICATION_ATTEMPTS',
        sql: `
            CREATE TABLE BGV_VERIFICATION_ATTEMPTS (
                id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                verifier_id NUMBER NOT NULL,
                employee_id NUMBER NOT NULL,
                attempt_count NUMBER(3) DEFAULT 0,
                is_blocked NUMBER(1) DEFAULT 0,
                blocked_at TIMESTAMP,
                last_attempt_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_va_verifier FOREIGN KEY (verifier_id) REFERENCES BGV_VERIFIERS(id),
                CONSTRAINT uk_va_verifier_employee UNIQUE (verifier_id, employee_id)
            )
        `
    },
    {
        name: 'BGV_ACCESS_LOGS',
        sql: `
            CREATE TABLE BGV_ACCESS_LOGS (
                id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                email VARCHAR2(255) NOT NULL,
                role VARCHAR2(20) CHECK (role IN ('admin', 'verifier', 'unknown')),
                action VARCHAR2(50) DEFAULT 'LOGIN',
                status VARCHAR2(20) NOT NULL,
                ip_address VARCHAR2(100),
                user_agent VARCHAR2(500),
                failure_reason VARCHAR2(255),
                metadata CLOB,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `
    },
    {
        name: 'BGV_EMAIL_LOGS',
        sql: `
            CREATE TABLE BGV_EMAIL_LOGS (
                id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                provider VARCHAR2(50),
                email_type VARCHAR2(50),
                recipient VARCHAR2(255) NOT NULL,
                subject VARCHAR2(500) NOT NULL,
                status VARCHAR2(20) NOT NULL,
                response_time NUMBER,
                message_id VARCHAR2(255),
                error CLOB,
                metadata CLOB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `
    }
];

const INDEXES_SQL = [
    {
        name: 'idx_emp_emp_id',
        sql: `CREATE UNIQUE INDEX idx_emp_emp_id ON BGV_EMPLOYEES(employee_id)`
    },
    {
        name: 'idx_ver_email',
        sql: `CREATE UNIQUE INDEX idx_ver_email ON BGV_VERIFIERS(email)`
    },
    {
        name: 'idx_adm_username',
        sql: `CREATE UNIQUE INDEX idx_adm_username ON BGV_ADMINS(username)`
    },
    {
        name: 'idx_vr_verification_id',
        sql: `CREATE UNIQUE INDEX idx_vr_verification_id ON BGV_VERIFICATION_RECORDS(verification_id)`
    },
    {
        name: 'idx_vr_verifier',
        sql: `CREATE INDEX idx_vr_verifier ON BGV_VERIFICATION_RECORDS(verifier_id)`
    },
    {
        name: 'idx_appeal_id',
        sql: `CREATE UNIQUE INDEX idx_appeal_id ON BGV_APPEALS(appeal_id)`
    },
    {
        name: 'idx_appeal_status',
        sql: `CREATE INDEX idx_appeal_status ON BGV_APPEALS(status)`
    },
    {
        name: 'idx_access_timestamp',
        sql: `CREATE INDEX idx_access_timestamp ON BGV_ACCESS_LOGS(timestamp)`
    }
];

async function dropTableIfExists(connection, tableName) {
    try {
        await connection.execute(`
            DECLARE
                v_count NUMBER;
            BEGIN
                SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = '${tableName}';
                IF v_count > 0 THEN
                    EXECUTE IMMEDIATE 'DROP TABLE ${tableName} CASCADE CONSTRAINTS PURGE';
                END IF;
            END;
        `);
        console.log(`  ✓ Dropped existing table: ${tableName}`);
    } catch (error) {
        if (error.message.includes('ORA-00942')) {
            console.log(`  - Table ${tableName} does not exist, skipping drop`);
        } else {
            console.log(`  ! Error dropping ${tableName}: ${error.message}`);
        }
    }
}

async function createTable(connection, table) {
    try {
        await connection.execute(table.sql);
        console.log(`  ✓ Created table: ${table.name}`);
        return true;
    } catch (error) {
        console.error(`  ✗ Error creating ${table.name}: ${error.message}`);
        return false;
    }
}

async function createIndex(connection, index) {
    try {
        await connection.execute(index.sql);
        console.log(`  ✓ Created index: ${index.name}`);
        return true;
    } catch (error) {
        if (error.message.includes('ORA-00955')) {
            console.log(`  - Index ${index.name} already exists`);
            return true;
        }
        console.error(`  ✗ Error creating index ${index.name}: ${error.message}`);
        return false;
    }
}

async function migrate() {
    let connection;

    console.log('\n===========================================');
    console.log('  BGV Portal - Oracle Migration Script');
    console.log('===========================================\n');

    try {
        console.log('🔄 Connecting to Oracle Database...');
        connection = await oracledb.getConnection(ORACLE_CONFIG);
        console.log('✅ Connected successfully\n');

        console.log('📦 Step 1: Dropping existing tables...');
        for (const table of TABLES_SQL) {
            await dropTableIfExists(connection, table.name);
        }
        await connection.commit();

        console.log('\n📦 Step 2: Creating tables...');
        for (const table of TABLES_SQL) {
            await createTable(connection, table);
        }
        await connection.commit();

        console.log('\n📦 Step 3: Creating indexes...');
        for (const index of INDEXES_SQL) {
            await createIndex(connection, index);
        }
        await connection.commit();

        console.log('\n===========================================');
        console.log('  ✅ Migration completed successfully!');
        console.log('===========================================\n');

        console.log('Created tables:');
        for (const table of TABLES_SQL) {
            console.log(`  • ${table.name}`);
        }

        console.log('\nCreated indexes:');
        for (const index of INDEXES_SQL) {
            console.log(`  • ${index.name}`);
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('\n🔌 Database connection closed');
            } catch (error) {
                console.error('Error closing connection:', error.message);
            }
        }
    }
}

migrate()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
