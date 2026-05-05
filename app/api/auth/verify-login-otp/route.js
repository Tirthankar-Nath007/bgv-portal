import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { findVerifierByEmail, updateVerifier, logAccess } from '@/lib/sql.data.service';

// Hardcoded OTP for placeholder - will be replaced with actual OTP service
const PLACEHOLDER_OTP = "12345";

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

    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 OTP verification attempt for:', email.toLowerCase());
    }

    const verifier = await findVerifierByEmail(email.toLowerCase());

    if (!verifier) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request. Please login again.'
      }, { status: 401 });
    }

    // Check if account is active
    if (!verifier.isActive) {
      return NextResponse.json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      }, { status: 403 });
    }

    // Verify OTP (hardcoded placeholder)
    if (otp !== PLACEHOLDER_OTP) {
      await logAccess({
        email: verifier.email,
        role: 'verifier',
        action: 'LOGIN_OTP',
        status: 'FAILURE',
        failureReason: 'Invalid OTP',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      return NextResponse.json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      }, { status: 401 });
    }

    // Update last login time
    const updatedVerifier = await updateVerifier(verifier._id.toString(), {
      lastLoginAt: new Date()
    });

    // Log success
    await logAccess({
      email: verifier.email,
      role: 'verifier',
      action: 'LOGIN_OTP',
      status: 'SUCCESS',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        companyName: verifier.companyName
      }
    });

    // Generate JWT token - 10 minutes for verifiers
    const token = generateToken({
      id: verifier._id.toString(),
      email: verifier.email,
      companyName: verifier.companyName,
      role: 'verifier'
    }, '10m');

    // Return response without sensitive data
    const verifierResponse = {
      id: verifier._id.toString(),
      companyName: verifier.companyName,
      email: verifier.email,
      isEmailVerified: verifier.isEmailVerified,
      lastLoginAt: updatedVerifier?.lastLoginAt || verifier.lastLoginAt,
      createdAt: verifier.createdAt
    };

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        verifier: verifierResponse,
        token
      }
    }, { status: 200 });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('OTP verification error:', error);
    }

    return NextResponse.json({
      success: false,
      message: 'OTP verification failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed'
  }, { status: 405 });
}
