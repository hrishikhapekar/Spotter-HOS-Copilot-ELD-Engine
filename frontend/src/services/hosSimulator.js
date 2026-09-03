// Client-side FMCSA HOS Engine & Routing Service
// Mirrors the Django backend HOSEngine for instant client responsiveness and flawless static hosting on Vercel.

export const US_FREIGHT_HUBS = {
  "atlanta, ga": { lat: 33.7490, lng: -84.3880, name: "Atlanta, GA" },
  "atlanta": { lat: 33.7490, lng: -84.3880, name: "Atlanta, GA" },
  "chicago, il": { lat: 41.8781, lng: -87.6298, name: "Chicago, IL" },
  "chicago": { lat: 41.8781, lng: -87.6298, name: "Chicago, IL" },
  "dallas, tx": { lat: 32.7767, lng: -96.7970, name: "Dallas, TX" },
  "dallas": { lat: 32.7767, lng: -96.7970, name: "Dallas, TX" },
  "fort worth, tx": { lat: 32.7555, lng: -97.3308, name: "Fort Worth, TX" },
  "houston, tx": { lat: 29.7604, lng: -95.3698, name: "Houston, TX" },
  "houston": { lat: 29.7604, lng: -95.3698, name: "Houston, TX" },
  "indianapolis, in": { lat: 39.7684, lng: -86.1581, name: "Indianapolis, IN" },
  "indianapolis": { lat: 39.7684, lng: -86.1581, name: "Indianapolis, IN" },
  "los angeles, ca": { lat: 34.0522, lng: -118.2437, name: "Los Angeles, CA" },
  "los angeles": { lat: 34.0522, lng: -118.2437, name: "Los Angeles, CA" },
  "memphis, tn": { lat: 35.1495, lng: -90.0490, name: "Memphis, TN" },
  "memphis": { lat: 35.1495, lng: -90.0490, name: "Memphis, TN" },
  "nashville, tn": { lat: 36.1627, lng: -86.7816, name: "Nashville, TN" },
  "new york, ny": { lat: 40.7128, lng: -74.0060, name: "New York, NY" },
  "new york": { lat: 40.7128, lng: -74.0060, name: "New York, NY" },
  "newark, nj": { lat: 40.7357, lng: -74.1724, name: "Newark, NJ" },
  "philadelphia, pa": { lat: 39.9526, lng: -75.1652, name: "Philadelphia, PA" },
  "phoenix, az": { lat: 33.4484, lng: -112.0740, name: "Phoenix, AZ" },
  "richmond, va": { lat: 37.5407, lng: -77.4360, name: "Richmond, VA" },
  "seattle, wa": { lat: 47.6062, lng: -122.3321, name: "Seattle, WA" },
  "denver, co": { lat: 39.7392, lng: -104.9903, name: "Denver, CO" },
  "kansas city, mo": { lat: 39.0997, lng: -94.5786, name: "Kansas City, MO" },
  "st. louis, mo": { lat: 38.6270, lng: -90.1994, name: "St. Louis, MO" },
  "salt lake city, ut": { lat: 40.7608, lng: -111.8910, name: "Salt Lake City, UT" },
  "columbus, oh": { lat: 39.9612, lng: -82.9988, name: "Columbus, OH" },
  "cincinnati, oh": { lat: 39.1031, lng: -84.5120, name: "Cincinnati, OH" },
  "charlotte, nc": { lat: 35.2271, lng: -80.8431, name: "Charlotte, NC" },
  "jacksonville, fl": { lat: 30.3322, lng: -81.6557, name: "Jacksonville, FL" },
  "miami, fl": { lat: 25.7617, lng: -80.1918, name: "Miami, FL" },
  "oklahoma city, ok": { lat: 35.4676, lng: -97.5164, name: "Oklahoma City, OK" },
  "omaha, ne": { lat: 41.2565, lng: -95.9345, name: "Omaha, NE" },
  "minneapolis, mn": { lat: 44.9778, lng: -93.2650, name: "Minneapolis, MN" },
  "albuquerque, nm": { lat: 35.0844, lng: -106.6504, name: "Albuquerque, NM" },
  "el paso, tx": { lat: 31.7619, lng: -106.4850, name: "El Paso, TX" },
  "detroit, mi": { lat: 42.3314, lng: -83.0458, name: "Detroit, MI" },
  "portland, or": { lat: 45.5152, lng: -122.6784, name: "Portland, OR" },
  "san antonio, tx": { lat: 29.4241, lng: -98.4936, name: "San Antonio, TX" },
  "fredericksburg, va": { lat: 38.3032, lng: -77.4605, name: "Fredericksburg, VA" },
  "baltimore, md": { lat: 39.2904, lng: -76.6122, name: "Baltimore, MD" },
  "cherry hill, nj": { lat: 39.9348, lng: -75.0307, name: "Cherry Hill, NJ" },
};

