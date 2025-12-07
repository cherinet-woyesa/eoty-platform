const express = require('express');
const router = express.Router();
const interactiveController = require('../controllers/interactiveController');
const pollController = require('../controllers/pollController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticateToken);

// Quiz routes
router.get('/lessons/:lessonId/quizzes', interactiveController.getLessonQuizzes);
router.get('/quizzes/:quizId/questions', interactiveController.getQuizQuestions);
router.post('/quizzes/:quizId/attempt', interactiveController.submitQuizAttempt);
router.get('/quizzes/:quizId/take', requirePermission('quiz:take'), interactiveController.getQuizForTaking);
router.get('/quizzes/:quizId/attempts', interactiveController.getUserQuizAttempts); // REQUIREMENT: Persistence verification

// Annotation routes
router.post('/annotations', interactiveController.createAnnotation);
router.get('/lessons/:lessonId/annotations', interactiveController.getLessonAnnotations);
router.get('/lessons/:lessonId/bookmarks', interactiveController.getLessonBookmarks);
router.get(
  '/lessons/:lessonId/summary',
  requirePermission('course:update'),
  interactiveController.getLessonSummary
);

// Discussion routes
router.post('/discussions', requirePermission('discussion:create'), interactiveController.createDiscussionPost);
router.get('/lessons/:lessonId/discussions', interactiveController.getLessonDiscussions);
router.post('/discussions/moderate', interactiveController.moderateDiscussionPost);
router.get('/discussions/flagged', interactiveController.getFlaggedPosts);
router.get('/discussions/moderation-stats', interactiveController.getDiscussionModerationStats); // REQUIREMENT: Enhanced moderation workflow
router.post('/discussions/report', interactiveController.reportDiscussionPost);

// Poll routes
router.post('/lessons/:lessonId/polls', pollController.createPoll);
router.get('/lessons/:lessonId/polls', pollController.getLessonPolls);
router.get('/polls/:pollId', pollController.getPoll);
router.post('/polls/:pollId/vote', pollController.submitPollResponse);
router.get('/polls/:pollId/results', pollController.getPollResults);
router.delete('/polls/:pollId', pollController.deletePoll);

// Progress routes
router.post('/lessons/:lessonId/progress', interactiveController.updateLessonProgress);
router.get('/lessons/:lessonId/progress', interactiveController.getLessonProgress);
router.get('/progress', interactiveController.getUserProgress);
router.get('/quiz-attempts/:attemptId/results', interactiveController.getQuizResults);

// Notification routes
router.get('/notifications', interactiveController.getUserNotifications);
router.post('/notifications/read', interactiveController.markNotificationAsRead);

// System validation routes (admin only)
router.get('/system/metrics', interactiveController.getSystemMetrics);
router.post('/system/validate', interactiveController.runAcceptanceValidation);
router.get('/system/validation-history', interactiveController.getValidationHistory);

module.exports = router;