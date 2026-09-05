const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// ── Send booking confirmation to customer ────────────────────────────────────
const sendBookingConfirmation = async (booking) => {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your@email.com') {
    console.log(`[Email SKIP] No SMTP configured — booking ref: ${booking.bookingRef}`);
    return;
  }

  const transporter = createTransporter();
  const { customer, flight, bookingRef, payment } = booking;

  const formatPrice = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8" />
    <style>
      body { font-family: Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
      .header { background: linear-gradient(135deg, #1d4ed8, #1e3a8a); color: white; padding: 32px 40px; }
      .header h1 { margin: 0; font-size: 24px; }
      .header p { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
      .ref-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; margin: 24px 40px; text-align: center; }
      .ref-box .ref { font-size: 28px; font-weight: 900; color: #1d4ed8; letter-spacing: 3px; }
      .section { padding: 0 40px 24px; }
      .section h2 { font-size: 16px; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
      .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
      .label { color: #6b7280; }
      .value { font-weight: 600; color: #111827; }
      .flight-box { background: #f0f9ff; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
      .flight-times { display: flex; align-items: center; gap: 16px; margin: 12px 0; }
      .time { font-size: 28px; font-weight: 900; color: #111827; }
      .route { color: #6b7280; font-size: 13px; }
      .arrow { color: #3b82f6; font-size: 20px; }
      .footer { background: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; }
      .notice { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #92400e; margin: 0 40px 24px; }
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✈ Booking Request Received</h1>
          <p>FareOracle — Your journey starts here</p>
        </div>

        <div class="ref-box">
          <p style="margin:0 0 4px; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:1px;">Your Booking Reference</p>
          <div class="ref">${bookingRef}</div>
          <p style="margin:6px 0 0; font-size:12px; color:#3b82f6;">Please save this for your records</p>
        </div>

        <div class="section">
          <h2>Flight Details</h2>
          <div class="flight-box">
            <p style="margin:0 0 4px; font-size:13px; color:#6b7280;">${flight.airline} · ${flight.flightNumber}</p>
            <div class="flight-times">
              <div>
                <div class="time">${flight.departureTime}</div>
                <div class="route">${flight.from}</div>
              </div>
              <div class="arrow">→</div>
              <div>
                <div class="time">${flight.arrivalTime}</div>
                <div class="route">${flight.to}</div>
              </div>
            </div>
            <div class="row"><span class="label">Date</span><span class="value">${flight.date}</span></div>
            <div class="row"><span class="label">Duration</span><span class="value">${flight.duration}</span></div>
            <div class="row"><span class="label">Stops</span><span class="value">${flight.stops === 0 ? 'Non-stop' : flight.stops + ' stop(s)'}</span></div>
            <div class="row"><span class="label">Cabin</span><span class="value">${flight.cabinClass}</span></div>
          </div>
        </div>

        <div class="section">
          <h2>Booking Summary</h2>
          <div class="row"><span class="label">Customer</span><span class="value">${customer.name}</span></div>
          <div class="row"><span class="label">Email</span><span class="value">${customer.email}</span></div>
          <div class="row"><span class="label">Phone</span><span class="value">${customer.phone}</span></div>
          <div class="row"><span class="label">Total Paid</span><span class="value">${formatPrice(payment.amount)}</span></div>
          <div class="row"><span class="label">Payment Status</span><span class="value" style="color:#16a34a; text-transform:capitalize;">${payment.status}</span></div>
        </div>

        <div class="notice">
          <strong>What happens next?</strong> Our team will review your booking and call you at <strong>${customer.phone}</strong> to confirm. Your e-ticket will be emailed once fully confirmed.
        </div>

        <div class="footer">
          <p>Questions? Call us at <strong>Toll Free # +1 888 584 4337</strong> or email <strong>Info@fareoracle.com</strong></p>
          <p style="margin-top:8px;">626 Wilshire Blvd Suite 410, Los Angeles, CA 90017</p>
          <p style="margin-top:8px;">© 2026 FareOracle. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'FareOracle <Info@fareoracle.com>',
    to: customer.email,
    subject: `✈ Booking Confirmed — ${bookingRef} | ${flight.from} → ${flight.to}`,
    html,
  });

  console.log(`[Email SENT] Confirmation to ${customer.email}`);
};

// ── Send new-booking alert to admin ──────────────────────────────────────────
const sendAdminAlert = async (booking) => {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your@email.com') {
    console.log(`[Email SKIP] No SMTP — admin alert skipped`);
    return;
  }

  const transporter = createTransporter();
  const { customer, flight, bookingRef, payment } = booking;
  const formatPrice = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'FareOracle <Info@fareoracle.com>',
    to: process.env.ADMIN_EMAIL || 'Info@fareoracle.com',
    subject: `🔔 New Booking — ${bookingRef} | ${customer.name} | ${formatPrice(payment.amount)}`,
    html: `
      <h2>New Booking Request</h2>
      <p><strong>Ref:</strong> ${bookingRef}</p>
      <p><strong>Customer:</strong> ${customer.name} | ${customer.email} | ${customer.phone}</p>
      <p><strong>Route:</strong> ${flight.from} → ${flight.to} on ${flight.date}</p>
      <p><strong>Flight:</strong> ${flight.airline} ${flight.flightNumber}</p>
      <p><strong>Amount:</strong> ${formatPrice(payment.amount)} — <strong>${payment.status.toUpperCase()}</strong></p>
          <p><a href="https://www.fareoracle.com/admin/bookings">View in Admin Panel →</a></p>
    `,
  });

  console.log(`[Email SENT] Admin alert for ${bookingRef}`);
};

module.exports = { sendBookingConfirmation, sendAdminAlert };
