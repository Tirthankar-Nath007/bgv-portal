/**
 * OTP Service - DISABLED
 * OTP login is currently disabled. All functions return disabled status.
 * To enable OTP login, uncomment the original implementation and remove this stub.
 */

// OTP Configuration
const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;

/**
 * Generate a random OTP
 * @returns {string} 6-digit OTP
 */
export function generateOTP() {
    console.warn('[OTP] OTP generation is disabled');
    return null;
}

/**
 * Calculate OTP expiry time
 * @returns {Date} Expiry timestamp
 */
export function getOTPExpiry() {
    console.warn('[OTP] OTP expiry calculation is disabled');
    return null;
}

/**
 * Store OTP for a verifier (email)
 * DISABLED - Always returns failure
 */
export async function storeOTP(email, otp) {
    console.warn('[OTP] OTP storage is disabled');
    return { success: false, message: 'OTP login is currently disabled' };
}

/**
 * Verify OTP for a given email
 * DISABLED - Always returns failure
 */
export async function verifyOTP(email, otp) {
    console.warn('[OTP] OTP verification is disabled');
    return { success: false, message: 'OTP login is currently disabled' };
}

/**
 * Check if user can request a new OTP (rate limiting)
 * DISABLED - Always returns cannot request
 */
export async function canRequestOTP(email) {
    console.warn('[OTP] OTP rate limiting check is disabled');
    return { 
        canRequest: false, 
        message: 'OTP login is currently disabled. Please use password login instead.' 
    };
}

/**
 * Clean up expired OTPs
 * DISABLED - No-op
 */
export async function cleanupExpiredOTPs() {
    console.warn('[OTP] OTP cleanup is disabled');
    return { deletedCount: 0 };
}

export default {
    generateOTP,
    getOTPExpiry,
    storeOTP,
    verifyOTP,
    canRequestOTP,
    cleanupExpiredOTPs,
    OTP_EXPIRY_MINUTES
};
