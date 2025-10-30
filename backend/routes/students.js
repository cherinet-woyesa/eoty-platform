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

router.use(authenticateToken);

// GET /api/students?q=&status=&sort=&order=
router.get('/', studentsController.listStudents);

// Invite and message endpoints (stubs; can be backed by migrations later)
router.post('/invite', studentsController.inviteStudent);
router.post('/:studentId/message', studentsController.messageStudent);

module.exports = router;


