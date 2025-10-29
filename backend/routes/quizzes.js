const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

// Quiz question management (teachers only)
router.post('/lessons/:lessonId/questions', requirePermission('lesson:create'), quizController.createQuestion);
router.get('/lessons/:lessonId/questions', quizController.getLessonQuestions);

// Quiz taking (all authenticated users)
router.post('/questions/:questionId/answer', quizController.submitAnswer);
router.post('/lessons/:lessonId/start', quizController.startQuizSession);
router.post('/sessions/:sessionId/complete', quizController.completeQuizSession);
router.get('/lessons/:lessonId/results', quizController.getQuizResults);

// Progress tracking
router.get('/lessons/:lessonId/progress', quizController.getLessonProgress);

module.exports = router;
