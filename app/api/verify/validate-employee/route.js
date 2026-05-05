import { NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import {
    findEmployeeById,
    isVerificationBlocked,
    incrementVerificationAttempt,
    resetVerificationAttempt,
    getBlockedMessage,
    findVerifierById
} from '@/lib/sql.data.service';
import { sendBlockNotificationEmail } from '@/lib/services/smtpEmailService';

/**
 * Validate that Employee ID and Name match before proceeding to next step
 * POST /api/verify/validate-employee
 * Body: { employeeId: string, name: string }
 */
export async function POST(request) {
    try {
        // Authenticate the verifier
        const token = extractTokenFromHeader(request);

        if (!token) {
            return NextResponse.json({
                success: false,
                message: 'Access token is required'
            }, { status: 401 });
        }

        // Verify token
        let decoded;
        try {
            decoded = verifyToken(token);

            if (decoded.role !== 'verifier') {
                return NextResponse.json({
                    success: false,
                    message: 'Verifier access required'
                }, { status: 403 });
            }
        } catch (tokenError) {
            return NextResponse.json({
                success: false,
                message: 'Invalid or expired token'
            }, { status: 401 });
        }

        const verifierId = decoded.id; // Get verifier ID from token

        // Parse request body
        const body = await request.json();
        const { employeeId, name, entityName } = body;

        console.log('🔍 Validating employee:', { employeeId, name, entityName, verifierId });

        // Validate required fields
        if (!employeeId || !name) {
            return NextResponse.json({
                success: false,
                message: 'Employee ID and Name are required'
            }, { status: 400 });
        }

        const normalizedEmployeeId = employeeId.toUpperCase().trim();
        const normalizedInputName = name.trim().toLowerCase();

        console.log('Normalized Employee ID:', normalizedEmployeeId);

        // 1. Check if blocked BEFORE querying database
        const isBlocked = await isVerificationBlocked(verifierId, normalizedEmployeeId);
        if (isBlocked) {
            return NextResponse.json({
                success: false,
                message: getBlockedMessage()
            }, { status: 403 });
        }

        // Find employee in MongoDB
        const employee = await findEmployeeById(normalizedEmployeeId);

        console.log('Employee record found:', !!employee);

        console.log('Employee details:', employee);

        if (!employee) {
            // Log failed attempt
            await incrementVerificationAttempt(verifierId, normalizedEmployeeId);

            return NextResponse.json({
                success: false,
                message: `Employee with ID "${employeeId}" not found in our records. Please verify the Employee ID.`
            }, { status: 404 });
        }

        // Check if name matches (case-insensitive)
        const employeeName = employee.name?.trim().toLowerCase() || '';

        console.log('Employee Name from DB:', employeeName);
        console.log('Normalized Input Name:', normalizedInputName);

        if (normalizedInputName !== employeeName) {
            // Log failed attempt
            const attemptResult = await incrementVerificationAttempt(verifierId, normalizedEmployeeId);

            // Check if they just got blocked
            if (attemptResult.justBlocked) {
                // Send email notification to admin
                try {
                    const verifier = await findVerifierById(verifierId);
                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                    await sendBlockNotificationEmail({
                        verifierCompanyName: verifier?.companyName || 'Unknown',
                        verifierEmail: verifier?.email || 'N/A',
                        employeeId: normalizedEmployeeId,
                        attemptCount: attemptResult.attemptCount
                    }, baseUrl);
                    console.log('[EMAIL] Block notification sent for verifier:', verifierId);
                } catch (emailError) {
                    console.error('[EMAIL] Failed to send block notification:', emailError);
                }

                return NextResponse.json({
                    success: false,
                    message: getBlockedMessage()
                }, { status: 403 });
            }

            return NextResponse.json({
                success: false,
                message: 'Employee ID and Name do not match. Please check the details and try again.'
            }, { status: 400 });
        }

        // Validate Entity/Company if provided (for BGV case)
        if (entityName) {
            const employeeEntity = employee.entityName;
            console.log('Employee Entity from DB:', employeeEntity);
            if (entityName !== employeeEntity) {
                // Should entity mismatch count as a failed attempt? 
                // Usually yes, to prevent fishing for correct entity.
                const attemptResult = await incrementVerificationAttempt(verifierId, normalizedEmployeeId);

                if (attemptResult.justBlocked) {
                    // Send email notification to admin
                    try {
                        const verifier = await findVerifierById(verifierId);
                        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                        await sendBlockNotificationEmail({
                            verifierCompanyName: verifier?.companyName || 'Unknown',
                            verifierEmail: verifier?.email || 'N/A',
                            employeeId: normalizedEmployeeId,
                            attemptCount: attemptResult.attemptCount
                        }, baseUrl);
                        console.log('[EMAIL] Block notification sent for verifier:', verifierId);
                    } catch (emailError) {
                        console.error('[EMAIL] Failed to send block notification:', emailError);
                    }

                    return NextResponse.json({
                        success: false,
                        message: getBlockedMessage()
                    }, { status: 403 });
                }

                return NextResponse.json({
                    success: false,
                    message: `Employee verification failed for the selected company. This employee does not belong to ${entityName}.`
                }, { status: 400 });
            }
        }

        // Success! Reset attempts
        await resetVerificationAttempt(verifierId, normalizedEmployeeId);

        // Both Employee ID and Name match - proceed to next step
        return NextResponse.json({
            success: true,
            message: 'Employee verified. Proceed to enter employment details.'
        }, { status: 200 });

    } catch (error) {
        console.error('Employee validation error:', error);

        return NextResponse.json({
            success: false,
            message: 'Validation failed. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}


