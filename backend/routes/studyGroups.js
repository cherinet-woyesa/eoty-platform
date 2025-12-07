const express = require('express');
const router = express.Router();
const studyGroupController = require('../controllers/studyGroupController');
const { authenticateToken } = require('../middleware/auth');

// Public: list public groups (auth optional)
router.get('/', studyGroupController.listGroups);

// Protected routes
router.post('/', authenticateToken, studyGroupController.createGroup);
router.post('/join', authenticateToken, studyGroupController.joinGroup);
router.post('/leave', authenticateToken, studyGroupController.leaveGroup);
router.get('/:id', authenticateToken, studyGroupController.getGroup);
router.get('/:id/messages', authenticateToken, studyGroupController.listMessages);
router.post('/:id/messages', authenticateToken, studyGroupController.postMessage);
router.get('/:id/assignments', authenticateToken, studyGroupController.listAssignments);
router.post('/:id/assignments', authenticateToken, studyGroupController.createAssignment);
router.get('/assignments/:assignmentId/submissions', authenticateToken, studyGroupController.listSubmissions);
router.post('/assignments/:assignmentId/submissions', authenticateToken, studyGroupController.submitAssignment);
router.post('/assignments/:assignmentId/submissions/:submissionId/grade', authenticateToken, studyGroupController.gradeSubmission);

module.exports = router;