export function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function geocodeLocation(query) {
  const cleanQ = query.trim().toLowerCase();
  if (US_FREIGHT_HUBS[cleanQ]) {
    return US_FREIGHT_HUBS[cleanQ];
  }
  for (const [key, val] of Object.entries(US_FREIGHT_HUBS)) {
    if (cleanQ === key || cleanQ.includes(key) || key.includes(cleanQ)) {
      return { lat: val.lat, lng: val.lng, name: query.trim() };
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, { headers: { "User-Agent": "FMCSA-ELD-App/1.0" } });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          name: data[0].display_name ? data[0].display_name.split(",").slice(0, 2).join(",").trim() : query.trim()
        };
      }
    }
  } catch (e) {
    // fallback
  }

  return { lat: 41.8781, lng: -87.6298, name: query.trim() };
}

export async function getRouteBetween(p1, p2) {
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=full&geometries=geojson`;
    const resp = await fetch(osrmUrl);
    if (resp.ok) {
      const data = await resp.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distMiles = Math.round(route.distance * 0.000621371 * 10) / 10;
        const durHours = Math.round((route.duration / 3600.0) * 100) / 100;
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        return { distance_miles: distMiles, driving_hours: durHours, coordinates: coords };
      }
    }
  } catch (e) {
    // fallback
  }

  const crow = haversineMiles(p1.lat, p1.lng, p2.lat, p2.lng);
  const roadMiles = Math.round(Math.max(1.0, crow * 1.18) * 10) / 10;
  const durHours = Math.round((roadMiles / 58.0) * 100) / 100;
  const steps = Math.max(5, Math.floor(roadMiles / 30));
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    coords.push([
      p1.lat + t * (p2.lat - p1.lat),
      p1.lng + t * (p2.lng - p1.lng)
    ]);
  }
  return { distance_miles: roadMiles, driving_hours: durHours, coordinates: coords };
}

export async function simulateTripClient({
  current_location,
  pickup_location,
  dropoff_location,
  current_cycle_used = 0,
  avg_speed = 58.0,
  start_time
}) {
  const pCurr = await geocodeLocation(current_location);
  const pPick = await geocodeLocation(pickup_location);
  const pDrop = await geocodeLocation(dropoff_location);

  const leg1 = await getRouteBetween(pCurr, pPick);
  const leg2 = await getRouteBetween(pPick, pDrop);

  const totalDistance = Math.round((leg1.distance_miles + leg2.distance_miles) * 10) / 10;

  const startDt = start_time ? new Date(start_time) : new Date();
  startDt.setHours(6, 0, 0, 0);

  const events = [];
  const stops = [];

  let currTime = new Date(startDt);
  const midnightDay1 = new Date(currTime);
  midnightDay1.setHours(0, 0, 0, 0);
  const initialOffHrs = (currTime.getTime() - midnightDay1.getTime()) / (3600 * 1000);
  if (initialOffHrs > 0) {
    events.push({
      status: "off_duty",
      line: 1,
      start_time: midnightDay1.toISOString(),
      end_time: currTime.toISOString(),
      duration: Math.round(initialOffHrs * 100) / 100,
      location: pCurr.name,
      remark: "Off Duty before shift start"
    });
  }

  let shiftDrivingHrs = 0.0;
  let shiftDutyWindowHrs = 0.0;
  let continuousDriveHrs = 0.0;
  let milesSinceFuel = 0.0;
  let cycleUsed = parseFloat(current_cycle_used) || 0.0;

  stops.push({
    type: "origin",
    name: `Origin: ${pCurr.name}`,
    lat: pCurr.lat,
    lng: pCurr.lng,
    time: currTime.toISOString(),
    notes: "Trip Starting Point"
  });

  // Cycle check
  if (cycleUsed >= 68.5) {
    const restartEnd = new Date(currTime.getTime() + 34 * 3600 * 1000);
    events.push({
      status: "sleeper",
      line: 2,
      start_time: currTime.toISOString(),
      end_time: restartEnd.toISOString(),
      duration: 34.0,
      location: pCurr.name,
      remark: "34-Hour Restart (Reset 70-hr cycle)"
    });
    stops.push({
      type: "restart_34h",
      name: `34-Hr Restart at ${pCurr.name}`,
      lat: pCurr.lat,
      lng: pCurr.lng,
      time: currTime.toISOString(),
      notes: "Mandatory 34h off-duty restart to reset 70h/8d cycle"
    });
    currTime = restartEnd;
    cycleUsed = 0.0;
  }

  // Pre-trip inspection
  const preEnd = new Date(currTime.getTime() + 15 * 60 * 1000);
  events.push({
    status: "on_duty_nd",
    line: 4,
    start_time: currTime.toISOString(),
    end_time: preEnd.toISOString(),
    duration: 0.25,
    location: pCurr.name,
    remark: "Pre-Trip Inspection (15 min)"
  });
  currTime = preEnd;
  shiftDutyWindowHrs += 0.25;
  cycleUsed += 0.25;

  function getCoordAlongPath(coords, ratio, p1, p2) {
    const r = Math.max(0, Math.min(1, ratio));
    if (coords && coords.length >= 2) {
      const idx = Math.round(r * (coords.length - 1));
      return coords[idx];
    }
    return [
      p1.lat + r * (p2.lat - p1.lat),
      p1.lng + r * (p2.lng - p1.lng)
    ];
  }

  function processDrivingLeg(startPt, endPt, distMiles, label, legCoords = []) {
    let remMiles = distMiles;
    let driven = 0.0;

    while (remMiles > 0.05) {
      if (cycleUsed + 0.5 >= 70.0) {
        const restartEnd = new Date(currTime.getTime() + 34 * 3600 * 1000);
        events.push({
          status: "sleeper",
          line: 2,
          start_time: currTime.toISOString(),
          end_time: restartEnd.toISOString(),
          duration: 34.0,
          location: `Rest Area en route to ${endPt.name}`,
          remark: "34-Hour Restart (Cycle Reset)"
        });
        currTime = restartEnd;
        cycleUsed = 0.0;
        shiftDrivingHrs = 0.0;
        shiftDutyWindowHrs = 0.0;
        continuousDriveHrs = 0.0;

        const pre = new Date(currTime.getTime() + 15 * 60 * 1000);
        events.push({
          status: "on_duty_nd",
          line: 4,
          start_time: currTime.toISOString(),
          end_time: pre.toISOString(),
          duration: 0.25,
          location: `En route to ${endPt.name}`,
          remark: "Pre-Trip Inspection"
        });
        currTime = pre;
        shiftDutyWindowHrs += 0.25;
        cycleUsed += 0.25;
      }

      if (shiftDrivingHrs >= 10.99 || shiftDutyWindowHrs >= 13.99) {
        const ratio = Math.min(1.0, driven / Math.max(1.0, distMiles));
        const [rLat, rLng] = getCoordAlongPath(legCoords, ratio, startPt, endPt);
        const locName = `Rest Area (${Math.round(ratio * 100)}% to ${endPt.name})`;

        const post = new Date(currTime.getTime() + 15 * 60 * 1000);
        events.push({
          status: "on_duty_nd",
          line: 4,
          start_time: currTime.toISOString(),
          end_time: post.toISOString(),
          duration: 0.25,
          location: locName,
          remark: "Post-Trip Inspection (15 min)"
        });
        currTime = post;
        cycleUsed += 0.25;

        const restEnd = new Date(currTime.getTime() + 10 * 3600 * 1000);
        events.push({
          status: "sleeper",
          line: 2,
          start_time: currTime.toISOString(),
          end_time: restEnd.toISOString(),
          duration: 10.0,
          location: locName,
          remark: "10-Hour Daily Rest (Sleeper Berth)"
        });
        stops.push({
          type: "rest_10h",
          name: `10-Hour Rest Break (${Math.round(driven)} mi)`,
          lat: rLat,
          lng: rLng,
          time: currTime.toISOString(),
          notes: "Mandatory 10-hour consecutive rest to reset 11h driving / 14h window"
        });
        currTime = restEnd;
        shiftDrivingHrs = 0.0;
        shiftDutyWindowHrs = 0.0;
        continuousDriveHrs = 0.0;

        const pre = new Date(currTime.getTime() + 15 * 60 * 1000);
        events.push({
          status: "on_duty_nd",
          line: 4,
          start_time: currTime.toISOString(),
          end_time: pre.toISOString(),
          duration: 0.25,
          location: locName,
          remark: "Pre-Trip Inspection"
        });
        currTime = pre;
        shiftDutyWindowHrs += 0.25;
        cycleUsed += 0.25;
        continue;
      }

      if (milesSinceFuel >= 1000.0) {
        const ratio = Math.min(1.0, driven / Math.max(1.0, distMiles));
        const [fLat, fLng] = getCoordAlongPath(legCoords, ratio, startPt, endPt);
        const locName = `Fuel Plaza (${Math.round(milesSinceFuel)} mi)`;

        const fuelEnd = new Date(currTime.getTime() + 30 * 60 * 1000);
        events.push({
          status: "on_duty_nd",
          line: 4,
          start_time: currTime.toISOString(),
          end_time: fuelEnd.toISOString(),
          duration: 0.5,
          location: locName,
          remark: "Fueling & 30-min Break (On-Duty Not Driving)"
        });
        stops.push({
          type: "fuel",
          name: `Fueling Stop (${Math.round(milesSinceFuel)} mi)`,
          lat: fLat,
          lng: fLng,
          time: currTime.toISOString(),
          notes: "Mandatory fueling stop (at least once per 1,000 miles)"
        });
        currTime = fuelEnd;
        shiftDutyWindowHrs += 0.5;
        cycleUsed += 0.5;
        continuousDriveHrs = 0.0;
        milesSinceFuel = 0.0;
        continue;
      }

      if (continuousDriveHrs >= 7.99) {
        const ratio = Math.min(1.0, driven / Math.max(1.0, distMiles));
        const [bLat, bLng] = getCoordAlongPath(legCoords, ratio, startPt, endPt);
        const locName = `Rest Stop (${Math.round(ratio * 100)}% to ${endPt.name})`;

        const breakEnd = new Date(currTime.getTime() + 30 * 60 * 1000);
        events.push({
          status: "off_duty",
          line: 1,
          start_time: currTime.toISOString(),
          end_time: breakEnd.toISOString(),
          duration: 0.5,
          location: locName,
          remark: "Mandatory 30-Min Rest Break (8-hr driving limit)"
        });
        stops.push({
          type: "break_30m",
          name: "30-Minute Rest Break",
          lat: bLat,
          lng: bLng,
          time: currTime.toISOString(),
          notes: "Required after 8 cumulative hours of driving"
        });
        currTime = breakEnd;
        shiftDutyWindowHrs += 0.5;
        continuousDriveHrs = 0.0;
        continue;
      }

      const t11 = 11.0 - shiftDrivingHrs;
      const t14 = 14.0 - shiftDutyWindowHrs;
      const t8 = 8.0 - continuousDriveHrs;
      const milesToFuel = Math.max(10.0, 1000.0 - milesSinceFuel);
      const tFuel = milesToFuel / avg_speed;
      const tDest = remMiles / avg_speed;

      let dur = Math.min(t11, t14, t8, tFuel, tDest);
      dur = Math.max(0.05, Math.round(dur * 1000) / 1000);
      let dMiles = dur * avg_speed;

      if (dMiles > remMiles) {
        dMiles = remMiles;
        dur = Math.round((dMiles / avg_speed) * 1000) / 1000;
      }

      const driveEnd = new Date(currTime.getTime() + dur * 3600 * 1000);
      events.push({
        status: "driving",
        line: 3,
        start_time: currTime.toISOString(),
        end_time: driveEnd.toISOString(),
        duration: Math.round(dur * 100) / 100,
        miles: Math.round(dMiles * 10) / 10,
        location: `Transit ${label}`,
        remark: `Driving towards ${endPt.name} (${Math.round(dMiles * 10) / 10} mi)`
      });

      currTime = driveEnd;
      remMiles -= dMiles;
      driven += dMiles;
      milesSinceFuel += dMiles;
      shiftDrivingHrs += dur;
      shiftDutyWindowHrs += dur;
      continuousDriveHrs += dur;
      cycleUsed += dur;
    }
  }

  // 1. Leg 1
  if (leg1.distance_miles > 1.0) {
    processDrivingLeg(pCurr, pPick, leg1.distance_miles, "to Pickup", leg1.coordinates || []);
  }


  // 2. Pickup
  stops.push({
    type: "pickup",
    name: `Pickup: ${pPick.name}`,
    lat: pPick.lat,
    lng: pPick.lng,
    time: currTime.toISOString(),
    notes: "1.0 hr On-Duty loading & paperwork"
  });
  const pickEnd = new Date(currTime.getTime() + 3600 * 1000);
  events.push({
    status: "on_duty_nd",
    line: 4,
    start_time: currTime.toISOString(),
    end_time: pickEnd.toISOString(),
    duration: 1.0,
    location: pPick.name,
    remark: "Loading & Paperwork at Pickup (1 hr On-Duty)"
  });
  currTime = pickEnd;
  shiftDutyWindowHrs += 1.0;
  cycleUsed += 1.0;

  // 3. Leg 2
  if (leg2.distance_miles > 1.0) {
    processDrivingLeg(pPick, pDrop, leg2.distance_miles, "to Dropoff", leg2.coordinates || []);
  }


  // 4. Dropoff
  stops.push({
    type: "dropoff",
    name: `Dropoff: ${pDrop.name}`,
    lat: pDrop.lat,
    lng: pDrop.lng,
    time: currTime.toISOString(),
    notes: "1.0 hr On-Duty unloading & completion"
  });
  const dropEnd = new Date(currTime.getTime() + 3600 * 1000);
  events.push({
    status: "on_duty_nd",
    line: 4,
    start_time: currTime.toISOString(),
    end_time: dropEnd.toISOString(),
    duration: 1.0,
    location: pDrop.name,
    remark: "Unloading & Sign-off at Dropoff (1 hr On-Duty)"
  });
  currTime = dropEnd;
  cycleUsed += 1.0;

  // 5. Post trip at destination
  const postDest = new Date(currTime.getTime() + 15 * 60 * 1000);
  events.push({
    status: "on_duty_nd",
    line: 4,
    start_time: currTime.toISOString(),
    end_time: postDest.toISOString(),
    duration: 0.25,
    location: pDrop.name,
    remark: "Final Post-Trip Inspection"
  });
  currTime = postDest;
  cycleUsed += 0.25;

  // 6. Final day midnight completion
  const nextMid = new Date(currTime);
  nextMid.setDate(nextMid.getDate() + 1);
  nextMid.setHours(0, 0, 0, 0);
  const remDayHrs = (nextMid.getTime() - currTime.getTime()) / (3600 * 1000);
  if (remDayHrs > 0 && remDayHrs <= 24.0) {
    events.push({
      status: "off_duty",
      line: 1,
      start_time: currTime.toISOString(),
      end_time: nextMid.toISOString(),
      duration: Math.round(remDayHrs * 100) / 100,
      location: pDrop.name,
      remark: "Off Duty - Trip Completed"
    });
  }

  const dailyLogs = generateDailyLogsClient(events, current_cycle_used);

  const totalDriving = events.filter(e => e.status === "driving").reduce((a, b) => a + b.duration, 0);
  const totalOnDuty = events.filter(e => e.status === "on_duty_nd").reduce((a, b) => a + b.duration, 0);
  const totalRest = events.filter(e => e.status === "off_duty" || e.status === "sleeper").reduce((a, b) => a + b.duration, 0);

  return {
    summary: {
      total_miles: totalDistance,
      leg1_miles: leg1.distance_miles,
      leg2_miles: leg2.distance_miles,
      total_trip_hours: Math.round((events.reduce((a, b) => a + b.duration, 0)) * 10) / 10,
      total_driving_hours: Math.round(totalDriving * 10) / 10,
      total_on_duty_nd_hours: Math.round(totalOnDuty * 10) / 10,
      total_rest_hours: Math.round(totalRest * 10) / 10,
      initial_cycle_used: current_cycle_used,
      ending_cycle_used: dailyLogs.length > 0 ? dailyLogs[dailyLogs.length - 1].recap.accumulated_cycle : 0,
      total_days: dailyLogs.length,
      avg_speed: avg_speed
    },
    locations: { current: pCurr, pickup: pPick, dropoff: pDrop },
    stops,
    route_geometry: [...(leg1.coordinates || []), ...(leg2.coordinates || [])],
    events,
    daily_logs: dailyLogs
  };
}

function generateDailyLogsClient(events, initialCycle = 0) {
  if (!events || events.length === 0) return [];

  const firstDt = new Date(events[0].start_time);
  const lastDt = new Date(events[events.length - 1].end_time);

  let currDay = new Date(firstDt);
  currDay.setHours(0, 0, 0, 0);
  const endLimit = new Date(lastDt);
  endLimit.setHours(0, 0, 0, 0);
  if (lastDt > endLimit) endLimit.setDate(endLimit.getDate() + 1);

  const dailyLogs = [];
  let rollingCycle = parseFloat(initialCycle) || 0.0;
  let dayIdx = 1;

  while (currDay < endLimit) {
    const nextDay = new Date(currDay);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayIntervals = [];
    let dayMiles = 0.0;
    const dayRemarks = [];

    for (const ev of events) {
      const evStart = new Date(ev.start_time);
      const evEnd = new Date(ev.end_time);

      const overlapStart = new Date(Math.max(currDay.getTime(), evStart.getTime()));
      const overlapEnd = new Date(Math.min(nextDay.getTime(), evEnd.getTime()));

      if (overlapStart < overlapEnd) {
        const startHour = (overlapStart.getTime() - currDay.getTime()) / (3600 * 1000);
        const endHour = (overlapEnd.getTime() - currDay.getTime()) / (3600 * 1000);
        const duration = endHour - startHour;

        if (ev.status === "driving" && ev.miles > 0) {
          const totalEvDur = (evEnd.getTime() - evStart.getTime()) / (3600 * 1000);
          if (totalEvDur > 0) {
            dayMiles += Math.round((ev.miles * (duration / totalEvDur)) * 10) / 10;
          }
        }

        dayIntervals.push({
          line: ev.line,
          status: ev.status,
          start_hour: Math.round(startHour * 100) / 100,
          end_hour: Math.round(endHour * 100) / 100,
          duration: Math.round(duration * 100) / 100,
          location: ev.location || "",
          remark: ev.remark || ""
        });

        const timeStr = overlapStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        dayRemarks.push({
          time: timeStr,
          hour: Math.round(startHour * 100) / 100,
          location: ev.location || "",
          text: ev.remark || ""
        });
      }
    }

    // Normalize
    const norm = normalizeIntervalsClient(dayIntervals);

    let offTot = Math.round(norm.filter(i => i.line === 1).reduce((a, b) => a + b.duration, 0) * 100) / 100;
    const sleepTot = Math.round(norm.filter(i => i.line === 2).reduce((a, b) => a + b.duration, 0) * 100) / 100;
    const driveTot = Math.round(norm.filter(i => i.line === 3).reduce((a, b) => a + b.duration, 0) * 100) / 100;
    const onTot = Math.round(norm.filter(i => i.line === 4).reduce((a, b) => a + b.duration, 0) * 100) / 100;

    const sumL = offTot + sleepTot + driveTot + onTot;
    const diff = Math.round((24.0 - sumL) * 100) / 100;
    if (diff !== 0) offTot = Math.round((offTot + diff) * 100) / 100;

    const onDutyToday = Math.round((driveTot + onTot) * 100) / 100;
    const prior = rollingCycle;

    const hasRestart = norm.some(it => it.remark && it.remark.includes("34-Hour Restart"));
    if (hasRestart) {
      rollingCycle = onDutyToday;
    } else {
      rollingCycle = Math.round((rollingCycle + onDutyToday) * 100) / 100;
    }

    const availTomorrow = Math.max(0, Math.round((70.0 - rollingCycle) * 100) / 100);

    dailyLogs.push({
      day_number: dayIdx,
      date_str: currDay.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
      day_name: currDay.toLocaleDateString("en-US", { weekday: "long" }),
      carrier_name: "Antigravity Freight Lines, LLC",
      main_office: "Chicago, IL",
      home_terminal: "Chicago, IL",
      driver_name: "Alex Mercer",
      vehicle_number: "TRK-4402 / TRL-8819",
      shipping_number: `BOL-8829${dayIdx}`,
      commodity: "General Freight / Commercial Goods",
      miles_today: Math.round(dayMiles * 10) / 10,
      totals: {
        off_duty: offTot,
        sleeper: sleepTot,
        driving: driveTot,
        on_duty_nd: onTot,
        total: 24.0
      },
      intervals: norm,
      remarks: dayRemarks,
      recap: {
        on_duty_today: onDutyToday,
        prior_cycle_used: prior,
        accumulated_cycle: rollingCycle,
        available_tomorrow: availTomorrow,
        cycle_limit: 70.0
      }
    });

    dayIdx++;
    currDay = nextDay;
  }

  return dailyLogs;
}

function normalizeIntervalsClient(intervals) {
  if (!intervals || intervals.length === 0) {
    return [{
      line: 1,
      status: "off_duty",
      start_hour: 0.0,
      end_hour: 24.0,
      duration: 24.0,
      location: "Terminal",
      remark: "Off Duty all day"
    }];
  }

  intervals.sort((a, b) => a.start_hour - b.start_hour);
  const fixed = [];
  let currH = 0.0;

  for (const it of intervals) {
    if (it.start_hour > currH + 0.01) {
      const gap = Math.round((it.start_hour - currH) * 100) / 100;
      fixed.push({
        line: 1,
        status: "off_duty",
        start_hour: Math.round(currH * 100) / 100,
        end_hour: Math.round(it.start_hour * 100) / 100,
        duration: gap,
        location: it.location || "",
        remark: "Off Duty"
      });
    }
    it.start_hour = Math.round(Math.max(currH, it.start_hour) * 100) / 100;
    it.duration = Math.round((it.end_hour - it.start_hour) * 100) / 100;
    if (it.duration > 0.001) {
      fixed.push(it);
      currH = it.end_hour;
    }
  }

  if (currH < 23.99) {
    fixed.push({
      line: 1,
      status: "off_duty",
      start_hour: Math.round(currH * 100) / 100,
      end_hour: 24.0,
      duration: Math.round((24.0 - currH) * 100) / 100,
      location: fixed.length > 0 ? fixed[fixed.length - 1].location : "Terminal",
      remark: "Off Duty"
    });
  }

  return fixed;
}
