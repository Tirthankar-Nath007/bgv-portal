import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { addAdmin, findAdminByUsername } from '@/lib/sql.data.service';

export async function POST(request) {
    try {
        const token = extractTokenFromHeader(request);
        if (!token) {
            return NextResponse.json({ success: false, message: 'Access token is required' }, { status: 401 });
        }

        const decoded = verifyToken(token);

        const permissions = decoded.role === 'super_admin'
            ? ['view_appeals', 'manage_appeals', 'view_employees', 'manage_employees', 'send_emails', 'view_reports', 'manage_admins']
            : (decoded.permissions || []);

        if (!permissions.includes('manage_admins')) {
            return NextResponse.json({ success: false, message: 'Insufficient permissions to manage admins' }, { status: 403 });
        }

        const body = await request.json();
        const { username, email, password, fullName, role, department } = body;

        if (!username || !email || !password || !fullName || !role || !department) {
            return NextResponse.json({ success: false, message: 'All fields are required: username, email, password, fullName, role, department' }, { status: 400 });
        }

        const validRoles = ['super_admin', 'hr_manager'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
        }

        const existing = await findAdminByUsername(username);
        if (existing) {
            return NextResponse.json({ success: false, message: 'Username already exists' }, { status: 409 });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        await addAdmin({
            username,
            email,
            password: hashedPassword,
            fullName,
            role,
            department,
            permissions: []
        });

        return NextResponse.json({
            success: true,
            message: 'Admin created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('Admin registration error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to create admin',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
