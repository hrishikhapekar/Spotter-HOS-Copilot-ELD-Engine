from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services.hos_engine import HOSEngine

class TripPlanView(APIView):
    """
    POST /api/plan-trip/
    Body:
    {
      "current_location": "Chicago, IL",
      "pickup_location": "Indianapolis, IN",
      "dropoff_location": "Dallas, TX",
      "current_cycle_used": 15.5,
      "avg_speed": 58.0,
      "start_time": "2026-09-04T06:00:00"
    }
    """
    def post(self, request):
        data = request.data
        current_loc = data.get("current_location", "").strip()
        pickup_loc = data.get("pickup_location", "").strip()
        dropoff_loc = data.get("dropoff_location", "").strip()

        if not current_loc or not pickup_loc or not dropoff_loc:
            return Response(
                {"error": "Please provide current_location, pickup_location, and dropoff_location."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            current_cycle_used = float(data.get("current_cycle_used", 0.0))
        except (ValueError, TypeError):
            current_cycle_used = 0.0

        avg_speed = float(data.get("avg_speed", 58.0))

        start_time_str = data.get("start_time")
        start_datetime = None
        if start_time_str:
            try:
                start_datetime = datetime.fromisoformat(start_time_str)
            except Exception:
                start_datetime = None

        engine = HOSEngine(
            current_cycle_used=current_cycle_used,
            start_datetime=start_datetime,
            avg_speed=avg_speed
        )

        try:
            result = engine.plan_trip(current_loc, pickup_loc, dropoff_loc)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to calculate trip: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PresetsView(APIView):
    """
    GET /api/presets/
    Returns curated trip scenarios for rapid testing and demonstrations.
    """
    def get(self, request):
        presets = [
            {
                "id": "midwest_to_texas",
                "label": "Chicago, IL → Indianapolis, IN → Dallas, TX (~950 miles)",
                "description": "Cross-regional freight trip with 1h pickup, 30m rest break, 10h overnight rest, and 1h delivery.",
                "current_location": "Chicago, IL",
                "pickup_location": "Indianapolis, IN",
                "dropoff_location": "Dallas, TX",
                "current_cycle_used": 12.0
            },
            {
                "id": "cross_country_fuel",
                "label": "Los Angeles, CA → Phoenix, AZ → Atlanta, GA (~2,200 miles)",
                "description": "Multi-day long-haul requiring multiple 10-hour rest breaks and mandatory 1,000-mile fueling stops.",
                "current_location": "Los Angeles, CA",
                "pickup_location": "Phoenix, AZ",
                "dropoff_location": "Atlanta, GA",
                "current_cycle_used": 8.5
            },
            {
                "id": "northeast_corridor",
                "label": "Richmond, VA → Baltimore, MD → Newark, NJ (~350 miles)",
                "description": "Single-day regional delivery matching the FMCSA Guide sample log (pages 18-19).",
                "current_location": "Richmond, VA",
                "pickup_location": "Baltimore, MD",
                "dropoff_location": "Newark, NJ",
                "current_cycle_used": 20.0
            },
            {
                "id": "near_cycle_reset",
                "label": "Dallas, TX → Houston, TX → Miami, FL (~1,450 miles, 64 hrs used)",
                "description": "High starting cycle (64 hrs) triggering a mandatory 34-Hour Restart before reaching 70 hours.",
                "current_location": "Dallas, TX",
                "pickup_location": "Houston, TX",
                "dropoff_location": "Miami, FL",
                "current_cycle_used": 64.0
            }
        ]
        return Response({"presets": presets}, status=status.HTTP_200_OK)

class HealthView(APIView):
    def get(self, request):
        return Response({"status": "healthy", "service": "FMCSA HOS Planner API"}, status=status.HTTP_200_OK)
