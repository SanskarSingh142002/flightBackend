const IGNAV_URL = 'https://ignav.com';
const { convertToUSD } = require('./currency');

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatTime = (value) => value ? value.slice(11, 16) : '--:--';

const toFlight = async ({ itinerary, from, to, departDate, passengers }) => {
  const outbound = itinerary.outbound || {};
  const segments = outbound.segments || [];
  const first = segments[0] || {};
  const last = segments[segments.length - 1] || first;
  const rawCurrency = (
    itinerary.price?.currency ||
    itinerary.price?.currency_code ||
    itinerary.currency ||
    'USD'
  ).toUpperCase();
  const rawPricePerPerson = Number(itinerary.price?.amount ?? itinerary.price ?? 0);
  const pricePerPerson = await convertToUSD(rawPricePerPerson, rawCurrency);
  const durationMins = Number(
    outbound.duration_minutes ||
    segments.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  );

  return {
    id: itinerary.ignav_id,
    ignavId: itinerary.ignav_id,
    airline: outbound.carrier || first.operating_carrier_name || 'Airline',
    airlineCode: first.marketing_carrier_code || '',
    flightNumber: first.flight_number || '',
    from: first.departure_airport || from,
    to: last.arrival_airport || to,
    date: departDate,
    departureTime: formatTime(first.departure_time_local),
    arrivalTime: formatTime(last.arrival_time_local),
    duration: formatDuration(durationMins),
    durationMins,
    stops: Math.max(0, segments.length - 1),
    stopCity: segments[1]?.departure_airport || null,
    aircraft: first.aircraft || 'Aircraft unavailable',
    pricePerPerson,
    price: pricePerPerson * passengers,
    currency: 'USD',
    seatsLeft: null,
    cabinClass: itinerary.cabin_class || 'economy',
    baggage: itinerary.bags?.checked ? `${itinerary.bags.checked} checked bag` : 'Included',
    meal: false,
    refundable: false,
  };
};

// ── Mock data fallback (USD prices) ─────────────────────────────────────────
const AIRLINES_MOCK = [
  { code: 'AI', name: 'Air India' },
  { code: '6E', name: 'IndiGo' },
  { code: 'SG', name: 'SpiceJet' },
  { code: 'UK', name: 'Vistara' },
  { code: 'EK', name: 'Emirates' },
  { code: 'SQ', name: 'Singapore Airlines' },
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const fmtT = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const addMins = (time, mins) => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return fmtT(Math.floor(total / 60) % 24, total % 60);
};

const generateMockFlights = ({ from, to, departDate, passengers = 1 }) => {
  const intl = ['DXB', 'SIN', 'LHR', 'JFK', 'LGA', 'EWR', 'BKK', 'KUL'].includes(from) ||
               ['DXB', 'SIN', 'LHR', 'JFK', 'LGA', 'EWR', 'BKK', 'KUL'].includes(to);

  const airlines = intl ? AIRLINES_MOCK.slice(4) : AIRLINES_MOCK.slice(0, 4);
  const numFlights = rand(5, 9);
  const flights = [];

  for (let i = 0; i < numFlights; i++) {
    const airline = airlines[i % airlines.length];
    // Genuine USD prices
    const basePrice = intl ? rand(250, 950) : rand(65, 220);
    const durationMins = intl ? rand(180, 720) : rand(60, 300);
    const stops = i % 3 === 0 ? 1 : 0;
    const depH = rand(4, 22);
    const depM = [0, 15, 30, 45][rand(0, 3)];
    const depTime = fmtT(depH, depM);
    const arrTime = addMins(depTime, durationMins);

    flights.push({
      id: `FL${Date.now()}-${i}`,
      airline: airline.name,
      airlineCode: airline.code,
      flightNumber: `${airline.code}${rand(100, 999)}`,
      from,
      to,
      date: departDate,
      departureTime: depTime,
      arrivalTime: arrTime,
      duration: formatDuration(durationMins),
      durationMins,
      stops,
      stopCity: stops > 0 ? ['BOM', 'DEL', 'HYD'][rand(0, 2)] : null,
      aircraft: ['Boeing 737', 'Airbus A320', 'Airbus A321', 'Boeing 787'][rand(0, 3)],
      pricePerPerson: basePrice,
      price: basePrice * passengers,
      currency: 'USD',
      seatsLeft: rand(2, 24),
      cabinClass: 'Economy',
      baggage: '15 kg',
      meal: stops > 0 || intl,
      refundable: i % 3 === 0,
    });
  }

  return flights.sort((a, b) => a.pricePerPerson - b.pricePerPerson);
};

// ── Live flight search with timeout + fallback ───────────────────────────────
const searchLiveFlights = async ({ from, to, departDate, passengers, cabinClass }) => {
  const key = process.env.IGNAV_API_KEY;

  // If no valid API key, immediately use mock data
  if (!key || key.includes('your_key')) {
    console.log('[flights] No Ignav key — using mock data (USD prices)');
    return generateMockFlights({ from, to, departDate, passengers });
  }

  // Abort controller for timeout (15 seconds)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${IGNAV_URL}/api/fares/one-way`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': key,
      },
      signal: controller.signal,
      body: JSON.stringify({
        origin: from,
        destination: to,
        departure_date: departDate,
        adults: passengers,
        cabin_class: cabinClass.toLowerCase().replace(' ', '_').replace('first_class', 'first'),
        max_stops: 2,
        market: 'US',
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[flights] Ignav API error ${response.status}: ${errText.slice(0, 200)} — falling back to mock`);
      return generateMockFlights({ from, to, departDate, passengers });
    }

    const body = await response.json();
    const flights = await Promise.all(
      (body.itineraries || []).map((itinerary) =>
        toFlight({ itinerary, from, to, departDate, passengers })
      )
    );

    if (!flights.length) {
      console.log('[flights] Ignav returned 0 results — falling back to mock');
      return generateMockFlights({ from, to, departDate, passengers });
    }

    console.log(`[flights] Ignav returned ${flights.length} live flights (USD)`);
    return flights;

  } catch (err) {
    clearTimeout(timeout);
    const reason = err.name === 'AbortError' ? 'timeout' : err.message;
    console.warn(`[flights] Ignav fetch failed (${reason}) — falling back to mock USD data`);
    return generateMockFlights({ from, to, departDate, passengers });
  }
};

module.exports = { searchLiveFlights };
