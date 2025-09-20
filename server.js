// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const OWNER_EMAIL = process.env.OWNER_EMAIL || process.env.EMAIL_USER;

// --- MongoDB connect ---
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// --- Schema ---
const bookingSchema = new mongoose.Schema({
  customer_name: String,
  customer_email: String,
  customer_phone: String,
  appointment_date: String,
  service_category: String,
  service_name: String,
  special_requests: String,
  booking_time: String
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

// --- Email transporter (SMTP) ---
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- API route ---
app.post('/api/bookings', async (req, res) => {
  try {
    const data = req.body;
    // basic validation
    if (!data.customer_name || !data.customer_email || !data.appointment_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // save to DB
    const booking = new Booking({
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      appointment_date: data.appointment_date,
      service_category: data.service_category,
      service_name: data.service_name,
      special_requests: data.special_requests,
      booking_time: data.booking_time
    });
    await booking.save();

    // send email to owner
    const ownerHtml = `
      <h3>New Booking Received</h3>
      <p><strong>Name:</strong> ${data.customer_name}</p>
      <p><strong>Email:</strong> ${data.customer_email}</p>
      <p><strong>Phone:</strong> ${data.customer_phone}</p>
      <p><strong>Service:</strong> ${data.service_name} (${data.service_category})</p>
      <p><strong>Date:</strong> ${data.appointment_date}</p>
      <p><strong>Requests:</strong> ${data.special_requests || '—'}</p>
      <p><strong>Booked at:</strong> ${data.booking_time}</p>
    `;

    await transporter.sendMail({
      from: `"Luxe Royale" <${process.env.EMAIL_USER}>`,
      to: OWNER_EMAIL,
      subject: 'New Booking Received',
      html: ownerHtml
    });

    // send confirmation to customer
    const customerHtml = `
      <h3>Thank you for booking with Luxe Royale</h3>
      <p>Hi ${data.customer_name},</p>
      <p>Your booking for <b>${data.service_name}</b> on <b>${data.appointment_date}</b> has been received.</p>
      <p>We will contact you shortly to confirm details.</p>
      <p>— Luxe Royale</p>
    `;

    await transporter.sendMail({
      from: `"Luxe Royale" <${process.env.EMAIL_USER}>`,
      to: data.customer_email,
      subject: 'Booking Confirmation - Luxe Royale',
      html: customerHtml
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Error in /api/bookings:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// for single page app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
