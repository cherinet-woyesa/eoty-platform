const db = require('../config/database');

// Rate limiting configuration
const RATE_LIMITS = {
  post: { max: 10, window: 60 * 60 * 1000 }, // 10 posts per hour
  comment: { max: 30, window: 60 * 60 * 1000 }, // 30 comments per hour
  like: { max: 50, window: 60 * 60 * 1000 }, // 50 likes per hour
  poll_vote: { max: 20, window: 60 * 60 * 1000 }, // 20 poll votes per hour
  attachment: { max: 5, window: 60 * 60 * 1000 }, // 5 attachments per hour
  report: { max: 10, window: 24 * 60 * 60 * 1000 }, // 10 reports per day
  course_create: { max: 5, window: 24 * 60 * 60 * 1000 }, // 5 courses per day
  bulk_operation: { max: 10, window: 60 * 60 * 1000 }, // 10 bulk operations per hour
};

const rateLimiter = (actionType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(); // Skip rate limiting for unauthenticated users
      }

      const limit = RATE_LIMITS[actionType];
      if (!limit) {
        return next(); // No rate limit for this action
      }

      const now = new Date();
      const windowStart = new Date(now.getTime() - limit.window);

      // Check current count in the time window
      const existingLimit = await db('rate_limits')
        .where({
          user_id: userId,
          action_type: actionType,
          window_start: windowStart
        })
        .first();

      if (existingLimit) {
        if (existingLimit.count >= limit.max) {
          // Rate limit exceeded
          const resetTime = new Date(windowStart.getTime() + limit.window);
          const remainingTime = Math.ceil((resetTime.getTime() - now.getTime()) / 1000 / 60); // minutes

          return res.status(429).json({
            success: false,
            message: `Rate limit exceeded. Try again in ${remainingTime} minutes.`,
            retry_after: remainingTime * 60, // seconds
            limit: limit.max,
            remaining: 0
          });
        }

        // Update existing record
        await db('rate_limits')
          .where({ id: existingLimit.id })
          .update({
            count: existingLimit.count + 1,
            last_action: now
          });
      } else {
        // Create new rate limit record
        await db('rate_limits').insert({
          user_id: userId,
          action_type: actionType,
          count: 1,
          window_start: windowStart,
          last_action: now
        });
      }

      // Add rate limit info to response headers
      res.set({
        'X-RateLimit-Limit': limit.max,
        'X-RateLimit-Remaining': existingLimit ? limit.max - existingLimit.count - 1 : limit.max - 1,
        'X-RateLimit-Reset': new Date(windowStart.getTime() + limit.window).getTime() / 1000
      });

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Don't block the request on rate limiter errors
      next();
    }
  };
};

// Specific rate limiters for different actions
const courseCreationLimiter = rateLimiter('course_create');
const bulkOperationLimiter = rateLimiter('bulk_operation');

module.exports = rateLimiter;
module.exports.courseCreationLimiter = courseCreationLimiter;
module.exports.bulkOperationLimiter = bulkOperationLimiter;