/**
 * Seed Script: Populate Oracle Database with Initial Data
 * Run this script after migrate-to-oracle.js to seed the database
 * 
 * Usage: node scripts/seed-oracle.js
 */

import oracledb from 'oracledb';
import bcrypt from 'bcryptjs';
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

const BCRYPT_SALT_ROUNDS = 12;

const SEED_DATA = {
    admins: [
        {
            username: 'admin',
            email: 'admin@bgvportal.com',
            password: 'admin123',
            fullName: 'System Administrator',
            role: 'super_admin',
            department: 'IT'
        }
    ],
    verifiers: [
        {
            email: 'hr@tvscs.com',
            password: 'verifier123',
            companyName: 'TVSCS HR Department',
            isBgvAgency: false
        },
        {
            email: 'bgv@credibility.in',
            password: 'bgv123',
            companyName: 'Credibility BGV Agency',
            isBgvAgency: true
        },
        {
            email: 'hr@hib.com',
            password: 'hib123',
            companyName: 'HIB Corporation',
            isBgvAgency: false
        }
    ],
    employees: [
        {
            employeeId: 'EMP001',
            name: 'Rajesh Kumar',
            email: 'rajesh.kumar@email.com',
            entityName: 'TVSCSHIB',
            dateOfJoining: new Date('2018-03-15'),
            dateOfLeaving: new Date('2024-06-30'),
            designation: 'Senior Software Engineer',
            exitReason: 'Resigned - Better Opportunity',
            fnfStatus: 'Completed',
            department: 'Engineering'
        },
        {
            employeeId: 'EMP002',
            name: 'Priya Sharma',
            email: 'priya.sharma@email.com',
            entityName: 'TVSCSHIB',
            dateOfJoining: new Date('2019-07-01'),
            dateOfLeaving: new Date('2024-09-15'),
            designation: 'Marketing Manager',
            exitReason: 'Resigned - Personal Reasons',
            fnfStatus: 'Pending',
            department: 'Marketing'
        },
        {
            employeeId: 'EMP003',
            name: 'Amit Patel',
            email: 'amit.patel@email.com',
            entityName: 'HIB',
            dateOfJoining: new Date('2017-01-10'),
            dateOfLeaving: new Date('2024-03-20'),
            designation: 'Finance Manager',
            exitReason: 'Retired',
            fnfStatus: 'Completed',
            department: 'Finance'
        },
        {
            employeeId: 'EMP004',
            name: 'Sneha Reddy',
            email: 'sneha.reddy@email.com',
            entityName: 'TVSCSHIB',
            dateOfJoining: new Date('2020-02-14'),
            dateOfLeaving: new Date('2024-08-01'),
            designation: 'HR Executive',
            exitReason: 'Resigned - Career Growth',
            fnfStatus: 'Completed',
            department: 'Human Resources'
        },
        {
            employeeId: 'EMP005',
            name: 'Vikram Singh',
            email: 'vikram.singh@email.com',
            entityName: 'HIB',
            dateOfJoining: new Date('2016-05-23'),
            dateOfLeaving: new Date('2024-11-30'),
            designation: 'Operations Lead',
            exitReason: 'Terminated',
            fnfStatus: 'Pending',
            department: 'Operations'
        },
        {
            employeeId: 'EMP006',
            name: 'Anita Desai',
            email: 'anita.desai@email.com',
            entityName: 'TVSCSHIB',
            dateOfJoining: new Date('2019-09-01'),
            dateOfLeaving: new Date('2025-01-15'),
            designation: 'Business Analyst',
            exitReason: 'Resigned - Higher Studies',
            fnfStatus: 'Completed',
            department: 'Business'
        },
        {
            employeeId: 'EMP007',
            name: 'Mohammed Ali',
            email: 'mohammed.ali@email.com',
            entityName: 'HIB',
            dateOfJoining: new Date('2018-11-05'),
            dateOfLeaving: new Date('2024-05-10'),
            designation: 'Sales Executive',
            exitReason: 'Resigned - Better Opportunity',
            fnfStatus: 'Completed',
            department: 'Sales'
        },
        {
            employeeId: 'EMP008',
            name: 'Kavitha Nair',
            email: 'kavitha.nair@email.com',
            entityName: 'TVSCSHIB',
            dateOfJoining: new Date('2021-03-20'),
            dateOfLeaving: new Date('2024-12-01'),
            designation: 'Quality Analyst',
            exitReason: 'Resigned - Family Relocation',
            fnfStatus: 'Pending',
            department: 'Quality'
        },
        {
            employeeId: 'EMP009',
            name: 'Deepak Gupta',
            email: 'deepak.gupta@email.com',
            entityName: 'HIB',
            dateOfJoining: new Date('2015-08-12'),
            dateOfLeaving: new Date('2024-07-31'),
            designation: 'Technical Architect',
            exitReason: 'Resigned - Entrepreneurial Venture',
            fnfStatus: 'Completed',
            department: 'Engineering'
        },
        {
            employeeId: 'EMP010',
            name: 'Lakshmi Menon',
            email: 'lakshmi.menon@email.com',
            entityName: 'TVSCSHIB',
            dateOfJoining: new Date('2022-01-03'),
            dateOfLeaving: new Date('2025-02-28'),
            designation: 'Content Writer',
            exitReason: 'Resigned - Personal Reasons',
            fnfStatus: 'Pending',
            department: 'Content'
        }
    ]
};

