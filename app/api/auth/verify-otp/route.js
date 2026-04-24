import { NextResponse } from 'next/server';

/**
 * Verify OTP and login/register verifier
 * POST /api/auth/verify-otp
 * Body: { email: string, otp: string, companyName?: string }
 * 
 * STATUS: DISABLED
 * OTP login is currently disabled. Use password login instead.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { email, otp } = body;

        if (!email || !otp) {
            return NextResponse.json({
                success: false,
                message: 'Email and OTP are required'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: false,
            message: 'OTP login is currently disabled. Please use password login instead.'
        }, { status: 503 });

    } catch (error) {
        console.error('Verify OTP error:', error);

        return NextResponse.json({
            success: false,
            message: 'OTP login is currently disabled. Please use password login instead.'
        }, { status: 503 });
    }
}
