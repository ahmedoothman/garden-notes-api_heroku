const express = require('express');
const noteController = require('./../controllers/noteController');
const authController = require('./../controllers/authController');
const router = express.Router();

router.use(authController.protect, noteController.setUserId);
router
    .route('/')
    .post(
        noteController.uploadNotePhoto,
        noteController.resizeNotePhoto,
        noteController.createNote
    );
router.route('/myNotes').get(noteController.getAllNotesUser);
router
    .route('/:id')
    .get(noteController.getNote)
    .patch(
        noteController.uploadNotePhoto,
        noteController.resizeNotePhoto,
        noteController.updateNote
    )
    .delete(noteController.deleteNote);
router
    .route('/')
    .get(authController.restrictTo('admin'), noteController.getAllNotes);
module.exports = router;
