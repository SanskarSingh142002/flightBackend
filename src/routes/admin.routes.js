const express = require('express');
const {
  getAllBookings,
  getBookingById,
  updateStatus,
  updateNotes,
  updatePaymentStatus,
  getDashboard,
} = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

// All admin routes require a valid JWT
router.use(protect);
// All admin routes require admin OR staff role
router.use(restrictTo('admin', 'staff'));

// GET  /api/admin/dashboard
router.get('/dashboard', getDashboard);

// GET  /api/admin/bookings          — paginated list with filters
router.get('/bookings', getAllBookings);

// GET  /api/admin/bookings/:id      — single booking detail
router.get('/bookings/:id', getBookingById);

// PATCH /api/admin/bookings/:id/status — update booking status (admin only for cancel/complete)
router.patch('/bookings/:id/status', updateStatus);

// PATCH /api/admin/bookings/:id/notes  — save internal notes
router.patch('/bookings/:id/notes', updateNotes);

// PATCH /api/admin/bookings/:id/payment — verify payment with processor details
router.patch('/bookings/:id/payment', updatePaymentStatus);

module.exports = router;
