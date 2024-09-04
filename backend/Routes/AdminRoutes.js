// Routes/AdminRoutes.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
// Get all scrap items
router.get('/scrap-items', async (req, res) => {
    try {
        const scrapItems = await mongoose.connection.db.collection('scraps').find({}).toArray();
        res.json(scrapItems);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

// Update scrap item
router.put('/scrap-items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        const result = await mongoose.connection.db.collection('scraps').updateOne(
            { _id: new mongoose.Types.ObjectId(id) },
            { $set: updatedData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Scrap item not found' });
        }

        res.json({ message: 'Scrap item updated successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find({});
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
