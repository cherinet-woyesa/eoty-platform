const express = require('express');
const router = express.Router();
const interactiveController = require('../controllers/interactiveController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticateToken);

// Quiz routes
router.get('/lessons/:lessonId/quizzes', interactiveController.getLessonQuizzes);
router.get('/quizzes/:quizId/questions', interactiveController.getQuizQuestions);
router.post('/quizzes/:quizId/attempt', interactiveController.submitQuizAttempt);
router.get('/quizzes/:quizId/take', requirePermission('quiz:take'), interactiveController.getQuizForTaking);

// Annotation routes
router.post('/annotations', interactiveController.createAnnotation);
router.get('/lessons/:lessonId/annotations', interactiveController.getLessonAnnotations);

// Discussion routes
router.post('/discussions', requirePermission('discussion:create'), interactiveController.createDiscussionPost);
router.get('/lessons/:lessonId/discussions', interactiveController.getLessonDiscussions);

// Progress routes
router.post('/lessons/:lessonId/progress', interactiveController.updateLessonProgress);
router.get('/lessons/:lessonId/progress', interactiveController.getLessonProgress);
router.get('/quiz-attempts/:attemptId/results', interactiveController.getQuizResults);

module.exports = router;