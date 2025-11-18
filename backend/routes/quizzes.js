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

// Quiz Triggers (FR2 - In-lesson quiz integration)
router.get('/lessons/:lessonId/triggers', quizController.getQuizTriggers);
router.post('/lessons/:lessonId/triggers', requirePermission('lesson:create'), quizController.createQuizTrigger);
router.put('/triggers/:triggerId', requirePermission('lesson:create'), quizController.updateQuizTrigger);
router.delete('/triggers/:triggerId', requirePermission('lesson:create'), quizController.deleteQuizTrigger);

module.exports = router;
