const express = require('express');
const router = express.Router();
const {
    submitJournal,
    getJournals,
    getJournal,
    updateJournalStatus,
    deleteJournal
} = require('../controllers/journalController');
const upload = require('../config/multer');

// Submit a new journal
router.post("/", upload.single("file"), submitJournal);

// Get all journals
router.get('/', getJournals);

// Get single journal
router.get('/:id', getJournal);

// Update journal status
router.put('/:id/status', updateJournalStatus);

// Delete journal
router.delete('/:id', deleteJournal);

module.exports = router;