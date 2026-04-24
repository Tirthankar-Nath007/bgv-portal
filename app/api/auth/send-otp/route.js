import { NextResponse } from 'next/server';

/**
 * Send OTP to verifier email
 * POST /api/auth/send-otp
 * 
 * STATUS: DISABLED
 * OTP login is currently disabled. Use password login instead.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({
                success: false,
                message: 'Email is required'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: false,
            message: 'OTP login is currently disabled. Please use password login instead.'
        }, { status: 503 });

    } catch (error) {
        console.error('[OTP] Send OTP error:', error.message);

        return NextResponse.json({
            success: false,
            message: 'OTP login is currently disabled. Please use password login instead.'
        }, { status: 503 });
    }
}
