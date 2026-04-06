/**
 * Admin Model
 * Represents HR and administrative users
 */

import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
        enum: ['super_admin', 'hr_manager', 'hr_staff'],
    },
    department: {
        type: String,
        required: true,
    },
    permissions: {
        type: [String],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLoginAt: {
        type: Date,
    },
    testMode: {
        type: Boolean,
        default: false,
    },
    bypassToken: {
        type: String,
    },
}, {
    timestamps: true,
    collection: 'admins',
});

// Prevent model recompilation in development
export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
