/**
 * Script to unblock a verifier by resetting their verification attempts
 * 
 * Usage: node scripts/unblock-verifier.js [email]
 * Example: node scripts/unblock-verifier.js aditya.mathan@codemateai.dev
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in .env.local');
    process.exit(1);
}

// Verifier Schema
const VerifierSchema = new mongoose.Schema({
    companyName: String,
    email: { type: String, lowercase: true },
    password: String,
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    verificationRequests: { type: [String], default: [] },
    notifications: { type: Array, default: [] },
    lastLoginAt: Date,
    testMode: { type: Boolean, default: false },
    bypassToken: String,
}, { timestamps: true, collection: 'verifiers' });

// VerificationAttempt Schema
const VerificationAttemptSchema = new mongoose.Schema({
    verifierId: { type: String, required: true },
    employeeId: { type: String, required: true },
    attemptCount: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    blockedAt: Date,
    lastAttemptAt: { type: Date, default: Date.now },
}, { timestamps: true, collection: 'verification_attempts' });

async function unblockVerifier(email) {
    try {
        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const Verifier = mongoose.model('Verifier', VerifierSchema);
        const VerificationAttempt = mongoose.model('VerificationAttempt', VerificationAttemptSchema);

        // Find the verifier
        console.log(`🔍 Looking for verifier: ${email}`);
        const verifier = await Verifier.findOne({ email: email.toLowerCase() });

        if (!verifier) {
            console.log(`❌ Verifier with email "${email}" not found`);
            console.log('\n📋 Available verifiers:');
            const allVerifiers = await Verifier.find({}, 'email companyName isActive isEmailVerified');
            allVerifiers.forEach(v => {
                console.log(`   - ${v.email} (${v.companyName}) - Active: ${v.isActive}, Verified: ${v.isEmailVerified}`);
            });
            return;
        }

        console.log(`✅ Found verifier: ${verifier.email}`);
        console.log(`   Company: ${verifier.companyName}`);
        console.log(`   Active: ${verifier.isActive}`);
        console.log(`   Email Verified: ${verifier.isEmailVerified}`);
        console.log(`   ID: ${verifier._id}`);

        // Find blocked verification attempts
        console.log(`\n🔍 Checking for blocked verification attempts...`);
        const blockedAttempts = await VerificationAttempt.find({
            verifierId: verifier._id.toString(),
            isBlocked: true
        });

        if (blockedAttempts.length === 0) {
            console.log('ℹ️  No blocked verification attempts found');
        } else {
            console.log(`⚠️  Found ${blockedAttempts.length} blocked attempt(s):`);
            blockedAttempts.forEach(a => {
                console.log(`   - Employee: ${a.employeeId}, Attempts: ${a.attemptCount}, Blocked At: ${a.blockedAt}`);
            });
        }

        // Also check all attempts (not just blocked)
        const allAttempts = await VerificationAttempt.find({
            verifierId: verifier._id.toString()
        });

        console.log(`\n📊 All verification attempts for this verifier: ${allAttempts.length}`);
        allAttempts.forEach(a => {
            console.log(`   - Employee: ${a.employeeId}, Attempts: ${a.attemptCount}, Blocked: ${a.isBlocked}`);
        });

        // Reset ALL verification attempts for this user
        console.log('\n🔧 Resetting all verification attempts...');
        const resetResult = await VerificationAttempt.updateMany(
            { verifierId: verifier._id.toString() },
            {
                $set: {
                    attemptCount: 0,
                    isBlocked: false,
                    blockedAt: null
                }
            }
        );
        console.log(`✅ Reset ${resetResult.modifiedCount} attempt record(s)`);

        // Delete all attempts to start fresh
        console.log('\n🗑️  Deleting all verification attempt records for fresh start...');
        const deleteResult = await VerificationAttempt.deleteMany({
            verifierId: verifier._id.toString()
        });
        console.log(`✅ Deleted ${deleteResult.deletedCount} record(s)`);

        // Ensure verifier is active
        if (!verifier.isActive) {
            console.log('\n🔧 Activating verifier account...');
            await Verifier.findByIdAndUpdate(verifier._id, { isActive: true });
            console.log('✅ Verifier account activated');
        }

        // Set email as verified for testing
        if (!verifier.isEmailVerified) {
            console.log('\n🔧 Marking email as verified for testing...');
            await Verifier.findByIdAndUpdate(verifier._id, { isEmailVerified: true });
            console.log('✅ Email marked as verified');
        }

        console.log('\n✅ ==================================');
        console.log('✅ VERIFIER UNBLOCKED SUCCESSFULLY!');
        console.log('✅ ==================================');
        console.log(`\nThe user ${email} can now access the verification portal.`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Get email from command line argument
const email = process.argv[2] || 'aditya.mathan@codemateai.dev';

console.log('=============================================');
console.log('  VERIFIER UNBLOCK SCRIPT');
console.log('=============================================');

unblockVerifier(email);
