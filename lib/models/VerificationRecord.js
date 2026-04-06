/**
 * VerificationRecord Model
 * Represents verification requests and their results
 */

import mongoose from 'mongoose';

const ComparisonResultSchema = new mongoose.Schema({
    field: String,
    verifierValue: String,
    companyValue: String,
    isMatch: Boolean,
    matchType: String,
}, { _id: false });

const VerificationRecordSchema = new mongoose.Schema({
    verificationId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    employeeId: {
        type: String,
        required: true,
        index: true,
    },
    verifierId: {
        type: String,
        required: true,
        index: true,
    },
    submittedData: {
        type: Object,
        required: true,
    },
    comparisonResults: {
        type: [ComparisonResultSchema],
        default: [],
    },
    overallStatus: {
        type: String,
        required: true,
        enum: ['matched', 'partial_match', 'mismatch'],
    },
    matchScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    consentGiven: {
        type: Boolean,
        required: true,
    },
    pdfReportUrl: {
        type: String,
    },
    verificationCompletedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    collection: 'verification_records',
});

// Prevent model recompilation in development
export default mongoose.models.VerificationRecord || mongoose.model('VerificationRecord', VerificationRecordSchema);
