/**
 * SMTP Email Service using Nodemailer
 * Uses Brevo SMTP for better deliverability
 */

import nodemailer from 'nodemailer';

// Create transporter with Brevo SMTP settings
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // Use TLS
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

/**
 * Send email via SMTP
 */
export async function sendEmailSMTP(to, subject, htmlContent, textContent = null) {
    const transporter = createTransporter();

    const fromEmail = process.env.FROM_EMAIL || 'noreply@example.com';
    const companyName = process.env.COMPANY_NAME || 'Ex-Employee Verification Portal';

    const mailOptions = {
        from: `"${companyName}" <${fromEmail}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for plain text
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[SMTP] ✅ Email sent:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            provider: 'smtp'
        };
    } catch (error) {
        console.error('[SMTP] ❌ Failed to send email:', error.message);
        throw error;
    }
}

/**
 * Send OTP email via SMTP
 */
export async function sendOTPEmailSMTP(email, otp) {
    const companyName = process.env.COMPANY_NAME || 'Ex-Employee Verification Portal';

    const subject = `Your OTP Code: ${otp}`;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .header h1 { color: white; margin: 0; font-size: 24px; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-box { background: #667eea; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${companyName}</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>Your one-time password (OTP) for login is:</p>
                    <div class="otp-box">${otp}</div>
                    <p>This OTP is valid for <strong>5 minutes</strong>.</p>
                    <p>If you didn't request this OTP, please ignore this email.</p>
                    <p>Best regards,<br>${companyName} Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return await sendEmailSMTP(email, subject, htmlContent);
}

export default {
    sendEmail: sendEmailSMTP,
    sendOTPEmail: sendOTPEmailSMTP
};
