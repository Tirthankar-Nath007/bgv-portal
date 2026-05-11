import { NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import {
  findVerificationRecord,
  addAppeal,
  getAppeals,
  findVerifierById,
  generateSequentialId,
  getVerifiersByIds,
  getVerificationRecordsByIds,
} from '@/lib/sql.data.service';
import { findEmployeeById as findEmployeeByIdService } from '@/lib/services/employeeDataService';
import { sendAppealNotificationEmail } from '@/lib/services/smtpEmailService';

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

    const formData = await request.formData();

    const verificationId = formData.get('verificationId');
    const comments = formData.get('comments');

    if (!verificationId || !comments) {
      return NextResponse.json({
        success: false,
        message: 'Verification ID and comments are required'
      }, { status: 400 });
    }

    const verificationRecord = await findVerificationRecord(verificationId);
    if (!verificationRecord || parseInt(verificationRecord.verifierId) !== parseInt(decoded.id)) {
      return NextResponse.json({
        success: false,
        message: 'Verification record not found or you do not have permission to appeal this verification'
      }, { status: 404 });
    }

    const mismatchedFields = (verificationRecord.comparisonResults || [])
      .filter(result => !result.isMatch)
      .map(result => ({
        fieldName: result.field,
        verifierValue: result.verifierValue,
        companyValue: result.companyValue
      }));

    // FILE UPLOAD DISABLED - Supporting documents upload is currently not available
    // TODO: Enable when blob storage is configured
    let uploadedFileUrl = null;
    /*
    const supportingDocument = formData.get('supportingDocument');
    console.log('[APPEAL] File upload check:', {
      hasFile: !!supportingDocument,
      fileSize: supportingDocument?.size || 0,
      fileName: supportingDocument?.name || 'none'
    });

    if (supportingDocument && supportingDocument.size > 0) {
      try {
        console.log('[APPEAL] Starting file upload to Vercel Blob...');
        const uploadResult = await uploadFileToS3(supportingDocument, `appeals/${verificationRecord.employeeId}`);
        uploadedFileUrl = uploadResult.s3Url;
        console.log('[APPEAL] ✅ File uploaded successfully:', uploadedFileUrl);
      } catch (uploadError) {
        console.error('[APPEAL] ❌ File upload error:', uploadError.message);
        console.error('[APPEAL] Full error:', uploadError);
      }
    } else {
      console.log('[APPEAL] No file provided or file is empty');
    }
    */

    const appealId = await generateSequentialId('APP');

    const appeal = await addAppeal({
      appealId,
      verificationId: verificationRecord.id,  // Use numeric verification ID
      employeeId: verificationRecord.employeeId,  // String ID from RPTDBUAT
      verifierId: parseInt(decoded.id),
      appealReason: comments.trim(),
      documents: uploadedFileUrl ? [uploadedFileUrl] : [],
      status: 'pending',
      mismatchedFields: mismatchedFields
    });

    // Fetch verifier info for email notification
    const verifier = await findVerifierById(parseInt(decoded.id));

    // Send email notification to admin
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      await sendAppealNotificationEmail(appeal, verifier, baseUrl);
      console.log('[EMAIL] Appeal notification sent for:', appeal.appealId);
    } catch (emailError) {
      console.error('[EMAIL] Failed to send appeal notification:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Appeal submitted successfully. We will review your case and respond shortly.',
      data: {
        appealId: appeal.appealId,
        verificationId: appeal.verificationId,
        employeeId: appeal.employeeId,
        status: appeal.status,
        submittedAt: appeal.createdAt,
        mismatchedFields: mismatchedFields.length,
        hasSupportingDocument: !!uploadedFileUrl
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Appeal submission error:', error);

    return NextResponse.json({
      success: false,
      message: 'Failed to submit appeal. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function GET(request) {
  const startTime = Date.now();
  console.log('[APPEALS_GET] Starting request');

  try {
    const token = extractTokenFromHeader(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Access token is required'
      }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!['admin', 'hr_manager', 'super_admin'].includes(decoded.role)) {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const employeeIdParam = searchParams.get('employeeId');

    // Step 1: Fetch all appeals (1 query)
    const t0 = Date.now();
    const appeals = await getAppeals();
    console.log(`[APPEALS_GET] getAppeals() returned ${appeals.length} appeals in ${Date.now() - t0}ms`);

    // Step 2: Filter
    let filteredAppeals = appeals;
    if (status) {
      filteredAppeals = filteredAppeals.filter(a => a.status === status);
    }
    if (employeeIdParam) {
      filteredAppeals = filteredAppeals.filter(a => String(a.employeeId) === String(employeeIdParam));
    }

    if (filteredAppeals.length === 0) {
      return NextResponse.json({
        success: true,
        data: { appeals: [], total: 0 }
      }, { status: 200 });
    }

    // Step 3: Batch-load all verifiers (1 query for all)
    const t1 = Date.now();
    const verifierIds = filteredAppeals.map(a => a.verifierId);
    const verifiersMap = await getVerifiersByIds(verifierIds);
    console.log(`[APPEALS_GET] getVerifiersByIds() loaded ${Object.keys(verifiersMap).length} verifiers in ${Date.now() - t1}ms`);

    // Step 4: Batch-load all verification records (1 query for all)
    const t2 = Date.now();
    const verificationIds = filteredAppeals.map(a => a.verificationId);
    const verificationRecordsMap = await getVerificationRecordsByIds(verificationIds);
    console.log(`[APPEALS_GET] getVerificationRecordsByIds() loaded ${Object.keys(verificationRecordsMap).length} records in ${Date.now() - t2}ms`);

    // Step 5: Load employee info sequentially (one connection at a time to avoid pool exhaustion)
    const t3 = Date.now();
    const uniqueEmployeeIds = [...new Set(filteredAppeals.map(a => String(a.employeeId)))];
    const employeeInfoMap = {};
    for (const empId of uniqueEmployeeIds) {
      try {
        employeeInfoMap[empId] = await findEmployeeByIdService(empId);
      } catch (e) {
        console.log(`[APPEALS_GET] Could not fetch employee ${empId}: ${e.message}`);
      }
    }
    console.log(`[APPEALS_GET] findEmployeeByIdService() loaded ${Object.keys(employeeInfoMap).length} unique employees in ${Date.now() - t3}ms`);

    // Step 6: Enrich appeals in-memory (no DB queries)
    const t4 = Date.now();
    const appealsWithEnrichment = filteredAppeals.map((appeal) => {
      const verifier = verifiersMap[appeal.verifierId];
      const employeeInfo = employeeInfoMap[String(appeal.employeeId)];
      const verificationRecord = verificationRecordsMap[appeal.verificationId];

      return {
        appealId: appeal.appealId,
        verificationId: appeal.verificationId,
        employeeId: appeal.employeeId,
        employeeInfo: employeeInfo ? {
          name: employeeInfo.name,
          entityName: employeeInfo.entityName,
          department: employeeInfo.department,
          designation: employeeInfo.designation,
          dateOfJoining: employeeInfo.dateOfJoining,
          dateOfLeaving: employeeInfo.dateOfLeaving,
          email: employeeInfo.email
        } : null,
        verificationInfo: verificationRecord ? {
          matchScore: verificationRecord.matchScore || 0,
          overallStatus: verificationRecord.overallStatus || 'unknown',
          matchedFields: (verificationRecord.comparisonResults || []).filter(r => r.isMatch).length,
          totalFields: (verificationRecord.comparisonResults || []).length,
          comparisonResults: verificationRecord.comparisonResults || []
        } : null,
        verifierInfo: verifier ? {
          companyName: verifier.companyName,
          email: verifier.email
        } : null,
        appealReason: appeal.appealReason,
        status: appeal.status,
        mismatchedFields: appeal.mismatchedFields?.length || 0,
        mismatchedFieldsList: appeal.mismatchedFields || [],
        hasSupportingDocument: appeal.documents?.length > 0,
        documents: appeal.documents,
        hrResponse: appeal.hrResponse,
        hrComments: appeal.hrComments,
        createdAt: appeal.createdAt,
        reviewedAt: appeal.reviewedAt
      };
    });
    console.log(`[APPEALS_GET] In-memory enrichment for ${appealsWithEnrichment.length} appeals took ${Date.now() - t4}ms`);

    const totalTime = Date.now() - startTime;
    console.log(`[APPEALS_GET] ✅ Completed in ${totalTime}ms (${filteredAppeals.length} appeals, ${appeals.length} total)`);

    return NextResponse.json({
      success: true,
      data: {
        appeals: appealsWithEnrichment,
        total: appealsWithEnrichment.length
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[APPEALS_GET] ❌ Error:', error);

    return NextResponse.json({
      success: false,
      message: 'Failed to fetch appeals',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
