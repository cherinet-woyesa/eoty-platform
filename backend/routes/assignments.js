const express = require('express');
const router = express.Router();
const assignmentsController = require('../controllers/assignmentsController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { upload, handleUploadError } = require('../middleware/validation');

// All assignment routes require authentication
router.use(authenticateToken);

// Teacher/admin: list assignments
router.get('/', requireRole(['teacher', 'admin']), assignmentsController.listAssignments);

// Teacher/admin: create assignment
router.post('/', requireRole(['teacher', 'admin']), assignmentsController.createAssignment);

// Teacher/admin: get single assignment with submissions
router.get('/:assignmentId', requireRole(['teacher', 'admin']), assignmentsController.getAssignment);

// Teacher/admin: update assignment
router.put('/:assignmentId', requireRole(['teacher', 'admin']), assignmentsController.updateAssignment);

// Teacher/admin: publish assignment
router.post('/:assignmentId/publish', requireRole(['teacher', 'admin']), assignmentsController.publishAssignment);

// Teacher/admin: grade a submission
router.post(
  '/:assignmentId/submissions/:submissionId/grade',
  requireRole(['teacher', 'admin']),
  assignmentsController.gradeSubmission
);

// Student: list own assignments
router.get('/student/list', assignmentsController.listStudentAssignments);

// Student: submit assignment (allow file upload)
router.post('/:assignmentId/submit', upload.single('attachment'), assignmentsController.submitAssignment, handleUploadError);

// Student: presign attachment for direct S3 upload
router.post('/:assignmentId/presign-attachment', assignmentsController.presignAttachment);

module.exports = router;


