/**
 * MongoDB Database Seeding Script
 * Migrates employee data and creates fresh admin accounts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models
import Employee from '../lib/models/Employee.js';
import Admin from '../lib/models/Admin.js';
import Verifier from '../lib/models/Verifier.js';
import VerificationRecord from '../lib/models/VerificationRecord.js';
import Appeal from '../lib/models/Appeal.js';

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
}

// Employee data to preserve (from existing database.json)
const employeesData = [
    {
        employeeId: '6002056',
        name: 'S Sathish',
        email: 'sathish.s@company.com',
        entityName: 'TVSCSHIB',
        dateOfJoining: new Date('2021-02-05'),
        dateOfLeaving: new Date('2024-03-31'),
        designation: 'Executive',
        exitReason: 'Resigned',
        fnfStatus: 'Completed',
        department: 'HRD',
    },
    {
        employeeId: '6002057',
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@company.com',
        entityName: 'TVSCSHIB',
        dateOfJoining: new Date('2020-03-15'),
        dateOfLeaving: new Date('2024-01-20'),
        designation: 'Assistant Manager',
        exitReason: 'Resigned',
        fnfStatus: 'Completed',
        department: 'Technology',
    },
    {
        employeeId: '6002058',
        name: 'Priya Sharma',
        email: 'priya.sharma@company.com',
        entityName: 'HIB',
        dateOfJoining: new Date('2019-07-10'),
        dateOfLeaving: new Date('2023-12-15'),
        designation: 'Manager',
        exitReason: 'Resigned',
        fnfStatus: 'Pending',
        department: 'Finance',
    },
];

// Admin accounts with default credentials
const adminsData = [
    {
        username: 'admin',
        email: 'admin@company.com',
        password: 'admin123', // Will be hashed
        fullName: 'System Administrator',
        role: 'super_admin',
        department: 'IT',
        permissions: [
            'view_appeals',
            'manage_appeals',
            'view_employees',
            'manage_employees',
            'send_emails',
            'view_reports',
            'manage_admins',
        ],
        isActive: true,
    },
    {
        username: 'hr_manager',
        email: 'hr@company.com',
        password: 'hr123', // Will be hashed
        fullName: 'HR Manager',
        role: 'hr_manager',
        department: 'Human Resources',
        permissions: [
            'view_appeals',
            'manage_appeals',
            'view_employees',
            'send_emails',
            'view_reports',
        ],
        isActive: true,
    },
];

async function seedDatabase() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully\n');

        // Clear existing data
        console.log('🗑️  Clearing existing collections...');
        await Employee.deleteMany({});
        await Admin.deleteMany({});
        await Verifier.deleteMany({});
        await VerificationRecord.deleteMany({});
        await Appeal.deleteMany({});
        console.log('✅ Collections cleared\n');

        // Seed Employees
        console.log('👥 Seeding employees...');
        const employees = await Employee.insertMany(employeesData);
        console.log(`✅ Created ${employees.length} employees:`);
        employees.forEach(emp => {
            console.log(`   - ${emp.name} (${emp.employeeId}) - ${emp.designation}`);
        });
        console.log('');

        // Seed Admins with hashed passwords
        console.log('🔑 Seeding admin accounts...');
        for (const adminData of adminsData) {
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            const admin = await Admin.create({
                ...adminData,
                password: hashedPassword,
            });
            console.log(`✅ Created admin: ${admin.username} (password: ${adminData.password})`);
        }
        console.log('');

        // Summary
        console.log('📊 Database seeding summary:');
        console.log(`   Employees: ${await Employee.countDocuments()}`);
        console.log(`   Admins: ${await Admin.countDocuments()}`);
        console.log(`   Verifiers: ${await Verifier.countDocuments()}`);
        console.log(`   Verification Records: ${await VerificationRecord.countDocuments()}`);
        console.log(`   Appeals: ${await Appeal.countDocuments()}\n`);

        console.log('🎉 Database seeding completed successfully!\n');
        console.log('📝 Login credentials:');
        console.log('   Admin: username=admin, password=admin123');
        console.log('   HR Manager: username=hr_manager, password=hr123\n');

        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run the seeding
seedDatabase();
