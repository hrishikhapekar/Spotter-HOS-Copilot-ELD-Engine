from datetime import datetime, timedelta
import math
from typing import Dict, List, Any, Tuple
from .routing_service import geocode_location, get_route_between, haversine_miles

class HOSEngine:
    """
    Implements FMCSA Hours of Service (HOS) rules for Property-Carrying CMV drivers:
    - 70-hour / 8-day rolling window limit
    - 11-hour driving limit per shift
    - 14-hour driving window per shift
    - 30-minute rest break required after 8 cumulative driving hours
    - 10 consecutive hours off-duty/sleeper berth to reset 11h/14h shift
    - Fueling at least once every 1,000 miles (30 min On-Duty Not Driving)
    - 1 hour On-Duty Not Driving for pickup and 1 hour for dropoff
    - 15 min pre-trip inspection before shift, 15 min post-trip inspection
    - 34-hour restart when cycle hours would exceed 70.0
    """

    MAX_DRIVING_PER_SHIFT = 11.0       # § 395.3(a)(3)
    MAX_DUTY_WINDOW = 14.0            # § 395.3(a)(2)
    REST_BREAK_DRIVE_THRESHOLD = 8.0  # § 395.3(a)(3)(ii)
    MANDATORY_REST_BREAK_MINS = 30    # 0.5 hours
    SHIFT_RESET_HOURS = 10.0          # § 395.3(a)(1)
    CYCLE_LIMIT_HOURS = 70.0          # § 395.3(b)
    CYCLE_RESTART_HOURS = 34.0        # § 395.3(c)
    MAX_MILES_BETWEEN_FUEL = 1000.0   # Assessment instruction
    FUELING_DURATION_HOURS = 0.5      # 30 minutes
    PICKUP_DURATION_HOURS = 1.0       # Assessment instruction
    DROPOFF_DURATION_HOURS = 1.0      # Assessment instruction
    PRE_TRIP_HOURS = 0.25             # 15 minutes
    POST_TRIP_HOURS = 0.25            # 15 minutes

    def __init__(self, current_cycle_used: float = 0.0, start_datetime: datetime = None, avg_speed: float = 58.0):
        self.current_cycle_used = float(current_cycle_used)
        self.start_datetime = start_datetime or datetime.now().replace(hour=6, minute=0, second=0, microsecond=0)
        self.avg_speed = max(35.0, min(70.0, avg_speed))

    def plan_trip(self, current_loc_query: str, pickup_loc_query: str, dropoff_loc_query: str) -> Dict[str, Any]:
        p_curr = geocode_location(current_loc_query)
        p_pick = geocode_location(pickup_loc_query)
        p_drop = geocode_location(dropoff_loc_query)

        # Calculate routing legs
        leg1 = get_route_between(p_curr, p_pick)
        leg2 = get_route_between(p_pick, p_drop)

        total_distance = round(leg1["distance_miles"] + leg2["distance_miles"], 1)

        # Simulate schedule events with HOS limits
        events, stops = self._simulate_hos_schedule(p_curr, p_pick, p_drop, leg1, leg2)

        # Partition timeline into daily log sheets (midnight to midnight)
        daily_logs = self._generate_daily_logs(events)

        # Compute summary metrics
        total_driving = sum(e["duration"] for e in events if e["status"] == "driving")
        total_on_duty_nd = sum(e["duration"] for e in events if e["status"] == "on_duty_nd")
        total_off_duty = sum(e["duration"] for e in events if e["status"] == "off_duty")
        total_sleeper = sum(e["duration"] for e in events if e["status"] == "sleeper")
        total_trip_hours = sum(e["duration"] for e in events)

        # Combine polyline
        all_coords = leg1.get("coordinates", []) + leg2.get("coordinates", [])

        return {
            "summary": {
                "total_miles": total_distance,
                "leg1_miles": leg1["distance_miles"],
                "leg2_miles": leg2["distance_miles"],
                "total_trip_hours": round(total_trip_hours, 2),
                "total_driving_hours": round(total_driving, 2),
                "total_on_duty_nd_hours": round(total_on_duty_nd, 2),
                "total_rest_hours": round(total_off_duty + total_sleeper, 2),
                "initial_cycle_used": self.current_cycle_used,
                "ending_cycle_used": round(daily_logs[-1]["recap"]["accumulated_cycle"], 2) if daily_logs else 0.0,
                "total_days": len(daily_logs),
                "avg_speed": self.avg_speed
            },
            "locations": {
                "current": p_curr,
                "pickup": p_pick,
                "dropoff": p_drop
            },
            "stops": stops,
            "route_geometry": all_coords,
            "events": events,
            "daily_logs": daily_logs
        }

    def _simulate_hos_schedule(self, p_curr, p_pick, p_drop, leg1, leg2) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        events = []
        stops = []

        curr_time = self.start_datetime
        # Initial off-duty before trip start on day 1 (from midnight to start_time)
        midnight_day1 = curr_time.replace(hour=0, minute=0, second=0, microsecond=0)
        initial_off_hours = (curr_time - midnight_day1).total_seconds() / 3600.0
        if initial_off_hours > 0:
            events.append({
                "status": "off_duty",
                "line": 1,
                "start_time": midnight_day1.isoformat(),
                "end_time": curr_time.isoformat(),
                "duration": round(initial_off_hours, 2),
                "location": p_curr["name"],
                "remark": "Off Duty before shift start"
            })

        # State trackers
        shift_driving_hours = 0.0
        shift_duty_window_hours = 0.0
        continuous_driving_hours = 0.0
        miles_since_fuel = 0.0
        cycle_used = self.current_cycle_used

        stops.append({
            "type": "origin",
            "name": f"Origin: {p_curr['name']}",
            "lat": p_curr["lat"],
            "lng": p_curr["lng"],
            "time": curr_time.isoformat(),
            "notes": "Starting Point"
        })

        # Helper to check 34h restart if cycle exhausted
        def check_cycle_restart():
            nonlocal curr_time, cycle_used, shift_driving_hours, shift_duty_window_hours, continuous_driving_hours
            if cycle_used >= (self.CYCLE_LIMIT_HOURS - 1.5):
                restart_end = curr_time + timedelta(hours=self.CYCLE_RESTART_HOURS)
                events.append({
                    "status": "sleeper",
                    "line": 2,
                    "start_time": curr_time.isoformat(),
                    "end_time": restart_end.isoformat(),
                    "duration": self.CYCLE_RESTART_HOURS,
                    "location": p_curr["name"],
                    "remark": "34-Hour Restart (Reset 70-hr clock)"
                })
                stops.append({
                    "type": "restart_34h",
                    "name": f"34-Hr Restart at {p_curr['name']}",
                    "lat": p_curr["lat"],
                    "lng": p_curr["lng"],
                    "time": curr_time.isoformat(),
                    "notes": "Mandatory 34h off-duty restart to reset 70h/8d cycle"
                })
                curr_time = restart_end
                cycle_used = 0.0
                shift_driving_hours = 0.0
                shift_duty_window_hours = 0.0
                continuous_driving_hours = 0.0

        check_cycle_restart()

        # Pre-trip inspection before driving
        pre_end = curr_time + timedelta(hours=self.PRE_TRIP_HOURS)
        events.append({
            "status": "on_duty_nd",
            "line": 4,
            "start_time": curr_time.isoformat(),
            "end_time": pre_end.isoformat(),
            "duration": self.PRE_TRIP_HOURS,
            "location": p_curr["name"],
            "remark": "Pre-Trip Inspection"
        })
        curr_time = pre_end
        shift_duty_window_hours += self.PRE_TRIP_HOURS
        cycle_used += self.PRE_TRIP_HOURS

        def get_coord_along_path(coords, ratio, p1, p2):
            ratio = max(0.0, min(1.0, ratio))
            if coords and len(coords) >= 2:
                idx = int(round(ratio * (len(coords) - 1)))
                return coords[idx][0], coords[idx][1]
            lat = p1["lat"] + ratio * (p2["lat"] - p1["lat"])
            lng = p1["lng"] + ratio * (p2["lng"] - p1["lng"])
            return lat, lng

        # Process a driving segment with step-by-step HOS enforcement
        def process_driving_leg(start_pt, end_pt, distance_miles, label_prefix, leg_coords=None):
            nonlocal curr_time, shift_driving_hours, shift_duty_window_hours, continuous_driving_hours, miles_since_fuel, cycle_used

            remaining_miles = distance_miles
            leg_driven = 0.0

            while remaining_miles > 0.05:
                # Check cycle limit
                if cycle_used + 0.5 >= self.CYCLE_LIMIT_HOURS:
                    # Trigger 34-hour restart
                    restart_end = curr_time + timedelta(hours=self.CYCLE_RESTART_HOURS)
                    events.append({
                        "status": "sleeper",
                        "line": 2,
                        "start_time": curr_time.isoformat(),
                        "end_time": restart_end.isoformat(),
                        "duration": self.CYCLE_RESTART_HOURS,
                        "location": f"En route to {end_pt['name']}",
                        "remark": "34-Hour Restart (Cycle Reset)"
                    })
                    curr_time = restart_end
                    cycle_used = 0.0
                    shift_driving_hours = 0.0
                    shift_duty_window_hours = 0.0
                    continuous_driving_hours = 0.0

                    # Pre-trip after restart
                    pre_end = curr_time + timedelta(hours=self.PRE_TRIP_HOURS)
                    events.append({
                        "status": "on_duty_nd",
                        "line": 4,
                        "start_time": curr_time.isoformat(),
                        "end_time": pre_end.isoformat(),
                        "duration": self.PRE_TRIP_HOURS,
                        "location": f"En route to {end_pt['name']}",
                        "remark": "Pre-Trip Inspection"
                    })
                    curr_time = pre_end
                    shift_duty_window_hours += self.PRE_TRIP_HOURS
                    cycle_used += self.PRE_TRIP_HOURS

                # Check 11-hour driving or 14-hour window limit
                if shift_driving_hours >= (self.MAX_DRIVING_PER_SHIFT - 0.01) or shift_duty_window_hours >= (self.MAX_DUTY_WINDOW - 0.01):
                    # Take 10-hour consecutive rest break
                    progress_ratio = min(1.0, leg_driven / max(1.0, distance_miles))
                    r_lat, r_lng = get_coord_along_path(leg_coords, progress_ratio, start_pt, end_pt)
                    rest_loc_name = f"Rest Area ({int(progress_ratio*100)}% to {end_pt['name']})"

                    # Post-trip inspection before rest
                    post_end = curr_time + timedelta(hours=self.POST_TRIP_HOURS)
                    events.append({
                        "status": "on_duty_nd",
                        "line": 4,
                        "start_time": curr_time.isoformat(),
                        "end_time": post_end.isoformat(),
                        "duration": self.POST_TRIP_HOURS,
                        "location": rest_loc_name,
                        "remark": "Post-Trip Inspection"
                    })
                    curr_time = post_end
                    cycle_used += self.POST_TRIP_HOURS

                    rest_end = curr_time + timedelta(hours=self.SHIFT_RESET_HOURS)
                    events.append({
                        "status": "sleeper",
                        "line": 2,
                        "start_time": curr_time.isoformat(),
                        "end_time": rest_end.isoformat(),
                        "duration": self.SHIFT_RESET_HOURS,
                        "location": rest_loc_name,
                        "remark": "10-Hour Daily Rest (Sleeper Berth)"
                    })
                    stops.append({
                        "type": "rest_10h",
                        "name": f"10-Hour Rest Break",
                        "lat": r_lat,
                        "lng": r_lng,
                        "time": curr_time.isoformat(),
                        "notes": "10 consecutive hours off-duty / sleeper berth to reset 11h/14h shift"
                    })
                    curr_time = rest_end
                    # Reset shift clocks
                    shift_driving_hours = 0.0
                    shift_duty_window_hours = 0.0
                    continuous_driving_hours = 0.0

                    continuous_driving_hours = 0.0

                    # Pre-trip inspection for new shift
                    pre_end = curr_time + timedelta(hours=self.PRE_TRIP_HOURS)
                    events.append({
                        "status": "on_duty_nd",
                        "line": 4,
                        "start_time": curr_time.isoformat(),
                        "end_time": pre_end.isoformat(),
                        "duration": self.PRE_TRIP_HOURS,
                        "location": rest_loc_name,
                        "remark": "Pre-Trip Inspection"
                    })
                    curr_time = pre_end
                    shift_duty_window_hours += self.PRE_TRIP_HOURS
                    cycle_used += self.PRE_TRIP_HOURS
                    continue

                # Check 1,000 miles fuel stop requirement
                if miles_since_fuel >= self.MAX_MILES_BETWEEN_FUEL:
                    progress_ratio = min(1.0, leg_driven / max(1.0, distance_miles))
                    f_lat, f_lng = get_coord_along_path(leg_coords, progress_ratio, start_pt, end_pt)
                    fuel_loc_name = f"Fuel Plaza ({int(miles_since_fuel)} mi)"

                    fuel_end = curr_time + timedelta(hours=self.FUELING_DURATION_HOURS)
                    events.append({
                        "status": "on_duty_nd",
                        "line": 4,
                        "start_time": curr_time.isoformat(),
                        "end_time": fuel_end.isoformat(),
                        "duration": self.FUELING_DURATION_HOURS,
                        "location": fuel_loc_name,
                        "remark": "Fueling & 30-min Break (On-Duty Not Driving)"
                    })
                    stops.append({
                        "type": "fuel",
                        "name": f"Fueling Stop ({int(miles_since_fuel)} mi)",
                        "lat": f_lat,
                        "lng": f_lng,
                        "time": curr_time.isoformat(),
                        "notes": "Mandatory fueling stop (at least once per 1,000 miles)"
                    })
                    curr_time = fuel_end
                    shift_duty_window_hours += self.FUELING_DURATION_HOURS
                    cycle_used += self.FUELING_DURATION_HOURS
                    continuous_driving_hours = 0.0  # 30-min break resets the 8-hour driving clock
                    miles_since_fuel = 0.0
                    continue

                # Check 8-hour driving limit requiring 30-min rest break
                if continuous_driving_hours >= (self.REST_BREAK_DRIVE_THRESHOLD - 0.01):
                    progress_ratio = min(1.0, leg_driven / max(1.0, distance_miles))
                    b_lat, b_lng = get_coord_along_path(leg_coords, progress_ratio, start_pt, end_pt)
                    break_loc_name = f"Rest Stop ({int(progress_ratio*100)}% to {end_pt['name']})"

                    break_end = curr_time + timedelta(minutes=self.MANDATORY_REST_BREAK_MINS)
                    events.append({
                        "status": "off_duty",
                        "line": 1,
                        "start_time": curr_time.isoformat(),
                        "end_time": break_end.isoformat(),
                        "duration": 0.5,
                        "location": break_loc_name,
                        "remark": "Mandatory 30-Min Rest Break (8-hr driving limit)"
                    })
                    stops.append({
                        "type": "break_30m",
                        "name": "30-Minute Rest Break",
                        "lat": b_lat,
                        "lng": b_lng,
                        "time": curr_time.isoformat(),
                        "notes": "Required after 8 cumulative hours of driving"
                    })
                    curr_time = break_end
                    shift_duty_window_hours += 0.5
                    continuous_driving_hours = 0.0
                    continue

                # Calculate next allowable driving burst
                time_to_11h = self.MAX_DRIVING_PER_SHIFT - shift_driving_hours
                time_to_14h = self.MAX_DUTY_WINDOW - shift_duty_window_hours
                time_to_8h_break = self.REST_BREAK_DRIVE_THRESHOLD - continuous_driving_hours
                miles_to_fuel = max(10.0, self.MAX_MILES_BETWEEN_FUEL - miles_since_fuel)
                time_to_fuel = miles_to_fuel / self.avg_speed
                time_to_dest = remaining_miles / self.avg_speed

                drive_duration = min(time_to_11h, time_to_14h, time_to_8h_break, time_to_fuel, time_to_dest)
                drive_duration = max(0.05, round(drive_duration, 3))
                drive_miles = drive_duration * self.avg_speed

                if drive_miles > remaining_miles:
                    drive_miles = remaining_miles
                    drive_duration = round(drive_miles / self.avg_speed, 3)

                drive_end = curr_time + timedelta(hours=drive_duration)
                events.append({
                    "status": "driving",
                    "line": 3,
                    "start_time": curr_time.isoformat(),
                    "end_time": drive_end.isoformat(),
                    "duration": round(drive_duration, 2),
                    "miles": round(drive_miles, 1),
                    "location": f"Transit {label_prefix}",
                    "remark": f"Driving towards {end_pt['name']} ({round(drive_miles, 1)} mi)"
                })

                curr_time = drive_end
                remaining_miles -= drive_miles
                leg_driven += drive_miles
                miles_since_fuel += drive_miles
                shift_driving_hours += drive_duration
                shift_duty_window_hours += drive_duration
                continuous_driving_hours += drive_duration
                cycle_used += drive_duration

        # 1. Drive Leg 1: Current -> Pickup
        if leg1["distance_miles"] > 1.0:
            process_driving_leg(p_curr, p_pick, leg1["distance_miles"], "to Pickup", leg1.get("coordinates", []))

        # 2. At Pickup: 1 hour On-Duty Not Driving
        stops.append({
            "type": "pickup",
            "name": f"Pickup: {p_pick['name']}",
            "lat": p_pick["lat"],
            "lng": p_pick["lng"],
            "time": curr_time.isoformat(),
            "notes": "1.0 hr On-Duty loading & paperwork"
        })
        pickup_end = curr_time + timedelta(hours=self.PICKUP_DURATION_HOURS)
        events.append({
            "status": "on_duty_nd",
            "line": 4,
            "start_time": curr_time.isoformat(),
            "end_time": pickup_end.isoformat(),
            "duration": self.PICKUP_DURATION_HOURS,
            "location": p_pick["name"],
            "remark": "Loading & Paperwork at Pickup (1 hr On-Duty)"
        })
        curr_time = pickup_end
        shift_duty_window_hours += self.PICKUP_DURATION_HOURS
        cycle_used += self.PICKUP_DURATION_HOURS

        # 3. Drive Leg 2: Pickup -> Dropoff
        if leg2["distance_miles"] > 1.0:
            process_driving_leg(p_pick, p_drop, leg2["distance_miles"], "to Dropoff", leg2.get("coordinates", []))


        # 4. At Dropoff: 1 hour On-Duty Not Driving
        stops.append({
            "type": "dropoff",
            "name": f"Dropoff: {p_drop['name']}",
            "lat": p_drop["lat"],
            "lng": p_drop["lng"],
            "time": curr_time.isoformat(),
            "notes": "1.0 hr On-Duty unloading & completion"
        })
        dropoff_end = curr_time + timedelta(hours=self.DROPOFF_DURATION_HOURS)
        events.append({
            "status": "on_duty_nd",
            "line": 4,
            "start_time": curr_time.isoformat(),
            "end_time": dropoff_end.isoformat(),
            "duration": self.DROPOFF_DURATION_HOURS,
            "location": p_drop["name"],
            "remark": "Unloading & Sign-off at Dropoff (1 hr On-Duty)"
        })
        curr_time = dropoff_end
        cycle_used += self.DROPOFF_DURATION_HOURS

        # 5. Post-trip inspection at destination
        post_dest_end = curr_time + timedelta(hours=self.POST_TRIP_HOURS)
        events.append({
            "status": "on_duty_nd",
            "line": 4,
            "start_time": curr_time.isoformat(),
            "end_time": post_dest_end.isoformat(),
            "duration": self.POST_TRIP_HOURS,
            "location": p_drop["name"],
            "remark": "Final Post-Trip Inspection"
        })
        curr_time = post_dest_end
        cycle_used += self.POST_TRIP_HOURS

        # 6. Fill remainder of final calendar day with Off-Duty so final day log reaches midnight (24.0 hrs)
        final_day_midnight = (curr_time + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        remaining_day_hours = (final_day_midnight - curr_time).total_seconds() / 3600.0
        if 0 < remaining_day_hours <= 24.0:
            events.append({
                "status": "off_duty",
                "line": 1,
                "start_time": curr_time.isoformat(),
                "end_time": final_day_midnight.isoformat(),
                "duration": round(remaining_day_hours, 2),
                "location": p_drop["name"],
                "remark": "Off Duty - Trip Completed"
            })

        return events, stops

    def _generate_daily_logs(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Partitions the continuous events timeline into 24-hour calendar days (00:00 to 24:00).
        Computes line totals (must equal 24.0), remarks, and 70hr/8day rolling recap.
        """
        if not events:
            return []

        # Find earliest and latest dates
        first_dt = datetime.fromisoformat(events[0]["start_time"])
        last_dt = datetime.fromisoformat(events[-1]["end_time"])

        day_start = first_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = last_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        if last_dt > end_date:
            end_date += timedelta(days=1)

        daily_logs = []
        rolling_cycle = self.current_cycle_used
        day_index = 1

        curr_day = day_start
        while curr_day < end_date:
            next_day = curr_day + timedelta(days=1)
            day_intervals = []
            day_miles = 0.0
            day_remarks = []

            # Slice events that intersect [curr_day, next_day)
            for ev in events:
                ev_start = datetime.fromisoformat(ev["start_time"])
                ev_end = datetime.fromisoformat(ev["end_time"])

                overlap_start = max(curr_day, ev_start)
                overlap_end = min(next_day, ev_end)

                if overlap_start < overlap_end:
                    start_hour = (overlap_start - curr_day).total_seconds() / 3600.0
                    end_hour = (overlap_end - curr_day).total_seconds() / 3600.0
                    duration = end_hour - start_hour

                    # Prorate miles if driving
                    miles_part = 0.0
                    if ev.get("status") == "driving" and ev.get("miles", 0) > 0:
                        total_ev_dur = (ev_end - ev_start).total_seconds() / 3600.0
                        if total_ev_dur > 0:
                            ratio = duration / total_ev_dur
                            miles_part = round(ev.get("miles", 0) * ratio, 1)
                            day_miles += miles_part

                    day_intervals.append({
                        "line": ev["line"],
                        "status": ev["status"],
                        "start_hour": round(start_hour, 2),
                        "end_hour": round(end_hour, 2),
                        "duration": round(duration, 2),
                        "location": ev.get("location", ""),
                        "remark": ev.get("remark", "")
                    })

                    # Format remark entry
                    time_str = overlap_start.strftime("%I:%M %p").lstrip("0")
                    day_remarks.append({
                        "time": time_str,
                        "hour": round(start_hour, 2),
                        "location": ev.get("location", ""),
                        "text": ev.get("remark", "")
                    })

            # Guarantee intervals span exact 0.0 to 24.0
            day_intervals = self._normalize_day_intervals(day_intervals)

            # Calculate line totals
            off_duty_tot = round(sum(it["duration"] for it in day_intervals if it["line"] == 1), 2)
            sleeper_tot = round(sum(it["duration"] for it in day_intervals if it["line"] == 2), 2)
            driving_tot = round(sum(it["duration"] for it in day_intervals if it["line"] == 3), 2)
            on_duty_nd_tot = round(sum(it["duration"] for it in day_intervals if it["line"] == 4), 2)

            # Reconcile tiny float rounding diff to ensure exactly 24.0
            sum_lines = off_duty_tot + sleeper_tot + driving_tot + on_duty_nd_tot
            diff = round(24.0 - sum_lines, 2)
            if diff != 0:
                off_duty_tot = round(off_duty_tot + diff, 2)

            on_duty_today = round(driving_tot + on_duty_nd_tot, 2)
            prior_cycle = rolling_cycle

            # Check if 34-hour restart took place on this day or recent
            has_restart = any("34-Hour Restart" in it.get("remark", "") for it in day_intervals)
            if has_restart:
                rolling_cycle = on_duty_today
            else:
                rolling_cycle = round(rolling_cycle + on_duty_today, 2)

            avail_tomorrow = max(0.0, round(self.CYCLE_LIMIT_HOURS - rolling_cycle, 2))

            daily_logs.append({
                "day_number": day_index,
                "date_str": curr_day.strftime("%m/%d/%Y"),
                "day_name": curr_day.strftime("%A"),
                "carrier_name": "Antigravity Freight Lines, LLC",
                "main_office": "Chicago, IL",
                "home_terminal": "Chicago, IL",
                "driver_name": "Alex Mercer",
                "vehicle_number": "TRK-4402 / TRL-8819",
                "shipping_number": f"BOL-8829{day_index}",
                "commodity": "General Freight / Commercial Goods",
                "miles_today": round(day_miles, 1),
                "totals": {
                    "off_duty": off_duty_tot,
                    "sleeper": sleeper_tot,
                    "driving": driving_tot,
                    "on_duty_nd": on_duty_nd_tot,
                    "total": 24.0
                },
                "intervals": day_intervals,
                "remarks": day_remarks,
                "recap": {
                    "on_duty_today": on_duty_today,
                    "prior_cycle_used": prior_cycle,
                    "accumulated_cycle": rolling_cycle,
                    "available_tomorrow": avail_tomorrow,
                    "cycle_limit": self.CYCLE_LIMIT_HOURS
                }
            })

            day_index += 1
            curr_day = next_day

        return daily_logs

    def _normalize_day_intervals(self, intervals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ensures interval list has no gaps and spans precisely from 0.0 to 24.0."""
        if not intervals:
            return [{
                "line": 1,
                "status": "off_duty",
                "start_hour": 0.0,
                "end_hour": 24.0,
                "duration": 24.0,
                "location": "Terminal",
                "remark": "Off Duty all day"
            }]

        intervals.sort(key=lambda x: x["start_hour"])
        fixed = []
        curr_h = 0.0

        for it in intervals:
            if it["start_hour"] > curr_h + 0.01:
                # Fill gap with off_duty
                gap_dur = round(it["start_hour"] - curr_h, 2)
                fixed.append({
                    "line": 1,
                    "status": "off_duty",
                    "start_hour": round(curr_h, 2),
                    "end_hour": round(it["start_hour"], 2),
                    "duration": gap_dur,
                    "location": it.get("location", ""),
                    "remark": "Off Duty"
                })
            it["start_hour"] = round(max(curr_h, it["start_hour"]), 2)
            it["duration"] = round(it["end_hour"] - it["start_hour"], 2)
            if it["duration"] > 0.001:
                fixed.append(it)
                curr_h = it["end_hour"]

        if curr_h < 24.0 - 0.01:
            fixed.append({
                "line": 1,
                "status": "off_duty",
                "start_hour": round(curr_h, 2),
                "end_hour": 24.0,
                "duration": round(24.0 - curr_h, 2),
                "location": fixed[-1]["location"] if fixed else "Terminal",
                "remark": "Off Duty"
            })

        return fixed
