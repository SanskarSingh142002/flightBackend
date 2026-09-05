const Booking = require('../models/Booking.model');

const isDbReady = () => {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
};

// ── Helper: get bookings from MongoDB ─────────────────────────────────────────
const getBookingsSource = async (filter = {}, options = {}) => {
  if (!isDbReady()) {
    throw new Error('Database is unavailable');
  }

  const { sort = { createdAt: -1 }, skip = 0, limit = 0 } = options;
  const query = Booking.find(filter).sort(sort);
  if (skip) query.skip(skip);
  if (limit) query.limit(limit);
  return query.exec();
};

// ── GET /api/admin/bookings ───────────────────────────────────────────────────
const getAllBookings = async (req, res, next) => {
  try {
    const {
      status, paymentStatus, search,
      page = 1, limit = 10,
      sortField = 'createdAt', sortDir = 'desc',
    } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (paymentStatus && paymentStatus !== 'all') filter['payment.status'] = paymentStatus;
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [
        { bookingRef: q },
        { 'customer.name': q },
        { 'customer.email': q },
        { 'flight.from': q },
        { 'flight.to': q },
      ];
    }

    const sortOrder = sortDir === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let bookings, total;

    if (!isDbReady()) {
      return res.status(503).json({ success: false, message: 'Database is unavailable.' });
    }

    [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: bookings,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/bookings/:id ───────────────────────────────────────────────
const getBookingById = async (req, res, next) => {
  try {
    let booking;

    if (!isDbReady()) {
      return res.status(503).json({ success: false, message: 'Database is unavailable.' });
    }

    booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/bookings/:id/status ─────────────────────────────────────
const updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const VALID = ['new', 'contacted', 'processing', 'completed', 'cancelled'];

    if (!VALID.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${VALID.join(', ')}` });
    }

    if (!isDbReady()) {
      return res.status(503).json({ success: false, message: 'Database is unavailable.' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = status;
    booking.statusHistory.push({
      status,
      timestamp: new Date(),
      changedBy: req.user?.name || req.user?.username || 'admin',
      note: note || '',
    });
    await booking.save();

    res.json({ success: true, message: 'Status updated', data: booking });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/bookings/:id/notes ──────────────────────────────────────
const updateNotes = async (req, res, next) => {
  try {
    const { notes } = req.body;

    if (!isDbReady()) {
      return res.status(503).json({ success: false, message: 'Database is unavailable.' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { notes },
      { new: true, runValidators: false }
    );
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.json({ success: true, message: 'Notes saved', data: { notes: booking.notes } });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/bookings/:id/payment ────────────────────────────────────
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { status, note = '' } = req.body;
    const VALID = ['pending', 'paid', 'failed', 'refunded'];

    if (!VALID.includes(status)) {
      return res.status(400).json({ success: false, message: `payment status must be one of: ${VALID.join(', ')}` });
    }
    if (!isDbReady()) {
      return res.status(503).json({ success: false, message: 'Database is unavailable.' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.payment.status = status;
    booking.payment.verifiedAt = new Date();
    booking.payment.verifiedBy = req.user?.name || req.user?.username || 'admin';
    booking.payment.verificationNote = note;
    await booking.save();

    res.json({
      success: true,
      message: `Payment marked ${status}`,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/dashboard ──────────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    if (!isDbReady()) {
      return res.status(503).json({ success: false, message: 'Database is unavailable.' });
    }

    const all = await Booking.find({});
    res.json({ success: true, data: buildStats(all) });
  } catch (err) {
    next(err);
  }
};

function buildStats(bookings) {
  const total = bookings.length;
  const revenue = bookings
    .filter((b) => b.payment.status === 'paid')
    .reduce((s, b) => s + b.payment.amount, 0);

  const byStatus = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  const byPayment = bookings.reduce((acc, b) => {
    acc[b.payment.status] = (acc[b.payment.status] || 0) + 1;
    return acc;
  }, {});

  const revenueByPayment = bookings.reduce((acc, b) => {
    acc[b.payment.status] = (acc[b.payment.status] || 0) + b.payment.amount;
    return acc;
  }, {});

  const recent = [...bookings]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const allBookings = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { total, revenue, byStatus, byPayment, revenueByPayment, recent, bookings: allBookings };
}

module.exports = { getAllBookings, getBookingById, updateStatus, updateNotes, updatePaymentStatus, getDashboard };
