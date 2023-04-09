const mongoose = require('mongoose');

const gardenItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'The garden item must have a name'],
        trim: true,
    },
    plantDate: Date,
    lastFertilizedDate: Date,
    lastWateredDate: Date,
    fertilizedType: {
        type: String,
        default: 'Not Specified',
    },
    soil: {
        type: String,
        default: 'Not Specified',
    },
    photo: {
        type: String,
        default:
            'https://firebasestorage.googleapis.com/v0/b/garden-notes.appspot.com/o/gardens%2Fdefault.jpeg?alt=media&token=4f266e72-d644-44c6-8d24-fdd94738333f',
    },
    createdDate: {
        type: Date,
        default: new Date(),
    },
    Type: {
        type: String,
        required: [true, 'please provide plant type'],
        enum: ['flowers', 'trees', 'vegetables'],
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Garden item must belong to user'],
    },
    note: String,
});

gardenItemSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'name',
    });
    next();
});

const Garden = mongoose.model('Garden', gardenItemSchema);

module.exports = Garden;
