const { searchLiveFlights } = require('../utils/liveFlights');

/**
 * POST /api/flights/search
 * Body: { from, to, departDate, passengers, cabinClass, tripType }
 *
 * Live provider responses are normalized so the frontend requires zero changes.
 */
const searchFlights = async (req, res, next) => {
  try {
    const { from, to, departDate, passengers = 1, cabinClass = 'Economy' } = req.body;

    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'from and to are required' });
    }
    if (from === to) {
      return res.status(400).json({ success: false, message: 'Departure and destination cannot be the same' });
    }
    if (!departDate) {
      return res.status(400).json({ success: false, message: 'departDate is required' });
    }

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(departDate) < today) {
      return res.status(400).json({ success: false, message: 'Departure date cannot be in the past' });
    }

    const count = Math.min(Math.max(parseInt(passengers) || 1, 1), 9);

    const flights = await searchLiveFlights({ from, to, departDate, passengers: count, cabinClass });
    if (!flights.length) {
      return res.status(503).json({
        success: false,
        message: 'Live flight search is not configured or returned no flights. Add a valid SerpAPI key and try again.',
      });
    }

    res.json({
      success: true,
      count: flights.length,
      data: flights,
      meta: { from, to, departDate, passengers: count, cabinClass },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/flights/airports?q=del — live airport autocomplete
const getAirports = async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const response = await fetch(`https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(query)}&locale=en&types[]=airport`);
    if (!response.ok) throw new Error(`Airport autocomplete failed (${response.status})`);

    const places = await response.json();
    const airports = places
      .filter((place) => place.type === 'airport' && place.code)
      .slice(0, 10)
      .map((place) => ({
        code: place.code,
        name: place.name || place.code,
        city: place.city_name || place.name || place.code,
        country: place.country_name || '',
      }));

    res.json({ success: true, data: airports });
  } catch (err) {
    next(err);
  }
};

module.exports = { searchFlights, getAirports };
