const db = require('../config/database');

// Simulate sending a notification (in a real app, this would integrate with email/SMS/push services)
async function sendNotification(userId, message, type = 'video_available') {
  console.log(`Notification to user ${userId}: ${message}`);
  
  // In a real implementation, this would send:
  // - Email notification
  // - In-app notification
  // - Push notification (if mobile app)
  // - SMS notification (for critical updates)
  
  // For now, we'll just log it and store in database
  try {
    await db('notifications').insert({
      user_id: userId,
      message,
      type,
      created_at: new Date()
    });
  } catch (error) {
    console.error('Failed to store notification:', error);
  }
}

// Notify users when a video becomes available
async function notifyVideoAvailable(lessonId) {
  try {
    // Get the lesson details
    const lesson = await db('lessons')
      .where({ id: lessonId })
      .select('id', 'title')
      .first();
      
    if (!lesson) {
      console.error('Lesson not found for notification');
      return;
    }

    // Get all users subscribed to notifications for this lesson
    const subscriptions = await db('video_availability_notifications as van')
      .join('users as u', 'van.user_id', 'u.id')
      .where('van.lesson_id', lessonId)
      .where('van.is_notified', false)
      .select('van.user_id', 'u.email', 'u.first_name', 'u.last_name');

    // Send notifications to each subscribed user
    for (const subscription of subscriptions) {
      const message = `The video for lesson "${lesson.title}" is now available for viewing.`;
      
      await sendNotification(
        subscription.user_id,
        message,
        'video_available'
      );
      
      // Mark as notified
      await db('video_availability_notifications')
        .where({ user_id: subscription.user_id, lesson_id: lessonId })
        .update({ 
          is_notified: true,
          notified_at: new Date()
        });
    }
    
    console.log(`Sent ${subscriptions.length} notifications for lesson ${lessonId}`);
  } catch (error) {
    console.error('Failed to send video availability notifications:', error);
  }
}

// Check for newly available videos and send notifications
async function checkAndNotifyVideos() {
  try {
    // This function would typically be called by a cron job or background task
    // For now, we'll just log that it's running
    console.log('Checking for newly available videos...');
    
    // In a real implementation, this would:
    // 1. Check for recently uploaded videos
    // 2. Find subscriptions for those videos
    // 3. Send notifications to subscribed users
  } catch (error) {
    console.error('Error in video notification check:', error);
  }
}

module.exports = {
  sendNotification,
  notifyVideoAvailable,
  checkAndNotifyVideos
};