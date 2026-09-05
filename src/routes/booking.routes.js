const express = require('express');
const { createBooking, getBookingByRef, getMyBookings } = require('../controllers/booking.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/bookings         — submit a booking request
router.post('/', createBooking);

// GET /api/bookings/mine — authenticated customer's booking history
router.get('/mine', protect, restrictTo('customer'), getMyBookings);

// GET  /api/bookings/:ref    — public lookup by booking reference
router.get('/:ref', getBookingByRef);

module.exports = router;
