const express = require('express');
const router = express.Router();
const knowledgeBaseController = require('../controllers/knowledgeBaseController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin', 'super_admin']));

router.get('/', knowledgeBaseController.getDocuments);
router.post('/upload', knowledgeBaseController.uploadMiddleware, knowledgeBaseController.uploadDocument);
router.delete('/:id', knowledgeBaseController.deleteDocument);

module.exports = router;
