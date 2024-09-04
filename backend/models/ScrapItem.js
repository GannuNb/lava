const mongoose = require('mongoose');
const { Schema } = mongoose;

const ScrapItemSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    material: {
        type: String,
        required: true
    },
    availableQuantity: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('ScrapItem', ScrapItemSchema);
