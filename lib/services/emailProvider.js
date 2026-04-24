/**
 * Unified Email Provider Service
 * Supports multiple email providers with fallback capabilities
 * 
 * Configuration via EMAIL_PROVIDER env variable:
 * - brevo: Use Brevo only (default, no domain verification needed)
 * - sendgrid: Use SendGrid only
 * - ab_test: Randomly select between Brevo and SendGrid (50/50)
 * - fallback: Try Brevo first, fall back to SendGrid on failure
 * 
 * STATUS: Email service is currently disabled/not configured
 */

import sgMail from '@sendgrid/mail';
import * as SibApiV3Sdk from '@getbrevo/brevo';
import { ensureConnection, executeStatement, executeQuery } from '../db/oracle.js';

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@company.com';
const COMPANY_NAME = process.env.COMPANY_NAME || 'Employee Verification Portal';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'hr@company.com';
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'brevo';

let sendgridInitialized = false;
let brevoApiInstance = null;

function initSendGrid() {
    if (!sendgridInitialized && process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        sendgridInitialized = true;
        console.log('[EMAIL] SendGrid initialized');
    }
    return sendgridInitialized;
}

function initBrevo() {
    if (!brevoApiInstance && process.env.BREVO_API_KEY) {
        brevoApiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        brevoApiInstance.setApiKey(
            SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
            process.env.BREVO_API_KEY
        );
        console.log('[EMAIL] Brevo initialized with API key');
    }
    return brevoApiInstance !== null;
}

function selectProvider() {
    const provider = EMAIL_PROVIDER.toLowerCase();

    switch (provider) {
        case 'sendgrid':
            return 'sendgrid';
        case 'ab_test':
            return Math.random() < 0.5 ? 'brevo' : 'sendgrid';
        case 'fallback':
            return 'brevo';
        case 'brevo':
        default:
            return 'brevo';
    }
}

async function logEmail(provider, emailType, recipient, subject, status, responseTime, messageId = null, error = null) {
    try {
        await ensureConnection();
        const sql = `
            INSERT INTO BGV_EMAIL_LOGS (
                provider, email_type, recipient, subject, status, response_time, message_id, error
            ) VALUES (
                :provider, :email_type, :recipient, :subject, :status, :response_time, :message_id, :error
            )
        `;
        
        await executeStatement(sql, {
            provider,
            email_type: emailType,
            recipient,
            subject,
            status,
            response_time: responseTime,
            message_id: messageId,
            error: error ? String(error) : null
        }, false);
    } catch (logError) {
        console.error('[EMAIL] Failed to log email:', logError.message);
    }
}

async function sendViaSendGrid(to, subject, html, text) {
    if (!initSendGrid()) {
        throw new Error('SendGrid API key not configured');
    }

    const msg = {
        to,
        from: `${COMPANY_NAME} <${FROM_EMAIL}>`,
        subject,
        html,
        ...(text && { text })
    };

    const response = await sgMail.send(msg);
    return {
        messageId: response[0]?.headers?.['x-message-id'] || 'sg-' + Date.now(),
        provider: 'sendgrid'
    };
}

async function sendViaBrevo(to, subject, html, text) {
    if (!initBrevo()) {
        throw new Error('Brevo API key not configured');
    }

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { name: COMPANY_NAME, email: FROM_EMAIL };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    if (text) {
        sendSmtpEmail.textContent = text;
    }

    console.log('[EMAIL] Sending via Brevo to:', to);
    const response = await brevoApiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('[EMAIL] Brevo response:', JSON.stringify(response?.body || response));

    return {
        messageId: response?.body?.messageId || response?.messageId || 'brevo-' + Date.now(),
        provider: 'brevo'
    };
}

export async function sendEmail(to, subject, html, text = null, emailType = 'other') {
    const startTime = Date.now();
    let selectedProvider = selectProvider();
    let result = null;
    let error = null;

    console.log(`[EMAIL] Attempting to send via ${selectedProvider} to ${to}...`);

    try {
        if (selectedProvider === 'sendgrid') {
            result = await sendViaSendGrid(to, subject, html, text);
        } else {
            result = await sendViaBrevo(to, subject, html, text);
        }

        const responseTime = Date.now() - startTime;
        console.log(`[EMAIL] ✓ Sent via ${result.provider} in ${responseTime}ms`);

        await logEmail(result.provider, emailType, to, subject, 'sent', responseTime, result.messageId);
        return { success: true, provider: result.provider, messageId: result.messageId, responseTime };

    } catch (primaryError) {
        error = primaryError;
        console.error(`[EMAIL] ✗ ${selectedProvider} failed:`, primaryError.message);
        console.error('[EMAIL] Full error:', primaryError);

        if (EMAIL_PROVIDER.toLowerCase() === 'fallback' && selectedProvider === 'brevo') {
            console.log('[EMAIL] Trying SendGrid as fallback...');
            try {
                result = await sendViaSendGrid(to, subject, html, text);
                const responseTime = Date.now() - startTime;
                console.log(`[EMAIL] ✓ Fallback to SendGrid succeeded in ${responseTime}ms`);

                await logEmail('sendgrid', emailType, to, subject, 'sent', responseTime, result.messageId);
                return { success: true, provider: 'sendgrid', messageId: result.messageId, responseTime, fallback: true };

            } catch (fallbackError) {
                console.error('[EMAIL] ✗ Fallback also failed:', fallbackError.message);
                error = fallbackError;
            }
        }

        const responseTime = Date.now() - startTime;
        await logEmail(selectedProvider, emailType, to, subject, 'failed', responseTime, null, error.message);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}

export async function getEmailStats(days = 7) {
    try {
        await ensureConnection();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const statsSql = `
            SELECT 
                provider,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                AVG(response_time) as avg_response_time
            FROM BGV_EMAIL_LOGS
            WHERE created_at >= :startDate
            GROUP BY provider
        `;
        
        const recentLogsSql = `
            SELECT * FROM BGV_EMAIL_LOGS
            ORDER BY created_at DESC
            FETCH FIRST 50 ROWS ONLY
        `;

        const stats = await executeQuery(statsSql, { startDate });
        const recentLogs = await executeQuery(recentLogsSql);

        const formattedLogs = recentLogs.map(log => ({
            ...log,
            _id: log.ID,
            provider: log.PROVIDER,
            emailType: log.EMAIL_TYPE,
            recipient: log.RECIPIENT,
            subject: log.SUBJECT,
            status: log.STATUS,
            responseTime: log.RESPONSE_TIME,
            messageId: log.MESSAGE_ID,
            error: log.ERROR,
            createdAt: log.CREATED_AT
        }));

        return { stats, recentLogs: formattedLogs };
    } catch (error) {
        console.error('[EMAIL] Failed to get stats:', error);
        return { stats: [], recentLogs: [] };
    }
}

export { FROM_EMAIL, COMPANY_NAME, SUPPORT_EMAIL, EMAIL_PROVIDER };
