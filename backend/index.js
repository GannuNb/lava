const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Models
const BusinessProfile = require('./models/BusinessProfile');
const User = require('./models/User');
const Order = require('./models/Order');

const app = express();
const port = 5000;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MongoDB connected successfully");
        startPeriodicSave();
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
    });

// Function to perform periodic save
const startPeriodicSave = () => {
    setInterval(async () => {
        try {
            const scrapItems = await mongoose.connection.db.collection("scraps").find({}).toArray();
            // const adminUsers = await mongoose.connection.db.collection("adminusers").find({}).toArray();
            global.scrap_items = scrapItems;
            // global.Adminusers = adminUsers;

            console.log("Data refreshed and saved:", scrapItems.length, "items.");
        } catch (err) {
            console.error("Error during periodic save:", err);
        }
    }, 9000); // 9 seconds
};

// Routes
app.get('/scrap', (req, res) => {
    res.json({
        scrap_items: global.scrap_items,
        // admin_users: global.Adminusers
    });
});

app.get('/api/business-profile', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;

        const user = await User.findById(userId);
        if (!user || !user.businessProfiles || user.businessProfiles.length === 0) {
            return res.status(404).json({ message: 'Business profile not found' });
        }

        const businessProfile = user.businessProfiles[0];

        res.json(businessProfile);
    } catch (error) {
        console.error('Error fetching business profile:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
});

app.post('/api/business-profile', async (req, res) => {
    try {
        const { companyName, phoneNumber, email, address } = req.body;

        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;

        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const newProfile = {
            companyName,
            phoneNumber,
            email,
            address
        };

        user.businessProfiles.push(newProfile);

        await user.save();

        res.status(201).json({ success: true, message: "Business profile created successfully" });

    } catch (error) {
        console.error("Error creating business profile:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    }
});

// Email transporter configuration


// Import Routes
app.use('/api', require('./Routes/CreateUser'));
app.use('/admin', require('./Routes/AdminRoutes'));
app.use('/api/orders', require('./Routes/OrderRoutes'));
app.use('/admin', require('./Routes/AdminRoutes'));



// Default route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
