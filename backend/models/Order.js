const mongoose = require('mongoose');

// Define the schema for Order
const OrderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // This references the User model
        required: true,
    },
    businessProfile: {
        companyName: {
            type: String,
            required: true,
            trim: true // Trims whitespace
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true // Converts email to lowercase
        },
    },
    items: [
        {
            category: {
                type: String,
                required: true,
                trim: true
            },
            material: {
                type: String,
                required: true,
                trim: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1 // Ensures at least 1 item
            },
            pricePerUnit: {
                type: Number,
                required: true,
                min: 0 // Ensures price is non-negative
            },
            totalPrice: {
                type: Number,
                required: true,
                min: 0 // Ensures total price is non-negative
            },
        }
    ],
    totalPrice: {
        type: Number,
        required: true,
        min: 0 // Ensures total price is non-negative
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

// Export the Order model
module.exports = mongoose.model('Order', OrderSchema);
