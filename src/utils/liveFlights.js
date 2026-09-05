const SERP_URL = 'https://serpapi.com/search.json';

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

const getMinutes = (from, to) => Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000));

const toFlight = ({ id, airline, airlineCode, flightNumber, from, to, date, departureTime, arrivalTime, durationMins, stops, stopCity, aircraft, pricePerPerson, passengers, currency = 'INR', cabinClass = 'Economy', baggage = '15 kg' }) => ({
  id,
  airline,
  airlineCode,
  flightNumber,
  from,
  to,
  date,
  departureTime,
  arrivalTime,
  duration: formatDuration(durationMins),
  durationMins,
  stops,
  stopCity: stopCity || null,
  aircraft: aircraft || 'Aircraft unavailable',
  pricePerPerson,
  price: pricePerPerson * passengers,
  currency,
  seatsLeft: null,
  cabinClass,
  baggage,
  meal: false,
  refundable: false,
});

const searchSerpApi = async ({ from, to, departDate, passengers, cabinClass }) => {
  const key = process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY;
  if (!key || key.includes('your_key')) return [];

  const params = new URLSearchParams({
    engine: 'google_flights',
    departure_id: from,
    arrival_id: to,
    outbound_date: departDate,
    adults: String(passengers),
    currency: 'INR',
    type: '2',
    travel_class: cabinClass === 'Business' ? '3' : cabinClass === 'First Class' ? '4' : '1',
    api_key: key,
  });
  const response = await fetch(`${SERP_URL}?${params}`);
  if (!response.ok) throw new Error(`SerpAPI search failed (${response.status})`);

  const body = await response.json();
  const results = [...(body.best_flights || []), ...(body.other_flights || [])];
  return results.map((result, index) => {
    const legs = result.flights || [];
    const first = legs[0];
    const last = legs[legs.length - 1];
    const durationMins = Number(result.total_duration) || getMinutes(first?.departure_airport?.time, last?.arrival_airport?.time);
    return toFlight({
      id: `serp-${Date.now()}-${index}`,
      airline: first?.airline || 'Airline',
      airlineCode: first?.airline_logo?.match(/\/([^/]+)\.com/)?.[1] || '',
      flightNumber: first?.flight_number || '',
      from: first?.departure_airport?.id || from,
      to: last?.arrival_airport?.id || to,
      date: departDate,
      departureTime: first?.departure_airport?.time?.slice(-5) || '--:--',
      arrivalTime: last?.arrival_airport?.time?.slice(-5) || '--:--',
      durationMins,
      stops: Math.max(0, legs.length - 1),
      stopCity: legs[1]?.departure_airport?.id,
      aircraft: first?.airplane,
      pricePerPerson: Number(result.price) / passengers,
      passengers,
      cabinClass,
    });
  });
};

const searchLiveFlights = async (params) => {
  return searchSerpApi(params);
};

module.exports = { searchLiveFlights };