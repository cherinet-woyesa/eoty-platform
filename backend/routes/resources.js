const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { requireAuth } = require('../middleware/betterAuthMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(requireAuth);

// Resource browsing and filtering
router.get('/', resourceController.getResources);
router.get('/filters', resourceController.getFilters);

// Single resource operations
router.get('/:id', resourceController.getResource);
router.get('/:id/notes', resourceController.getNotes);
router.get('/:id/summary', resourceController.getSummary);
router.get('/:id/export', resourceController.exportContent);

// Note management
router.post('/notes', resourceController.createNote);

// Admin routes for resource management
router.post('/', 
  requirePermission('resource:create'), 
  upload.single('file'), 
  resourceController.createResource
);

router.put('/:id', 
  requirePermission('resource:edit_any'), 
  resourceController.updateResource
);

router.delete('/:id', 
  requirePermission('resource:delete_any'), 
  resourceController.deleteResource
);

module.exports = router;