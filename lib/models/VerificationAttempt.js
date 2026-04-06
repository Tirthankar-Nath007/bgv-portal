/**
 * VerificationAttempt Model
 * Tracks failed verification attempts per verifier+employee combination
 * Blocks verification after MAX_ATTEMPTS consecutive failures
 */

import mongoose from 'mongoose';

const MAX_ATTEMPTS = 3;
const EXIT_TEAM_EMAIL = 'biswajit.dash@codemate.ai';

const VerificationAttemptSchema = new mongoose.Schema({
    verifierId: {
        type: String,
        required: true,
        index: true,
    },
    employeeId: {
        type: String,
        required: true,
        index: true,
    },
    attemptCount: {
        type: Number,
        default: 0,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    blockedAt: {
        type: Date,
    },
    lastAttemptAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    collection: 'verification_attempts',
});

// Compound index for efficient lookups
VerificationAttemptSchema.index({ verifierId: 1, employeeId: 1 }, { unique: true });

// Static method to get blocked message
VerificationAttemptSchema.statics.getBlockedMessage = function () {
    return `Maximum attempts reached. Please reach out to exit team - ${EXIT_TEAM_EMAIL}`;
};

// Static method to get max attempts
VerificationAttemptSchema.statics.getMaxAttempts = function () {
    return MAX_ATTEMPTS;
};

// Export constants for use elsewhere
export const VERIFICATION_ATTEMPT_CONFIG = {
    MAX_ATTEMPTS,
    EXIT_TEAM_EMAIL,
    BLOCKED_MESSAGE: `Maximum attempts reached. Please reach out to exit team - ${EXIT_TEAM_EMAIL}`
};

export default mongoose.models.VerificationAttempt || mongoose.model('VerificationAttempt', VerificationAttemptSchema);
