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
router.post('/', chapterController.createChapter);
router.post('/apply-leadership', chapterController.applyLeadership);
router.get('/:id/members', chapterController.getChapterMembers);
router.put('/:id/members/:userId/status', chapterController.updateMemberStatus);
router.get('/:id/events', chapterController.getEvents);
router.post('/:id/events', chapterController.createEvent);
router.get('/:id/resources', chapterController.getChapterResources);
router.post('/:id/resources', chapterController.createChapterResource);
router.get('/:id/announcements', chapterController.getChapterAnnouncements);
router.post('/:id/announcements', chapterController.createChapterAnnouncement);
router.get('/events/:eventId/attendance', chapterController.getEventAttendance);
router.post('/events/:eventId/attendance', chapterController.markEventAttendance);
router.get('/:id', chapterController.getChapterById);

module.exports = router;