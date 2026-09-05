const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// ── Generate JWT ──────────────────────────────────────────────────────────────
const signToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role, username: user.username },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const identity = (username || email || '').trim().toLowerCase();

    if (!identity || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    let user = null;

    // ── Try MongoDB ───────────────────────────────────────────────────────────
    try {
      user = await User.findOne({
        $or: [{ username: identity }, { email: identity }],
      }).select('+password');
      if (user) {
        const match = await user.comparePassword(password);
        if (!match) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        if (!user.isActive) {
          return res.status(401).json({ success: false, message: 'Account is deactivated' });
        }
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });
      }
    } catch (dbErr) {
      return res.status(503).json({ success: false, message: 'Database is unavailable. Please try again.' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user);
    const { password: _pw, ...safeUser } = user.toObject ? user.toObject() : user;

    res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/signup — Create a customer account
const signup = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!name?.trim() || !normalizedEmail || !phone?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, phone and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      username: normalizedEmail,
      email: normalizedEmail,
      phone: phone.trim(),
      password,
      role: 'customer',
    });

    const token = signToken(user);
    res.status(201).json({ success: true, token, user: user.toJSON() });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// POST /api/auth/logout  (stateless JWT — client just discards the token)
const logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = { login, signup, getMe, logout };
