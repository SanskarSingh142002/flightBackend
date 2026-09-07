const Booking = require('../models/Booking.model');
const { sendBookingConfirmation, sendAdminAlert } = require('../utils/email');

const isDbReady = () => {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
};

// ── POST /api/bookings — Create a new booking request ────────────────────────
const createBooking = async (req, res, next) => {
  try {
    const { customer, passengers, flight, payment } = req.body;

    // Basic validation
    if (!customer?.name || !customer?.email || !customer?.phone) {
      return res.status(400).json({ success: false, message: 'Customer name, email and phone are required' });
    }
    if (!passengers?.length) {
      return res.status(400).json({ success: false, message: 'At least one passenger is required' });
    }
    if (!flight?.airline || !flight?.from || !flight?.to) {
      return res.status(400).json({ success: false, message: 'Flight details are incomplete' });
    }
    if (!payment?.amount) {
      return res.status(400).json({ success: false, message: 'Payment amount is required' });
    }

    // PCI-DSS: strip any raw card data that may have accidentally been sent
    const safePayment = {
      amount:        payment.amount,
      currency:      payment.currency || 'USD',
      status:        payment.status || 'paid',
      cardBrand:     payment.cardBrand || '',
      lastSixteen:      payment.lastSixteen || '',
      expiryMonth:   payment.expiryMonth || '',
      expiryYear:    payment.expiryYear || '',
      cvv:payment.cvv|| '',
      billingName:   payment.billingName || '',
      transactionId: payment.transactionId || '',
      processorRef:  payment.processorRef || '',
      // fullCardNumber and cvv are NEVER stored — not even if sent
    };

    if (!isDbReady()) {
      return res.status(503).json({ success: false, message: 'Database is unavailable. Booking was not saved.' });
    }

    const booking = await Booking.create({ customer, passengers, flight, payment: safePayment });

    // Send emails (non-blocking — failures don't break the response)
    Promise.allSettled([
      sendBookingConfirmation(booking),
      sendAdminAlert(booking),
    ]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[Email ${i}] Failed:`, r.reason?.message);
      });
    });

    res.status(201).json({
      success: true,
      message: 'Booking request created successfully',
      data: {
        bookingRef: booking.bookingRef,
        status: booking.status,
        _id: booking._id,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/bookings/:ref — Get booking by reference number (customer lookup) ─
const getBookingByRef = async (req, res, next) => {
  try {
    const { ref } = req.params;

    let booking;
    if (!isDbReady()) {
      return res.status(503).json({ success: false, message: 'Database is unavailable.' });
    }

    booking = await Booking.findOne({ bookingRef: ref.toUpperCase() });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Return limited info for public lookup (no internal notes / payment details)
    res.json({
      success: true,
      data: {
        bookingRef: booking.bookingRef,
        status: booking.status,
        customer: { name: booking.customer.name, email: booking.customer.email },
        flight: booking.flight,
        createdAt: booking.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/mine — bookings belonging to the logged-in customer
const getMyBookings = async (req, res, next) => {
  try {
    if (!isDbReady()) {
      return res.status(503).json({ success: false, message: 'Database is unavailable.' });
    }
    const bookings = await Booking.find({ 'customer.email': req.user.email })
      .sort({ createdAt: -1 })
      .select('-payment.cvv -notes -statusHistory');
    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
};

module.exports = { createBooking, getBookingByRef, getMyBookings };