async function seedDatabase() {
    let connection;

    console.log('\n===========================================');
    console.log('  BGV Portal - Database Seeding Script');
    console.log('===========================================\n');

    try {
        console.log('🔄 Connecting to Oracle Database...');
        connection = await oracledb.getConnection(ORACLE_CONFIG);
        console.log('✅ Connected successfully\n');

        // Seed Admins
        console.log('👤 Step 1: Seeding Admins...');
        for (const admin of SEED_DATA.admins) {
            const hashedPassword = await bcrypt.hash(admin.password, BCRYPT_SALT_ROUNDS);
            try {
                await connection.execute(`
                    INSERT INTO BGV_ADMINS (
                        username, email, password, full_name, role, department, permissions, is_active
                    ) VALUES (
                        :username, :email, :password, :full_name, :role, :department, :permissions, 1
                    )
                `, {
                    username: admin.username,
                    email: admin.email,
                    password: hashedPassword,
                    full_name: admin.fullName,
                    role: admin.role,
                    department: admin.department,
                    permissions: JSON.stringify([])
                });
                console.log(`  ✓ Created admin: ${admin.username} (password: ${admin.password})`);
            } catch (error) {
                if (error.message.includes('ORA-00001')) {
                    console.log(`  - Admin ${admin.username} already exists, skipping`);
                } else {
                    throw error;
                }
            }
        }

        // Seed Verifiers
        console.log('\n👥 Step 2: Seeding Verifiers...');
        for (const verifier of SEED_DATA.verifiers) {
            const hashedPassword = await bcrypt.hash(verifier.password, BCRYPT_SALT_ROUNDS);
            try {
                await connection.execute(`
                    INSERT INTO BGV_VERIFIERS (
                        email, password, company_name, is_bgv_agency, is_active, notifications, verification_requests
                    ) VALUES (
                        :email, :password, :company_name, :is_bgv_agency, 1, :notifications, :verification_requests
                    )
                `, {
                    email: verifier.email,
                    password: hashedPassword,
                    company_name: verifier.companyName,
                    is_bgv_agency: verifier.isBgvAgency ? 1 : 0,
                    notifications: JSON.stringify([]),
                    verification_requests: JSON.stringify([])
                });
                console.log(`  ✓ Created verifier: ${verifier.email} (password: ${verifier.password})`);
            } catch (error) {
                if (error.message.includes('ORA-00001')) {
                    console.log(`  - Verifier ${verifier.email} already exists, skipping`);
                } else {
                    throw error;
                }
            }
        }

        // Seed Employees
        console.log('\n👔 Step 3: Seeding Employees...');
        for (const employee of SEED_DATA.employees) {
            try {
                await connection.execute(`
                    INSERT INTO BGV_EMPLOYEES (
                        employee_id, name, email, entity_name, date_of_joining, date_of_leaving,
                        designation, exit_reason, fnf_status, department
                    ) VALUES (
                        :employee_id, :name, :email, :entity_name, TO_DATE(:date_of_joining, 'YYYY-MM-DD'),
                        TO_DATE(:date_of_leaving, 'YYYY-MM-DD'), :designation, :exit_reason, :fnf_status, :department
                    )
                `, {
                    employee_id: employee.employeeId,
                    name: employee.name,
                    email: employee.email,
                    entity_name: employee.entityName,
                    date_of_joining: employee.dateOfJoining.toISOString().split('T')[0],
                    date_of_leaving: employee.dateOfLeaving.toISOString().split('T')[0],
                    designation: employee.designation,
                    exit_reason: employee.exitReason,
                    fnf_status: employee.fnfStatus,
                    department: employee.department
                });
                console.log(`  ✓ Created employee: ${employee.employeeId} - ${employee.name}`);
            } catch (error) {
                if (error.message.includes('ORA-00001')) {
                    console.log(`  - Employee ${employee.employeeId} already exists, skipping`);
                } else {
                    throw error;
                }
            }
        }

        await connection.commit();

        console.log('\n===========================================');
        console.log('  ✅ Seeding completed successfully!');
        console.log('===========================================\n');

        console.log('📋 Credentials Summary:');
        console.log('\n  ADMIN LOGIN:');
        console.log('    Username: admin');
        console.log('    Password: admin123');
        console.log('    URL: /admin/login');

        console.log('\n  VERIFIER LOGINS:');
        for (const verifier of SEED_DATA.verifiers) {
            console.log(`    Email: ${verifier.email}`);
            console.log(`    Password: ${verifier.password}`);
            console.log('');
        }

        console.log('  TEST EMPLOYEE IDs:');
        for (const emp of SEED_DATA.employees.slice(0, 3)) {
            console.log(`    ${emp.employeeId} - ${emp.name} (${emp.entityName})`);
        }
        console.log('');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        if (connection) {
            await connection.rollback();
        }
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('🔌 Database connection closed');
            } catch (error) {
                console.error('Error closing connection:', error.message);
            }
        }
    }
}

seedDatabase()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
