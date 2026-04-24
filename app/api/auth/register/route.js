import { NextResponse } from 'next/server';
import { schemas } from '@/lib/validation';
import { generateToken } from '@/lib/auth';
import { findVerifierByEmail, addVerifier } from '@/lib/sql.data.service';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { error, value } = schemas.verifierRegistration.validate(body);

    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => ({ field: d.path[0], message: d.message }))
      }, { status: 400 });
    }

    const { companyName, email, password, isBgvAgency } = value;

    // Check if verifier already exists
    const existingVerifier = await findVerifierByEmail(email.toLowerCase());
    if (existingVerifier) {
      return NextResponse.json({
        success: false,
        message: 'An account with this email already exists'
      }, { status: 409 });
    }

    // Hash password before storing
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new verifier
    const newVerifier = await addVerifier({
      companyName,
      email: email.toLowerCase(),
      password: hashedPassword,
      isEmailVerified: true, // Auto-verify for demo purposes
      isActive: true,
      isBgvAgency: isBgvAgency || false
    });

    // Convert Mongoose document to plain object
    const verifierObj = newVerifier.toObject ? newVerifier.toObject() : newVerifier;

    // Debug: Log the created verifier
    console.log('✅ New verifier created:', {
      id: verifierObj._id.toString(),
      email: verifierObj.email,
      companyName: verifierObj.companyName
    });

    // Verify the verifier was actually saved
    const savedVerifier = await findVerifierByEmail(email.toLowerCase());
    console.log('🔍 Verification check - Saved verifier found:', savedVerifier ? 'YES' : 'NO');
    if (savedVerifier) {
      console.log('Saved verifier details:', {
        id: savedVerifier._id.toString(),
        email: savedVerifier.email,
        hasPassword: !!savedVerifier.password
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: verifierObj._id.toString(),
      email: verifierObj.email,
      companyName: verifierObj.companyName,
      role: 'verifier',
      isBgvAgency: verifierObj.isBgvAgency || false
    });

    // Return response without sensitive data
    const verifierResponse = {
      id: verifierObj._id.toString(),
      companyName: verifierObj.companyName,
      email: verifierObj.email,
      isBgvAgency: verifierObj.isBgvAgency,
      isEmailVerified: verifierObj.isEmailVerified,
      createdAt: verifierObj.createdAt
    };

    // EMAIL NOTIFICATION DISABLED - Uncomment when email provider is configured
    // TODO: Uncomment when email service is ready
    // try {
    //   const { sendWelcomeEmail } = await import('@/lib/services/emailService');
    //   await sendWelcomeEmail(verifierObj);
    // } catch (emailError) {
    //   console.log('Welcome email not sent (email service not configured):', emailError.message);
    // }
    console.log('[EMAIL] Would send welcome email to:', verifierObj.email);

    return NextResponse.json({
      success: true,
      message: 'Verifier registered successfully!',
      data: {
        verifier: verifierResponse,
        token
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);

    return NextResponse.json({
      success: false,
      message: 'Registration failed. Please try again.',
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