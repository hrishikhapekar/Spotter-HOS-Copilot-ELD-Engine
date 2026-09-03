from django.urls import path
from .views import TripPlanView, PresetsView, HealthView

urlpatterns = [
    path('plan-trip/', TripPlanView.as_view(), name='plan-trip'),
    path('presets/', PresetsView.as_view(), name='presets'),
    path('health/', HealthView.as_view(), name='health'),
]
