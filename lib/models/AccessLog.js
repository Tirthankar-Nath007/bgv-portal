/**
 * AccessLog Model
 * Tracks login attempts and access events for security auditing
 */

import mongoose from 'mongoose';

const AccessLogSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true,
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'verifier', 'unknown'],
        default: 'unknown',
        index: true
    },
    action: {
        type: String,
        default: 'LOGIN',
        index: true
    },
    status: {
        type: String,
        enum: ['SUCCESS', 'FAILURE'],
        required: true,
        index: true
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    failureReason: {
        type: String
    },
    metadata: {
        type: Object
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
        // Set TTL index to auto-delete logs after 90 days
        // expires: 60 * 60 * 24 * 90 
    }
}, {
    timestamps: true,
    collection: 'access_logs',
});

// TTL Index for automatic cleanup (90 days)
// Note: Index creation happens when model is compiled
AccessLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Prevent model recompilation in development
export default mongoose.models.AccessLog || mongoose.model('AccessLog', AccessLogSchema);
