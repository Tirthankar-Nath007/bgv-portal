/**
 * Employee Model
 * Represents ex-employee records in the system
 */

import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
    },
    entityName: {
        type: String,
        required: true,
        enum: ['TVSCSHIB', 'HIB'],
    },
    dateOfJoining: {
        type: Date,
        required: true,
    },
    dateOfLeaving: {
        type: Date,
        required: true,
    },
    designation: {
        type: String,
        required: true,
    },
    exitReason: {
        type: String,
        required: true,
    },
    fnfStatus: {
        type: String,
        required: true,
        enum: ['Completed', 'Pending'],
    },
    department: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
    collection: 'employees',
});

// Prevent model recompilation in development
export default mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
