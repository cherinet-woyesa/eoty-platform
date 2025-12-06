const nodemailer = require('nodemailer');

/**
 * Email Service for EOTY Platform
 * Supports both SMTP and API-based email services
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.serviceType = process.env.EMAIL_SERVICE_TYPE || 'smtp'; // 'smtp' or 'api'

    this.initializeService();
  }

  /**
   * Initialize email service based on configuration
   */
  initializeService() {
    const serviceType = this.serviceType;

    if (serviceType === 'smtp') {
      this.initializeSMTP();
    } else if (serviceType === 'api') {
      this.initializeAPI();
    } else {
      console.warn('[EmailService] Unknown service type:', serviceType, '- falling back to SMTP');
      this.initializeSMTP();
    }
  }

  /**
   * Initialize SMTP transport
   */
  initializeSMTP() {
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      // Additional security options
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates in development
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('[EmailService] SMTP connection failed:', error);
      } else {
        console.log('[EmailService] SMTP server is ready to send emails');
      }
    });
  }

  /**
   * Initialize API-based email service (SendGrid, Mailgun, etc.)
   */
  initializeAPI() {
    const apiKey = process.env.EMAIL_SERVICE_API_KEY;

    if (!apiKey) {
      console.error('[EmailService] EMAIL_SERVICE_API_KEY not configured for API email service');
      return;
    }

    // For SendGrid, we'll use their API
    if (apiKey.startsWith('SG.')) {
      this.serviceName = 'sendgrid';
      console.log('[EmailService] SendGrid email service initialized');
    } else {
      console.log('[EmailService] Generic API email service initialized');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, resetLink) {
    const subject = 'Reset Your EOTY Platform Password';
    const html = this.generatePasswordResetHTML(resetLink);
    const text = this.generatePasswordResetText(resetLink);

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(email, verificationLink) {
    const subject = 'Verify Your EOTY Platform Account';
    const html = this.generateEmailVerificationHTML(verificationLink);
    const text = this.generateEmailVerificationText(verificationLink);

    return this.sendEmail(email, subject, html, text);
  }



  /**
   * Send generic email
   */
  async sendWelcomeEmail(email, firstName) {
    const subject = 'Welcome to EOTY Platform!';
    const html = this.generateWelcomeHTML(firstName);
    const text = this.generateWelcomeText(firstName);

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Send 2FA code email
   */
  async send2FACodeEmail(email, code) {
    // Log code for development/testing purposes
    console.log('=================================================');
    console.log(`[2FA] Verification code for ${email}: ${code}`);
    console.log('=================================================');

    const subject = 'Your EOTY Platform Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verification Code</h2>
        <p>Please use the following code to complete your login:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 5px;">
          ${code}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this code, please ignore this email.</p>
      </div>
    `;
    const text = `Your verification code is: ${code}. It expires in 10 minutes.`;

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Generic email sending method
   */
  async sendWelcomeEmail(email, firstName) {
    const subject = 'Welcome to EOTY Platform!';
    const html = this.generateWelcomeHTML(firstName);
    const text = this.generateWelcomeText(firstName);

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Generic email sending method
   */
  async sendEmail(to, subject, html, text = null) {
    // Log email details in development for testing
    if (process.env.NODE_ENV !== 'production') {
      console.log('=================================================');
      console.log(`[EmailService] Sending email to: ${to}`);
      console.log(`[EmailService] Subject: ${subject}`);
      console.log(`[EmailService] Content Preview: ${text || this.htmlToText(html).substring(0, 200)}...`);
      // If it's a verification or reset link, try to extract and log it clearly
      const linkMatch = html.match(/href="(http[^"]+)"/);
      if (linkMatch) {
        console.log(`[EmailService] LINK FOUND: ${linkMatch[1]}`);
      }
      console.log('=================================================');
    }

    try {
      if (!this.transporter && this.serviceType === 'smtp') {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@eotyplatform.com',
        to: to,
        subject: subject,
        html: html,
        text: text || this.htmlToText(html), // Fallback text version
      };

      if (this.serviceType === 'smtp') {
        const info = await this.transporter.sendMail(mailOptions);
        console.log('[EmailService] Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
      } else {
        // Handle API-based sending (SendGrid)
        return await this.sendViaAPI(to, subject, html, text);
      }
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      
      // In development or if configured, allow proceeding without email
      if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_EMAIL === 'true') {
         console.log('[EmailService] MOCK MODE: Returning success despite error. Check console for codes.');
         return { success: true, messageId: 'mock-id-' + Date.now() };
      }

      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Generate password reset HTML email
   */
  generatePasswordResetHTML(resetLink) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #00FFC6, #00D4FF); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #00FFC6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Reset Your Password</h1>
          <p>EOTY Platform - Ethiopian Orthodox Youth Community</p>
        </div>

        <div class="content">
          <h2>Hello!</h2>
          <p>You have requested to reset your password for your EOTY Platform account. Click the button below to create a new password:</p>

          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset My Password</a>
          </div>

          <div class="warning">
            <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email.
          </div>

          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">${resetLink}</p>

          <p>Best regards,<br>The EOTY Platform Team</p>
        </div>

        <div class="footer">
          <p>This email was sent to you because a password reset was requested for your EOTY Platform account.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate password reset text email
   */
  generatePasswordResetText(resetLink) {
    return `
EOTY Platform - Password Reset

Hello!

You have requested to reset your password for your EOTY Platform account.

Click this link to reset your password: ${resetLink}

⚠️ Security Notice: This link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email.

If you have any questions, please contact our support team.

Best regards,
The EOTY Platform Team
    `;
  }

  /**
   * Generate email verification HTML email
   */
  generateEmailVerificationHTML(verificationLink) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #00FFC6, #00D4FF); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #00FFC6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✨ Welcome to EOTY Platform!</h1>
          <p>Ethiopian Orthodox Youth Community</p>
        </div>

        <div class="content">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for joining the EOTY Platform! To complete your registration and start your spiritual learning journey, please verify your email address by clicking the button below:</p>

          <div style="text-align: center;">
            <a href="${verificationLink}" class="button">Verify My Email</a>
          </div>

          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">${verificationLink}</p>

          <p>Once verified, you'll have access to:</p>
          <ul>
            <li>📚 Comprehensive faith-based courses</li>
            <li>👥 Community discussions and forums</li>
            <li>📈 Progress tracking and achievements</li>
            <li>🎯 Personalized learning paths</li>
          </ul>

          <p>Best regards,<br>The EOTY Platform Team</p>
        </div>

        <div class="footer">
          <p>This email was sent to you because you recently created an account on the EOTY Platform.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate email verification text email
   */
  generateEmailVerificationText(verificationLink) {
    return `
EOTY Platform - Email Verification

Thank you for joining the EOTY Platform!

To complete your registration, please verify your email address by clicking this link: ${verificationLink}

Once verified, you'll have access to:
- Comprehensive faith-based courses
- Community discussions and forums
- Progress tracking and achievements
- Personalized learning paths

Best regards,
The EOTY Platform Team
    `;
  }

  /**
   * Generate welcome HTML email
   */
  generateWelcomeHTML(firstName) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to EOTY Platform!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #00FFC6, #00D4FF); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #00FFC6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Welcome ${firstName}!</h1>
          <p>Your EOTY Platform journey begins now</p>
        </div>

        <div class="content">
          <h2>Your Account is Now Active!</h2>
          <p>Congratulations! Your email has been verified and your account is now fully active on the EOTY Platform.</p>

          <p>Here's what you can do next:</p>

          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3>🚀 Get Started</h3>
            <ul>
              <li><strong>Complete your profile</strong> - Add your bio, interests, and learning goals</li>
              <li><strong>Browse courses</strong> - Explore our comprehensive faith-based curriculum</li>
              <li><strong>Join the community</strong> - Connect with fellow learners in forums and study groups</li>
              <li><strong>Track your progress</strong> - Monitor your spiritual learning journey</li>
            </ul>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">Start Learning Now</a>
          </div>

          <p>We can't wait to see your growth and participation in our faith community!</p>

          <p>Best regards,<br>The EOTY Platform Team</p>
        </div>

        <div class="footer">
          <p>EOTY Platform - Empowering Ethiopian Orthodox Youth through faith-centered education.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate welcome text email
   */
  generateWelcomeText(firstName) {
    return `
Welcome ${firstName} to EOTY Platform!

Congratulations! Your email has been verified and your account is now fully active.

Here's what you can do next:

🚀 Get Started
- Complete your profile - Add your bio, interests, and learning goals
- Browse courses - Explore our comprehensive faith-based curriculum
- Join the community - Connect with fellow learners in forums and study groups
- Track your progress - Monitor your spiritual learning journey

Visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard

We can't wait to see your growth and participation in our faith community!

Best regards,
The EOTY Platform Team

EOTY Platform - Empowering Ethiopian Orthodox Youth through faith-centered education.
    `;
  }

  /**
   * Send email via API (SendGrid)
   */
  async sendViaAPI(to, subject, html, text) {
    try {
      const apiKey = process.env.EMAIL_SERVICE_API_KEY;
      const fromEmail = process.env.EMAIL_FROM || 'noreply@eotyplatform.com';

      if (!apiKey) {
        throw new Error('EMAIL_SERVICE_API_KEY not configured');
      }

      // SendGrid API call
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(apiKey);

      const msg = {
        to: to,
        from: fromEmail,
        subject: subject,
        html: html,
        text: text || this.htmlToText(html),
      };

      const result = await sgMail.send(msg);
      console.log('[EmailService] SendGrid email sent successfully:', result[0]?.headers?.['x-message-id']);
      return { success: true, messageId: result[0]?.headers?.['x-message-id'] };

    } catch (error) {
      console.error('[EmailService] SendGrid API error:', error);
      throw new Error(`SendGrid API error: ${error.message}`);
    }
  }

  /**
   * Convert HTML to plain text (basic conversion)
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Test email service
   */
  async testEmail(to) {
    const subject = 'EOTY Platform - Email Service Test';
    const html = `
      <h1>Email Service Test</h1>
      <p>This is a test email to verify that the EOTY Platform email service is working correctly.</p>
      <p>Sent at: ${new Date().toISOString()}</p>
    `;

    return this.sendEmail(to, subject, html);
  }
}

module.exports = new EmailService();