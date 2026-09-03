from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from datetime import datetime
from api.services.hos_engine import HOSEngine

class HOSEngineTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_short_trip_single_day(self):
        """Test a regional trip (Richmond -> Baltimore -> Newark) ~350 miles."""
        engine = HOSEngine(current_cycle_used=10.0, start_datetime=datetime(2026, 9, 1, 6, 0))
        result = engine.plan_trip("Richmond, VA", "Baltimore, MD", "Newark, NJ")

        self.assertIn("summary", result)
        self.assertIn("daily_logs", result)
        self.assertIn("stops", result)

        summary = result["summary"]
        self.assertGreater(summary["total_miles"], 200)
        self.assertGreater(summary["total_driving_hours"], 3)

        # Check daily log sheet
        logs = result["daily_logs"]
        self.assertGreaterEqual(len(logs), 1)
        for log in logs:
            totals = log["totals"]
            day_sum = totals["off_duty"] + totals["sleeper"] + totals["driving"] + totals["on_duty_nd"]
            self.assertAlmostEqual(day_sum, 24.0, places=2)
            self.assertEqual(totals["total"], 24.0)

    def test_long_haul_fuel_and_10h_rest(self):
        """Test a cross-country trip (>2,000 miles) triggering 1,000-mi fuel stops and 10h rest breaks."""
        engine = HOSEngine(current_cycle_used=5.0, start_datetime=datetime(2026, 9, 1, 6, 0))
        result = engine.plan_trip("Los Angeles, CA", "Phoenix, AZ", "Atlanta, GA")

        summary = result["summary"]
        self.assertGreater(summary["total_miles"], 1800)

        # Must have at least 1 fuel stop and at least one 10-hour rest stop
        stops = result["stops"]
        fuel_stops = [s for s in stops if s["type"] == "fuel"]
        rest_stops = [s for s in stops if s["type"] == "rest_10h"]
        self.assertGreaterEqual(len(fuel_stops), 1, "Should have at least 1 fueling stop for >1800 miles")
        self.assertGreaterEqual(len(rest_stops), 1, "Should have at least one 10-hour rest break")

        # Verify daily logs
        logs = result["daily_logs"]
        self.assertGreater(len(logs), 1, "Cross-country trip should require multiple daily log sheets")
        for log in logs:
            totals = log["totals"]
            day_sum = totals["off_duty"] + totals["sleeper"] + totals["driving"] + totals["on_duty_nd"]
            self.assertAlmostEqual(day_sum, 24.0, places=2)

    def test_34_hour_restart_near_limit(self):
        """Test that starting with 65 hours cycle used triggers a 34-hour restart."""
        engine = HOSEngine(current_cycle_used=66.0, start_datetime=datetime(2026, 9, 1, 6, 0))
        result = engine.plan_trip("Chicago, IL", "Indianapolis, IN", "Dallas, TX")

        events = result["events"]
        restarts = [e for e in events if "34-Hour Restart" in e.get("remark", "")]
        self.assertGreaterEqual(len(restarts), 1, "Must schedule a 34-Hour Restart when cycle is nearly exhausted")

    def test_api_endpoints(self):
        # Health check
        health_resp = self.client.get('/api/health/')
        self.assertEqual(health_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(health_resp.data.get("status"), "healthy")

        # Presets check
        presets_resp = self.client.get('/api/presets/')
        self.assertEqual(presets_resp.status_code, status.HTTP_200_OK)
        self.assertGreater(len(presets_resp.data.get("presets", [])), 2)

        # Plan trip POST
        plan_resp = self.client.post('/api/plan-trip/', {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Dallas, TX",
            "current_cycle_used": 15.0
        }, format='json')
        self.assertEqual(plan_resp.status_code, status.HTTP_200_OK)
        self.assertIn("daily_logs", plan_resp.data)
        self.assertIn("summary", plan_resp.data)
