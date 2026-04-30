import { NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import {
  findVerificationRecord,
  updateVerificationRecord,
  findEmployeeByNumericId
} from '@/lib/sql.data.service';
import { generateVerificationReportPDF } from '@/lib/services/pdfService';

export async function POST(request) {
  try {
    const token = extractTokenFromHeader(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Access token is required'
      }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== 'verifier') {
      return NextResponse.json({
        success: false,
        message: 'Verifier access required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { verificationId, sendEmail = false } = body;

    if (!verificationId) {
      return NextResponse.json({
        success: false,
        message: 'Verification ID is required'
      }, { status: 400 });
    }

    const verificationRecord = await findVerificationRecord(verificationId);

    if (!verificationRecord || parseInt(verificationRecord.verifierId) !== parseInt(decoded.id)) {
      return NextResponse.json({
        success: false,
        message: 'Verification record not found or you do not have permission'
      }, { status: 404 });
    }

    const employee = await findEmployeeByNumericId(verificationRecord.employeeId);
    if (!employee) {
      return NextResponse.json({
        success: false,
        message: 'Employee record not found'
      }, { status: 404 });
    }

    // Check if PDF already exists - generate fresh on-the-fly instead of returning stored
    // Note: pdfReportUrl column is kept in DB but not used for storage
    
    const verificationData = {
      verificationId: verificationRecord.verificationId,
      verifiedAt: verificationRecord.verificationCompletedAt,
      verifierName: decoded.companyName,
      overallStatus: verificationRecord.overallStatus,
      matchScore: verificationRecord.matchScore,
      comparisonResults: verificationRecord.comparisonResults.map(result => ({
        field: result.field,
        label: getFieldLabel(result.field),
        verifierValue: result.verifierValue,
        companyValue: result.companyValue,
        isMatch: result.isMatch
      })),
      summary: generateComparisonSummary(verificationRecord.comparisonResults)
    };

    const employeeData = {
      employeeId: employee.employeeId,
      name: employee.name,
      entityName: employee.entityName,
      department: employee.department,
      dateOfJoining: employee.dateOfJoining,
      dateOfLeaving: employee.dateOfLeaving,
      designation: employee.designation,
      exitReason: employee.exitReason,
      fnfStatus: employee.fnfStatus
    };

    // Generate PDF (returns buffer)
    const pdfResult = await generateVerificationReportPDF(verificationData, employeeData);

    // Note: Not storing PDF in DB anymore - generating on-the-fly
    // pdf_report_url column is kept for future reference but not used

    // EMAIL NOTIFICATION DISABLED - Uncomment when email provider is configured
    // TODO: Uncomment when email service is ready
    // if (sendEmail) {
    //   try {
    //     await sendVerificationReportEmail(
    //       { verificationId, employeeData, comparisonResults: verificationData.comparisonResults, overallStatus, matchScore, summary },
    //       decoded.email,
    //       pdfResult.buffer
    //     );
    //   } catch (emailError) {
    //     console.error('Failed to send verification report email:', emailError);
    //   }
    // }
    if (sendEmail) {
      console.log('[EMAIL] Would send verification report to:', decoded.email);
    }

    // Return PDF as downloadable file
    const pdfBuffer = Buffer.from(pdfResult.buffer);
    
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfResult.filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);

    return NextResponse.json({
      success: false,
      message: 'Failed to generate PDF report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const token = extractTokenFromHeader(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Access token is required'
      }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== 'verifier') {
      return NextResponse.json({
        success: false,
        message: 'Verifier access required'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const verificationId = searchParams.get('verificationId');

    if (!verificationId) {
      return NextResponse.json({
        success: false,
        message: 'Verification ID parameter is required'
      }, { status: 400 });
    }

    const verificationRecord = await findVerificationRecord(verificationId);

    if (!verificationRecord || parseInt(verificationRecord.verifierId) !== parseInt(decoded.id)) {
      return NextResponse.json({
        success: false,
        message: 'Verification record not found'
      }, { status: 404 });
    }

    // Generate PDF on-the-fly from existing DB data
    const employee = await findEmployeeByNumericId(verificationRecord.employeeId);
    
    const verificationData = {
      verificationId: verificationRecord.verificationId,
      verifiedAt: verificationRecord.verificationCompletedAt,
      verifierName: decoded.companyName,
      overallStatus: verificationRecord.overallStatus,
      matchScore: verificationRecord.matchScore,
      comparisonResults: verificationRecord.comparisonResults.map(result => ({
        field: result.field,
        label: getFieldLabel(result.field),
        verifierValue: result.verifierValue,
        companyValue: result.companyValue,
        isMatch: result.isMatch
      })),
      summary: generateComparisonSummary(verificationRecord.comparisonResults)
    };

    const employeeData = employee ? {
      employeeId: employee.employeeId,
      name: employee.name,
      entityName: employee.entityName,
      department: employee.department,
      dateOfJoining: employee.dateOfJoining,
      dateOfLeaving: employee.dateOfLeaving,
      designation: employee.designation,
      exitReason: employee.exitReason,
      fnfStatus: employee.fnfStatus
    } : {};

    const pdfResult = await generateVerificationReportPDF(verificationData, employeeData);

    // Return PDF as downloadable file
    const pdfBuffer = Buffer.from(pdfResult.buffer);
    
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfResult.filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Get PDF report error:', error);

    return NextResponse.json({
      success: false,
      message: 'Failed to generate PDF report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

function getFieldLabel(fieldName) {
  const labels = {
    employeeId: 'Employee ID',
    name: 'Full Name',
    entityName: 'Entity Name',
    dateOfJoining: 'Date of Joining',
    dateOfLeaving: 'Date of Leaving',
    designation: 'Designation',
    exitReason: 'Exit Reason'
  };
  return labels[fieldName] || fieldName;
}

function generateComparisonSummary(comparisonResults) {
  const matches = comparisonResults.filter(r => r.isMatch).length;
  const total = comparisonResults.length;
  const score = Math.round((matches / total) * 100);

  if (score === 100) {
    return 'Perfect Match - All fields match our records';
  } else if (score >= 70) {
    return `Partial Match - ${matches} of ${total} fields match`;
  } else {
    return `Significant Mismatch - Only ${matches} of ${total} fields match`;
  }
}
