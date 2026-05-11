import { NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { getBlockedVerifiers, resetVerificationAttempt } from '@/lib/sql.data.service';

export async function GET(request) {
    try {
        const token = extractTokenFromHeader(request);
        if (!token) {
            return NextResponse.json({ success: false, message: 'Access token is required' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!['admin', 'hr_manager', 'super_admin'].includes(decoded.role)) {
            return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
        }

        const records = await getBlockedVerifiers();

        return NextResponse.json({
            success: true,
            message: 'Blocked verifiers retrieved successfully',
            data: { records }
        }, { status: 200 });

    } catch (error) {
        console.error('Blocked verifiers API error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch blocked verifiers',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const token = extractTokenFromHeader(request);
        if (!token) {
            return NextResponse.json({ success: false, message: 'Access token is required' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!['admin', 'hr_manager', 'super_admin'].includes(decoded.role)) {
            return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { verifierId, employeeId } = body;

        if (!verifierId || !employeeId) {
            return NextResponse.json({ success: false, message: 'verifierId and employeeId are required' }, { status: 400 });
        }

        const result = await resetVerificationAttempt(verifierId, employeeId);

        if (result) {
            return NextResponse.json({
                success: true,
                message: 'Verifier unblocked successfully'
            }, { status: 200 });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Failed to unblock verifier'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Unblock verifier API error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to unblock verifier',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
