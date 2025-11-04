const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  /**
   * Send email verification email with token
   * @param {string} email - User's email address
   * @param {string} token - Verification token
   * @param {string} userName - User's name
   */
  async sendVerificationEmail(email, token, userName = '') {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@eotyplatform.com',
        to: email,
        subject: 'Verify your EOTY Platform account',
        html: this.getVerificationEmailTemplate(verificationUrl, userName),
        text: `Welcome to EOTY Platform! Please verify your email address by visiting: ${verificationUrl}\n\nThis link will expire in 24 hours.`,
      });

      console.log(`Verification email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email with token
   * @param {string} email - User's email address
   * @param {string} token - Password reset token
   * @param {string} userName - User's name
   */
  async sendPasswordResetEmail(email, token, userName = '') {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@eotyplatform.com',
        to: email,
        subject: 'Reset your EOTY Platform password',
        html: this.getPasswordResetEmailTemplate(resetUrl, userName),
        text: `You requested to reset your password. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
      });

      console.log(`Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Get HTML template for verification email
   * @param {string} verificationUrl - Verification URL
   * @param {string} userName - User's name
   * @returns {string} HTML template
   */
  getVerificationEmailTemplate(verificationUrl, userName) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #2c5282;
            margin: 0;
          }
          .content {
            background-color: white;
            padding: 25px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #3182ce;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background-color: #2c5282;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 20px;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin-top: 20px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to EOTY Platform!</h1>
          </div>
          <div class="content">
            ${userName ? `<p>Hello ${userName},</p>` : '<p>Hello,</p>'}
            <p>Thank you for registering with the Ethiopian Orthodox Tewahedo Youth Platform. We're excited to have you join our community of spiritual learning and growth.</p>
            <p>To complete your registration and access all features, please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3182ce;">${verificationUrl}</p>
            <div class="warning">
              <strong>⏰ Important:</strong> This verification link will expire in 24 hours.
            </div>
          </div>
          <div class="footer">
            <p>If you didn't create an account with EOTY Platform, please ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} EOTY Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get HTML template for password reset email
   * @param {string} resetUrl - Password reset URL
   * @param {string} userName - User's name
   * @returns {string} HTML template
   */
  getPasswordResetEmailTemplate(resetUrl, userName) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #2c5282;
            margin: 0;
          }
          .content {
            background-color: white;
            padding: 25px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #e53e3e;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background-color: #c53030;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 20px;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin-top: 20px;
            font-size: 14px;
          }
          .security-notice {
            background-color: #e6f7ff;
            border-left: 4px solid #1890ff;
            padding: 12px;
            margin-top: 20px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            ${userName ? `<p>Hello ${userName},</p>` : '<p>Hello,</p>'}
            <p>We received a request to reset the password for your EOTY Platform account.</p>
            <p>To reset your password, click the button below:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #e53e3e;">${resetUrl}</p>
            <div class="warning">
              <strong>⏰ Important:</strong> This password reset link will expire in 1 hour.
            </div>
            <div class="security-notice">
              <strong>🔒 Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </div>
          </div>
          <div class="footer">
            <p>For security reasons, this link can only be used once.</p>
            <p>&copy; ${new Date().getFullYear()} EOTY Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Verify SMTP connection
   * @returns {Promise<boolean>} Connection status
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('SMTP connection verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
