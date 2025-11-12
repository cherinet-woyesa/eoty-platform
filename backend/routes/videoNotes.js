// backend/routes/videoNotes.js
const express = require('express');
const router = express.Router();
const videoNotesController = require('../controllers/videoNotesController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Create a new note or bookmark
router.post('/lessons/:lessonId/notes', videoNotesController.createNote);

// Get all notes for a lesson (user's notes + public notes)
router.get('/lessons/:lessonId/notes', videoNotesController.getNotes);

// Get user's own notes for a lesson
router.get('/lessons/:lessonId/notes/my', videoNotesController.getUserNotes);

// Update a note
router.put('/lessons/:lessonId/notes/:noteId', videoNotesController.updateNote);

// Delete a note
router.delete('/lessons/:lessonId/notes/:noteId', videoNotesController.deleteNote);

// Get note statistics for a lesson
router.get('/lessons/:lessonId/notes/statistics', videoNotesController.getStatistics);

module.exports = router;


