const express = require('express');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order'); // Adjust the path to your Order model
const router = express.Router();
require('dotenv').config();

const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');
const path = require('path'); // Import path module

const imagePath = path.join(__dirname, '../scan.jpg'); // Adjust relative path to the image

router.post('/place-order', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authorization token missing' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;

        const { businessProfile, items, totalPrice } = req.body;

        const order = new Order({
            userId,
            businessProfile,
            items,
            totalPrice,
        });

        await order.save();

        // Generate PDF for Customer
        const customerDoc = new PDFDocument({ size: 'A4', margin: 50 });
        const customerPdfStream = new PassThrough();
        customerDoc.pipe(customerPdfStream);

        // Profoma Invoice Heading with Blue Background
        customerDoc.fillColor('blue')
            .rect(0, customerDoc.y, customerDoc.page.width, 30)
            .fill();
        
        customerDoc.fillColor('white')
            .fontSize(20)
            .text('Profoma Invoice', { align: 'center', valign: 'middle' })
            .moveDown(2);

        // Business Profile Section with Blue Background
        customerDoc.fillColor('blue')
            .rect(0, customerDoc.y, customerDoc.page.width, 20)
            .fill();
        
        customerDoc.fillColor('white')
            .fontSize(16)
            .text('Business Profile', { align: 'center', valign: 'middle' })
            .moveDown(1);

        customerDoc.fontSize(12).fillColor('black')
            .text(`Company Name: ${businessProfile.companyName}`)
            .text(`Phone Number: ${businessProfile.phoneNumber}`)
            .text(`Email: ${businessProfile.email}`)
            .moveDown(1);

        // Order Details Section with Blue Background
        customerDoc.fillColor('blue')
            .rect(0, customerDoc.y, customerDoc.page.width, 20)
            .fill();
        
        customerDoc.fillColor('white')
            .fontSize(16)
            .text('Order Details', { align: 'center', valign: 'middle' })
            .moveDown(1);

        // Draw Table Header
        const tableTop = customerDoc.y + 20;
        const tablePadding = 10;
        const columnWidths = [100, 150, 100, 100, 100, 100];

        customerDoc.fontSize(12).fillColor('black');
        drawTableRow(customerDoc, tableTop, columnWidths, ['Type', 'Name', 'Required Qty', 'Price/Unit', 'Total Price'], true);

        // Draw Table Rows
        let rowTop = tableTop + 20;
        items.forEach(item => {
            drawTableRow(customerDoc, rowTop, columnWidths, [
                item.category,
                item.material,
                item.quantity,
                `$${item.pricePerUnit.toFixed(2)}`,
                `$${item.totalPrice.toFixed(2)}`
            ]);
            rowTop += 20;
        });

        // Total Price Section
        customerDoc.moveDown(2);
        customerDoc.fontSize(14).text(`Total Price (with GST): $${totalPrice.toFixed(2)}`, 50, customerDoc.y, {
            align: 'left', // Align the text to the left
            width: 500,    // Width of the text box, large enough to fit the text in one line
            continued: false,
        });

        // Add text above the image
        customerDoc.moveDown(2);
        customerDoc.fontSize(15).text('Scan and pay to purchase the product', {
            align: 'center'  // Center align the text
        });

        // Move down slightly to position the image below the text
        customerDoc.moveDown();

        // Get the width of the page and the image dimensions
        const pageWidth = customerDoc.page.width;
        const imageWidth = 200; // Width of the image (as set in the fit property)

        // Calculate the x position to center the image
        const imageX = (pageWidth - imageWidth) / 2;

        // Add the image below the text, centered horizontally
        customerDoc.image(imagePath, imageX, customerDoc.y, {
            fit: [200, 200],  // Adjust the size of the image as needed
        });

        customerDoc.end();

        const customerBuffers = [];
        customerPdfStream.on('data', chunk => customerBuffers.push(chunk));
        customerPdfStream.on('end', async () => {
            const customerPdfBuffer = Buffer.concat(customerBuffers);

            // Generate PDF for Admin (Without Scan Image and Text)
            const adminDoc = new PDFDocument({ size: 'A4', margin: 50 });
            const adminPdfStream = new PassThrough();
            adminDoc.pipe(adminPdfStream);

            // Profoma Invoice Heading with Blue Background
            adminDoc.fillColor('blue')
                .rect(0, adminDoc.y, adminDoc.page.width, 30)
                .fill();
            
            adminDoc.fillColor('white')
                .fontSize(20)
                .text('Profoma Invoice', { align: 'center', valign: 'middle' })
                .moveDown(2);

            // Business Profile Section with Blue Background
            adminDoc.fillColor('blue')
                .rect(0, adminDoc.y, adminDoc.page.width, 20)
                .fill();
            
            adminDoc.fillColor('white')
                .fontSize(16)
                .text('Business Profile', { align: 'center', valign: 'middle' })
                .moveDown(1);

            adminDoc.fontSize(12).fillColor('black')
                .text(`Company Name: ${businessProfile.companyName}`)
                .text(`Phone Number: ${businessProfile.phoneNumber}`)
                .text(`Email: ${businessProfile.email}`)
                .moveDown(1);

            // Order Details Section with Blue Background
            adminDoc.fillColor('blue')
                .rect(0, adminDoc.y, adminDoc.page.width, 20)
                .fill();
            
            adminDoc.fillColor('white')
                .fontSize(16)
                .text('Order Details', { align: 'center', valign: 'middle' })
                .moveDown(1);

            // Draw Table Header
            const adminTableTop = adminDoc.y + 20;

            adminDoc.fontSize(12).fillColor('black');
            drawTableRow(adminDoc, adminTableTop, columnWidths, ['Type', 'Name', 'Required Qty', 'Price/Unit', 'Total Price'], true);

            // Draw Table Rows
            let adminRowTop = adminTableTop + 20;
            items.forEach(item => {
                drawTableRow(adminDoc, adminRowTop, columnWidths, [
                    item.category,
                    item.material,
                    item.quantity,
                    `$${item.pricePerUnit.toFixed(2)}`,
                    `$${item.totalPrice.toFixed(2)}`
                ]);
                adminRowTop += 20;
            });

            // Total Price Section
            adminDoc.moveDown(2);
            adminDoc.fontSize(14).text(`Total Price (with GST): $${totalPrice.toFixed(2)}`, 50, adminDoc.y, {
                align: 'left', // Align the text to the left
                width: 500,    // Width of the text box, large enough to fit the text in one line
                continued: false,
            });

            adminDoc.end();

            const adminBuffers = [];
            adminPdfStream.on('data', chunk => adminBuffers.push(chunk));
            adminPdfStream.on('end', async () => {
                const adminPdfBuffer = Buffer.concat(adminBuffers);

                // Nodemailer transport
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });

                // Email to customer
                const customerMailOptions = {
                    from: process.env.EMAIL_USER,
                    to: businessProfile.email, // Customer's email
                    subject: 'Order Confirmation',
                    text: 'Thank you for your order. Please find the attached PDF for details.',
                    attachments: [
                        {
                            filename: `order_${order._id}.pdf`,
                            content: customerPdfBuffer,
                            contentType: 'application/pdf',
                        },
                    ],
                };

                // Email to admin
                const adminMailOptions = {
                    from: process.env.EMAIL_USER,
                    to: process.env.ADMIN_EMAIL, // Admin's email from .env
                    subject: `New Order Received: ${order._id}`,
                    text: `A new order has been placed by ${businessProfile.companyName}. Please find the attached PDF for order details.`,
                    attachments: [
                        {
                            filename: `order_${order._id}.pdf`,
                            content: adminPdfBuffer,
                            contentType: 'application/pdf',
                        },
                    ],
                };

                // Send emails
                transporter.sendMail(customerMailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending email to customer:', error);
                        return res.status(500).json({ message: 'Error sending email to customer' });
                    }
                    console.log('Email sent to customer:', info.response);

                    // Send email to admin after customer mail is sent
                    transporter.sendMail(adminMailOptions, (adminError, adminInfo) => {
                        if (adminError) {
                            console.error('Error sending email to admin:', adminError);
                            return res.status(500).json({ message: 'Error sending email to admin' });
                        }
                        console.log('Email sent to admin:', adminInfo.response);
                        res.status(201).json({ success: true, message: 'Order placed successfully', orderId: order._id });
                    });
                });
            });
        });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

function drawTableRow(doc, y, columnWidths, row, isHeader = false) {
    const padding = 3;
    const startX = 35;
    let x = startX;

    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(11);

    row.forEach((text, i) => {
        doc.rect(x, y, columnWidths[i], 20).stroke();
        doc.text(text, x + padding, y + padding, {
            width: columnWidths[i] - padding * 2,
            align: 'center',
        });
        x += columnWidths[i];
    });
}

// Get all orders for the logged-in user
router.get('/my-orders', async (req, res) => {
    try {
        // Extract token from Authorization header
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authorization token missing' });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;

        // Find all orders for the user
        const orders = await Order.find({ userId });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
