const express = require('express');
const { searchFlights, getAirports } = require('../controllers/flight.controller');

const router = express.Router();

// POST /api/flights/search
router.post('/search', searchFlights);

// GET  /api/flights/airports?q=del
router.get('/airports', getAirports);

module.exports = router;
