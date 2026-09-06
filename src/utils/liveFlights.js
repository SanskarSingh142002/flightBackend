const IGNAV_URL = 'https://ignav.com';

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatTime = (value) => value ? value.slice(11, 16) : '--:--';

const toFlight = ({ itinerary, from, to, departDate, passengers }) => {
  const outbound = itinerary.outbound || {};
  const segments = outbound.segments || [];
  const first = segments[0] || {};
  const last = segments[segments.length - 1] || first;
  const pricePerPerson = Number(itinerary.price?.amount || 0);
  const durationMins = Number(outbound.duration_minutes || segments.reduce((sum, segment) => sum + (segment.duration_minutes || 0), 0));

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
    currency: itinerary.price?.currency || 'USD',
    seatsLeft: null,
    cabinClass: itinerary.cabin_class || 'economy',
    baggage: itinerary.bags?.checked ? `${itinerary.bags.checked} checked bag` : 'Included',
    meal: false,
    refundable: false,
  };
};

const searchLiveFlights = async ({ from, to, departDate, passengers, cabinClass }) => {
  const key = process.env.IGNAV_API_KEY;
  if (!key || key.includes('your_key')) return [];

  const response = await fetch(`${IGNAV_URL}/api/fares/one-way`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': key,
    },
    body: JSON.stringify({
      origin: from,
      destination: to,
      departure_date: departDate,
      adults: passengers,
      cabin_class: cabinClass.toLowerCase().replace(' ', '_').replace('first_class', 'first'),
      max_stops: 2,
      market: 'IN',
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ignav fare search failed (${response.status}): ${error.slice(0, 200)}`);
  }

  const body = await response.json();
  return (body.itineraries || []).map((itinerary) => toFlight({ itinerary, from, to, departDate, passengers }));
};

module.exports = { searchLiveFlights };
