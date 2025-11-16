/**
 * FR7: Chapter Routes
 * REQUIREMENT: Multi-city/chapter membership, location/topic based
 */

const express = require('express');
const router = express.Router();
const chapterController = require('../controllers/chapterController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/', chapterController.getAllChapters);
router.get('/search', chapterController.searchChapters);

// Protected routes
router.use(authenticateToken); // All routes below require authentication

router.get('/user', chapterController.getUserChapters);
router.post('/join', chapterController.joinChapter);
router.post('/leave', chapterController.leaveChapter);
router.post('/primary', chapterController.setPrimaryChapter);
router.get('/:id', chapterController.getChapterById);

module.exports = router;