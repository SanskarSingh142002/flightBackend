const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// ── Verify JWT ────────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token — please log in' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Try DB first; fall back to token payload when DB is unavailable
    let user = null;
    try {
      user = await User.findById(decoded.id).select('-password');
    } catch (_) {}

    if (!user) {
      // No DB — reconstruct a minimal user from the token payload
      user = { _id: decoded.id, name: decoded.name, role: decoded.role, username: decoded.username };
    }

    if (user.isActive === false) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired — please log in again' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ── Role guard — usage: restrictTo('admin') ───────────────────────────────────
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}`,
    });
  }
  next();
};

module.exports = { protect, restrictTo };
