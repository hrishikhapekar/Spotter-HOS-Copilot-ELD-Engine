import { simulateTripClient } from './hosSimulator';

const FALLBACK_PRESETS = [
  {
    id: "midwest_to_texas",
    label: "Chicago, IL → Indianapolis, IN → Dallas, TX (~950 miles)",
    description: "Cross-regional freight trip with 1h pickup, 30m rest break, 10h overnight rest, and 1h delivery.",
    current_location: "Chicago, IL",
    pickup_location: "Indianapolis, IN",
    dropoff_location: "Dallas, TX",
    current_cycle_used: 12.0
  },
  {
    id: "cross_country_fuel",
    label: "Los Angeles, CA → Phoenix, AZ → Atlanta, GA (~2,200 miles)",
    description: "Multi-day long-haul requiring multiple 10-hour rest breaks and mandatory 1,000-mile fueling stops.",
    current_location: "Los Angeles, CA",
    pickup_location: "Phoenix, AZ",
    dropoff_location: "Atlanta, GA",
    current_cycle_used: 8.5
  },
  {
    id: "northeast_corridor",
    label: "Richmond, VA → Baltimore, MD → Newark, NJ (~350 miles)",
    description: "Single-day regional delivery matching the FMCSA Guide sample log (pages 18-19).",
    current_location: "Richmond, VA",
    pickup_location: "Baltimore, MD",
    dropoff_location: "Newark, NJ",
    current_cycle_used: 20.0
  },
  {
    id: "near_cycle_reset",
    label: "Dallas, TX → Houston, TX → Miami, FL (~1,450 miles, 64 hrs used)",
    description: "High starting cycle (64 hrs) triggering a mandatory 34-Hour Restart before reaching 70 hours.",
    current_location: "Dallas, TX",
    pickup_location: "Houston, TX",
    dropoff_location: "Miami, FL",
    current_cycle_used: 64.0
  }
];

export async function fetchPresets() {
  try {
    const res = await fetch('/api/presets/', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.presets && data.presets.length > 0) {
        return data.presets;
      }
    }
  } catch (e) {
    // ignore
  }
  return FALLBACK_PRESETS;
}

export async function planTrip(params) {
  try {
    const res = await fetch('/api/plan-trip/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      const data = await res.json();
      return { ...data, source: 'django_backend' };
    }
  } catch (e) {
    console.warn('Backend API unavailable, executing client-side HOS calculation engine:', e);
  }

  // Fallback to client-side engine
  const clientResult = await simulateTripClient(params);
  return { ...clientResult, source: 'client_engine' };
}
