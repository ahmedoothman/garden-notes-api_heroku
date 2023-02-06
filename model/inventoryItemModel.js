const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'The garden item must have a name'],
        trim: true,
    },
    buyDate: Date,
    quantity: Number,
    photo: {
        type: String,
        default:
            'https://firebasestorage.googleapis.com/v0/b/garden-notes.appspot.com/o/gardens%2Fdefault.jpeg?alt=media&token=4f266e72-d644-44c6-8d24-fdd94738333f',
    },
    available: {
        type: Boolean,
        default: true,
    },
    createdDate: {
        type: Date,
        default: new Date(),
    },
    Type: {
        type: String,
        required: [true, 'please provide plant type'],
        enum: ['soil', 'seeds', 'fertilizers', 'pots'],
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Inventory item must belong to user'],
    },
});

inventoryItemSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'name',
    });
    next();
});

const Inventory = mongoose.model('Inventory', inventoryItemSchema);

module.exports = Inventory;
