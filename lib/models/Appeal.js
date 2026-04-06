/**
 * Appeal Model
 * Represents appeals submitted for verification discrepancies
 */

import mongoose from 'mongoose';

const AppealSchema = new mongoose.Schema({
    appealId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    verificationId: {
        type: String,
        required: true,
        index: true,
    },
    verifierId: {
        type: String,
        required: true,
        index: true,
    },
    employeeId: {
        type: String,
        required: true,
    },
    appealReason: {
        type: String,
        required: true,
    },
    documents: {
        type: [String],
        default: [],
    },
    mismatchedFields: {
        type: [{
            fieldName: String,
            verifierValue: String,
            companyValue: String,
        }],
        default: [],
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'under_review', 'approved', 'rejected'],
        default: 'pending',
    },
    hrResponse: {
        type: String,
    },
    hrComments: {
        type: String,
    },
    reviewedBy: {
        type: String,
    },
    reviewedAt: {
        type: Date,
    },
}, {
    timestamps: true,
    collection: 'appeals',
});

// Prevent model recompilation in development
export default mongoose.models.Appeal || mongoose.model('Appeal', AppealSchema);
