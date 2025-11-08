const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');

const studentsController = require('../controllers/studentsController');

// SSE auth via token query param (EventSource cannot send Authorization header)
const sseTokenAuth = (req, res, next) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();
  jwt.verify(token, authConfig.jwtSecret, (err, user) => {
    if (err) return res.status(403).end();
    req.user = user;
    next();
  });
};

// SSE stream before global auth
router.get('/stream', sseTokenAuth, studentsController.streamUpdates);

// All student routes require authentication
router.use(authenticateToken);

// GET /api/students/dashboard - accessible by all authenticated users
router.get('/dashboard', studentsController.getStudentDashboard);

// GET /api/students?q=&status=&sort=&order= - list students (teachers and admins only)
const { requireRole } = require('../middleware/rbac');
router.get('/', requireRole(['teacher', 'admin']), studentsController.listStudents);

// Invite and message endpoints (teachers and admins only)
router.post('/invite', requireRole(['teacher', 'admin']), studentsController.inviteStudent);
router.post('/:studentId/message', requireRole(['teacher', 'admin']), studentsController.messageStudent);

module.exports = router;


