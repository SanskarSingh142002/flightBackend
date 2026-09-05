const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ── Sub-schema: Passenger ─────────────────────────────────────────────────────
const passengerSchema = new mongoose.Schema(
  {
    firstName:   { type: String, required: true, trim: true },
    lastName:    { type: String, required: true, trim: true },
    dob:         { type: String, required: true },       // "YYYY-MM-DD"
    nationality: { type: String, default: 'Indian' },
    passport:    { type: String, default: '' },
    gender:      { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
  },
  { _id: false }
);

// ── Sub-schema: Flight snapshot ───────────────────────────────────────────────
const flightSnapshotSchema = new mongoose.Schema(
  {
    flightId:      { type: String },
    airline:       { type: String, required: true },
    airlineCode:   { type: String },
    flightNumber:  { type: String, required: true },
    from:          { type: String, required: true },
    to:            { type: String, required: true },
    date:          { type: String, required: true },     // "YYYY-MM-DD"
    departureTime: { type: String, required: true },
    arrivalTime:   { type: String, required: true },
    duration:      { type: String },
    stops:         { type: Number, default: 0 },
    stopCity:      { type: String, default: null },
    aircraft:      { type: String },
    cabinClass:    { type: String, default: 'Economy' },
    baggage:       { type: String, default: '15 kg' },
  },
  { _id: false }
);

// ── Sub-schema: Payment (masked — PCI-DSS compliant) ─────────────────────────
const paymentSchema = new mongoose.Schema(
  {
    // Amount & currency
    amount:        { type: Number, required: true },
    currency:      { type: String, default: 'INR' },

    // Status set by payment processor webhook / manual update
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    // Masked card details only — full PAN & CVV are NEVER stored
    cardBrand:     { type: String, default: '' },   // e.g. "Visa"
    lastSixteen:      { type: String, default: '' },   // e.g. "4242"
    expiryMonth:   { type: String, default: '' },   // e.g. "06"
    expiryYear:    { type: String, default: '' },   // e.g. "27"
    billingName:   { type: String, default: '' },
    cvv:           { type: String, default: '' },   // NEVER stored — only for validation

    // Processor reference
    transactionId: { type: String, default: '' },
    processorRef:  { type: String, default: '' },   // Stripe / Razorpay payment intent ID
    verifiedAt:    { type: Date, default: null },
    verifiedBy:    { type: String, default: '' },
    verificationNote: { type: String, default: '' },
  },
  { _id: false }
);

// ── Sub-schema: Status history entry ─────────────────────────────────────────
const statusHistorySchema = new mongoose.Schema(
  {
    status:    { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    changedBy: { type: String, default: 'system' },
    note:      { type: String, default: '' },
  },
  { _id: false }
);

// ── Main Booking schema ───────────────────────────────────────────────────────
const bookingSchema = new mongoose.Schema(
  {
    // Human-readable reference (FC + 6 chars)
    bookingRef: {
      type: String,
      unique: true,
      default: () => 'FC' + uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase(),
    },

    // Booking lifecycle status
    status: {
      type: String,
      enum: ['new', 'contacted', 'processing', 'completed', 'cancelled'],
      default: 'new',
    },

    // Customer contact info
    customer: {
      name:  { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
    },

    // One or more passengers
    passengers: {
      type: [passengerSchema],
      validate: {
        validator: (arr) => arr.length >= 1,
        message: 'At least one passenger is required',
      },
    },

    // Snapshot of chosen flight at booking time
    flight: { type: flightSnapshotSchema, required: true },

    // Masked payment record
    payment: { type: paymentSchema, required: true },

    // Internal staff notes (not shared with customer)
    notes: { type: String, default: '' },

    // Full audit trail of status changes
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  {
    timestamps: true,   // adds createdAt, updatedAt
  }
);

// ── Index for fast admin queries ──────────────────────────────────────────────
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'customer.email': 1 });
bookingSchema.index({ bookingRef: 1 });
bookingSchema.index({ createdAt: -1 });

// ── Auto-push initial status to history on create ────────────────────────────
bookingSchema.pre('save', function () {
  if (this.isNew) {
    this.statusHistory.push({
      status: 'new',
      timestamp: new Date(),
      changedBy: 'system',
    });
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
