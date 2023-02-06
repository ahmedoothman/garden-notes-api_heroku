const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
    },
    body: {
        type: String,
        required: [true, 'Note requiered'],
    },
    photo: {
        type: String,
        default:
            'https://firebasestorage.googleapis.com/v0/b/garden-notes.appspot.com/o/gardens%2Fdefault.jpeg?alt=media&token=4f266e72-d644-44c6-8d24-fdd94738333f',
    },
    Type: {
        type: String,
        required: [true, 'please provide season type'],
        enum: ['winter', 'summer'],
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Inventory item must belong to user'],
    },
});
noteSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'name',
    });
    next();
});
const Note = mongoose.model('Note', noteSchema);
module.exports = Note;
