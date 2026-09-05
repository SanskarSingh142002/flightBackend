const express = require('express');
const { login, signup, getMe, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', validate(['password']), login);

// POST /api/auth/signup
router.post('/signup', validate(['name', 'email', 'phone', 'password']), signup);

// GET  /api/auth/me   (protected)
router.get('/me', protect, getMe);

// POST /api/auth/logout
router.post('/logout', protect, logout);

module.exports = router;
