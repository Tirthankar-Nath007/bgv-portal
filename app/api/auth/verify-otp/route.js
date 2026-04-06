import { NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/services/otp.service';
import { generateToken } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import Verifier from '@/lib/models/Verifier';
import { logAccess } from '@/lib/mongodb.data.service';

/**
 * Verify OTP and login/register verifier
 * POST /api/auth/verify-otp
 * Body: { email: string, otp: string, companyName?: string }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { email, otp, companyName } = body;

        // Validate required fields
        if (!email || !otp) {
            return NextResponse.json({
                success: false,
                message: 'Email and OTP are required'
            }, { status: 400 });
        }

        // Verify OTP
        const verifyResult = await verifyOTP(email, otp);
        if (!verifyResult.success) {
            // Log failure (Invalid OTP)
            await logAccess({
                email: email.toLowerCase(),
                role: 'verifier',
                action: 'LOGIN_OTP',
                status: 'FAILURE',
                failureReason: 'Invalid OTP',
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown'
            });

            return NextResponse.json({
                success: false,
                message: verifyResult.message
            }, { status: 400 });
        }

        // Connect to database
        await connectDB();

        // Check if verifier exists
        let verifier = await Verifier.findOne({ email: email.toLowerCase() });

        if (!verifier) {
            // Auto-register new verifier
            const emailDomain = email.split('@')[1];
            const defaultCompanyName = companyName || emailDomain.split('.')[0].toUpperCase();

            verifier = new Verifier({
                email: email.toLowerCase(),
                companyName: defaultCompanyName,
                isActive: true,
                createdAt: new Date(),
                lastLogin: new Date()
            });

            await verifier.save();
        } else {
            // Update last login
            verifier.lastLogin = new Date();
            await verifier.save();
        }

        // Log success
        await logAccess({
            email: verifier.email,
            role: 'verifier',
            action: 'LOGIN_OTP',
            status: 'SUCCESS',
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            metadata: {
                companyName: verifier.companyName,
                isNewUser: !verifier.lastLoginAt // Rough check if new user
            }
        });

        // Generate JWT token
        const token = generateToken({
            id: verifier._id.toString(),
            email: verifier.email,
            companyName: verifier.companyName,
            role: 'verifier'
        });

        return NextResponse.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                verifier: {
                    id: verifier._id.toString(),
                    email: verifier.email,
                    companyName: verifier.companyName
                }
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Verify OTP error:', error);

        return NextResponse.json({
            success: false,
            message: 'Verification failed. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
