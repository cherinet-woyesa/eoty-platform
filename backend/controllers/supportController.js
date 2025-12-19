const db = require('../config/database');
const emailService = require('../services/emailService');

exports.contactSupport = async (req, res) => {
  try {
    const { subject, message, type } = req.body;
    
    // Get user details from req.user (populated by authenticateToken)
    // The token payload contains: userId, email, role, firstName, lastName, chapter
    const userId = req.user ? (req.user.id || req.user.userId) : null;
    const userEmail = req.user ? req.user.email : req.body.email;
    
    // Construct name from token details if available
    let userName = req.body.name;
    if (req.user && req.user.firstName && req.user.lastName) {
      userName = `${req.user.firstName} ${req.user.lastName}`;
    } else if (req.user && req.user.first_name && req.user.last_name) {
      userName = `${req.user.first_name} ${req.user.last_name}`;
    }

    if (!subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject and message are required' 
      });
    }

    // Store the support ticket in the database
    const [ticket] = await db('support_tickets')
      .insert({
        user_id: userId,
        subject,
        message,
        type: type || 'general',
        status: 'open',
        created_at: db.fn.now()
      })
      .returning('id');

    // Send email notification to admin
    // Note: In a real app, you might want to queue this or use a dedicated support system API
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'support@eotcommunity.org';
      const emailSubject = `[Support] ${subject}`;
      const emailHtml = `
          <h3>New Support Request</h3>
          <p><strong>From:</strong> ${userName} (${userEmail})</p>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr />
          <p>${message.replace(/\n/g, '<br>')}</p>
        `;

      await emailService.sendEmail(adminEmail, emailSubject, emailHtml);
    } catch (emailError) {
      console.error('Failed to send support email:', emailError);
      // Continue execution, don't fail the request just because email failed
    }

    res.status(201).json({
      success: true,
      message: 'Support request received',
      ticketId: ticket.id
    });

  } catch (error) {
    console.error('Support contact error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process support request' 
    });
  }
};

exports.getTickets = async (req, res) => {
  try {
    // Simple role check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const tickets = await db('support_tickets')
      .leftJoin('users', 'support_tickets.user_id', 'users.id')
      .select(
        'support_tickets.*',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .orderBy('created_at', 'desc');

    res.json({ success: true, tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

exports.replyToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Reply message is required' });
    }

    // Get ticket details to find user email
    const ticket = await db('support_tickets')
      .leftJoin('users', 'support_tickets.user_id', 'users.id')
      .select(
        'support_tickets.*',
        'users.email',
        'users.first_name',
        'users.last_name'
      )
      .where('support_tickets.id', ticketId)
      .first();

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // If user_id is null, we can't reply via email unless we stored email in support_tickets (which we didn't in the migration)
    // But for logged in users, we have the email from the join.
    if (!ticket.email) {
       return res.status(400).json({ success: false, message: 'Cannot reply: User email not found associated with this ticket.' });
    }

    // Send email to user
    const subject = `Re: ${ticket.subject} [Ticket #${ticket.id}]`;
    const html = `
      <p>Dear ${ticket.first_name || 'User'},</p>
      <p>We have received your support request regarding "<strong>${ticket.subject}</strong>".</p>
      <p><strong>Response from Admin:</strong></p>
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #00FFC6; margin: 10px 0;">
        ${message.replace(/\n/g, '<br>')}
      </div>
      <hr />
      <p>Original Message:</p>
      <blockquote style="color: #666; margin-left: 10px; padding-left: 10px; border-left: 2px solid #eee;">
        ${ticket.message}
      </blockquote>
      <p>Best regards,<br>EOTY Platform Support</p>
    `;

    await emailService.sendEmail(ticket.email, subject, html);

    // Update ticket status to 'replied' or 'closed' if desired. 
    // For now, let's just mark it as 'replied' if that status exists, or keep it open.
    // The migration had default 'open'. Let's update it to 'replied' if we want to track that.
    // But 'replied' wasn't explicitly in the enum list if there was one, but it's a varchar.
    await db('support_tickets')
      .where({ id: ticketId })
      .update({ 
        status: 'replied',
        updated_at: db.fn.now()
      });

    res.json({ success: true, message: 'Reply sent successfully' });

  } catch (error) {
    console.error('Reply ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
};
