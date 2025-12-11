const express = require('express');
const router = express.Router();
const studyGroupController = require('../controllers/studyGroupController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Public with optional auth: list public groups and user's groups if token present
router.get('/', optionalAuth, studyGroupController.listGroups);

// Protected routes
router.post('/', authenticateToken, studyGroupController.createGroup);
router.delete('/:id', authenticateToken, studyGroupController.deleteGroup);
router.post('/join', authenticateToken, studyGroupController.joinGroup);
router.post('/leave', authenticateToken, studyGroupController.leaveGroup);
router.get('/:id', authenticateToken, studyGroupController.getGroup);
router.get('/:id/messages', authenticateToken, studyGroupController.listMessages);
router.post('/:id/messages', authenticateToken, studyGroupController.postMessage);
router.delete('/:id/messages/:messageId', authenticateToken, studyGroupController.deleteMessage);
router.put('/:id/messages/:messageId', authenticateToken, studyGroupController.editMessage);
router.post('/:id/messages/:messageId/like', authenticateToken, studyGroupController.toggleMessageLike);
router.post('/:id/messages/:messageId/report', authenticateToken, studyGroupController.reportMessage);
router.get('/:id/assignments', authenticateToken, studyGroupController.listAssignments);
router.post('/:id/assignments', authenticateToken, studyGroupController.createAssignment);
router.get('/assignments/:assignmentId/submissions', authenticateToken, studyGroupController.listSubmissions);
router.post('/assignments/:assignmentId/submissions', authenticateToken, studyGroupController.submitAssignment);
router.post('/assignments/:assignmentId/submissions/:submissionId/grade', authenticateToken, studyGroupController.gradeSubmission);

module.exports = router;
