/**
 * SMTP Email Service
 * Uses internal SMTP server for sending emails
 * 
 * Configuration via environment variables:
 * - SMTP_HOST: SMTP server host (default: 10.221.0.18)
 * - SMTP_PORT: SMTP server port (default: 25)
 * - SMTP_FROM_EMAIL: From email address
 * - ADMIN_EMAIL: Admin email for notifications
 */

import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25');
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

if (!SMTP_HOST || !FROM_EMAIL || !ADMIN_EMAIL) {
  console.warn('[SMTP] Missing required environment variables: SMTP_HOST, SMTP_FROM_EMAIL, ADMIN_EMAIL');
}

let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!SMTP_HOST) {
      throw new Error('SMTP_HOST is not configured');
    }

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection on creation (only in development)
    if (process.env.NODE_ENV === 'development') {
      transporter.verify((error, success) => {
        if (error) {
          console.error('[SMTP] Connection verification failed:', error);
        } else {
          console.log('[SMTP] Server is ready to take our messages');
        }
      });
    }
  }
  return transporter;
}

/**
 * Send email using SMTP
 * @param {String} to - Recipient email
 * @param {String} subject - Email subject
 * @param {String} html - HTML email content
 * @param {String} text - Plain text email content (optional)
 * @returns {Object} Send result
 */
export async function sendEmail(to, subject, html, text = null) {
  try {
    const mailOptions = {
      from: FROM_EMAIL,
      to: to,
      subject: subject,
      ...(text && { text: text }),
      ...(html && { html: html })
    };

    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === 'development') {
      console.log('[SMTP] Email sent successfully:', info.messageId);
    }

    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('[SMTP] Failed to send email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send appeal notification email to admin
 * @param {Object} appeal - Appeal object with details
 * @param {Object} verifier - Verifier object with company info
 * @param {String} baseUrl - Base URL of the application
 */
export async function sendAppealNotificationEmail(appeal, verifier, baseUrl) {
  const subject = `New Query Submitted - Employee ${appeal.employeeId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Query Submitted</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .alert { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        .details { background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Query Submitted</h1>
        </div>
        <div class="content">
          <div class="alert">
            <strong>Action Required:</strong> A new query has been submitted that requires your review.
          </div>
          
          <p>Dear Admin,</p>
          <p>A new query has been submitted by <strong>${verifier?.companyName || 'Unknown Verifier'}</strong> regarding the verification of employee <strong>${appeal.employeeId}</strong>.</p>
          
          <h3>Query Details</h3>
          <div class="details">
            <p><strong>Query ID:</strong> ${appeal.appealId}</p>
            <p><strong>Employee ID:</strong> ${appeal.employeeId}</p>
            <p><strong>Verifier:</strong> ${verifier?.companyName || 'Unknown'} (${verifier?.email || 'N/A'})</p>
            <p><strong>Status:</strong> <span style="color: #ffc107;">PENDING</span></p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <h3>Verifier's Comments</h3>
          <div class="details">
            ${appeal.appealReason || appeal.comments || 'No comments provided'}
          </div>
          
          ${appeal.mismatchedFields && appeal.mismatchedFields.length > 0 ? `
            <h3>Mismatched Fields</h3>
            <ul>
              ${appeal.mismatchedFields.map(field => `
                <li><strong>${field.fieldName || field.field}:</strong> Verifier provided "${field.verifierValue}" but records show "${field.companyValue}"</li>
              `).join('')}
            </ul>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/admin/appeals" class="btn">Review Query</a>
          </div>
          
          <p>Please review this query at your earliest convenience and provide a response to the verifier.</p>
          
          <p>Best regards,<br>
          BGV Portal System</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    New Query Submitted
    
    Query ID: ${appeal.appealId}
    Employee ID: ${appeal.employeeId}
    Verifier: ${verifier?.companyName || 'Unknown'}
    
    Comments: ${appeal.appealReason || appeal.comments || 'No comments'}
    
    Review at: ${baseUrl}/admin/appeals
  `;

  return sendEmail(ADMIN_EMAIL, subject, html, text);
}

/**
 * Send block notification email to admin
 * @param {Object} data - Block information
 * @param {String} data.verifierCompanyName - Verifier company name
 * @param {String} data.verifierEmail - Verifier email
 * @param {String} data.employeeId - Employee ID that was being verified
 * @param {Number} data.attemptCount - Number of attempts made
 * @param {String} baseUrl - Base URL of the application
 */
export async function sendBlockNotificationEmail(data, baseUrl) {
  const subject = `Verifier Blocked - ${data.verifierCompanyName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verifier Blocked</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .alert { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .details { background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verifier Blocked</h1>
        </div>
        <div class="content">
          <div class="alert">
            <strong>Alert:</strong> A verifier has been blocked due to multiple failed verification attempts.
          </div>
          
          <p>Dear Admin,</p>
          <p>A verifier has been blocked from performing employee verifications.</p>
          
          <h3>Block Details</h3>
          <div class="details">
            <p><strong>Verifier:</strong> ${data.verifierCompanyName}</p>
            <p><strong>Email:</strong> ${data.verifierEmail}</p>
            <p><strong>Employee ID Attempted:</strong> ${data.employeeId}</p>
            <p><strong>Attempt Count:</strong> ${data.attemptCount}</p>
            <p><strong>Blocked At:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>The verifier will not be able to verify this employee until an admin resets their attempts.</p>
          
          <p>Best regards,<br>
          BGV Portal System</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Verifier Blocked
    
    Verifier: ${data.verifierCompanyName}
    Email: ${data.verifierEmail}
    Employee ID: ${data.employeeId}
    Attempts: ${data.attemptCount}
    
    The verifier has been blocked due to multiple failed attempts.
  `;

  return sendEmail(ADMIN_EMAIL, subject, html, text);
}

export { FROM_EMAIL, ADMIN_EMAIL };
