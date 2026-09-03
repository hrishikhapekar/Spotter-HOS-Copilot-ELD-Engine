import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Calendar, Clock, Navigation2, RefreshCw, Layers, CheckCircle2, ChevronRight, FileText, Info } from 'lucide-react';
import { planTrip, fetchPresets } from './services/api';
import RouteMap from './components/RouteMap';
import TripTimeline from './components/TripTimeline';
import MetricsOverview from './components/MetricsOverview';
import EldLogSheet from './components/EldLogSheet';
import LocationAutocomplete from './components/LocationAutocomplete';

export default function App() {
  const [currentLocation, setCurrentLocation] = useState('Chicago, IL');
  const [pickupLocation, setPickupLocation] = useState('Indianapolis, IN');
  const [dropoffLocation, setDropoffLocation] = useState('Dallas, TX');
  const [currentCycleUsed, setCurrentCycleUsed] = useState(15.0);
  const [startTime, setStartTime] = useState('2026-09-04T06:00');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tripData, setTripData] = useState(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [presets, setPresets] = useState([]);
  const [engineSource, setEngineSource] = useState('django_backend');

  useEffect(() => {
    // Load presets and run initial plan
    fetchPresets().then(data => {
      setPresets(data);
    });
    handlePlanTrip();
  }, []);

  const handlePlanTrip = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await planTrip({
        current_location: currentLocation,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        current_cycle_used: parseFloat(currentCycleUsed) || 0.0,
        start_time: startTime,
        avg_speed: 58.0
      });

      if (result.error) {
        setError(result.error);
      } else {
        setTripData(result);
        setActiveDayIndex(0);
        setEngineSource(result.source || 'django_backend');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (p) => {
    setCurrentLocation(p.current_location);
    setPickupLocation(p.pickup_location);
    setDropoffLocation(p.dropoff_location);
    setCurrentCycleUsed(p.current_cycle_used);

    // Trigger calculation with new preset
    setLoading(true);
    planTrip({
      current_location: p.current_location,
      pickup_location: p.pickup_location,
      dropoff_location: p.dropoff_location,
      current_cycle_used: p.current_cycle_used,
      start_time: startTime,
      avg_speed: 58.0
    }).then(result => {
      if (result.error) {
        setError(result.error);
      } else {
        setTripData(result);
        setActiveDayIndex(0);
        setEngineSource(result.source || 'django_backend');
      }
      setLoading(false);
    });
  };

  return (
    <div className="app-shell">
      {/* Top Cockpit Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="logo-icon-wrap">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="brand-title">Spotter HOS Copilot & ELD Engine</h1>
            <p className="brand-subtitle">FMCSA 49 CFR Part 395 Property-Carrying Compliance & Multi-Day Log Generator</p>
          </div>
        </div>

        <div className="header-status-group">
          <div className="badge-compliance">
            <CheckCircle2 size={15} style={{ color: 'var(--accent-success)' }} />
            <span>70hr / 8-Day Rule Active</span>
          </div>
          <div className="badge-engine">
            <span className="status-indicator-dot"></span>
            <span>{engineSource === 'django_backend' ? 'Django API Live' : 'Client Engine Live'}</span>
          </div>
        </div>
      </header>


      {/* Main App Body */}
      <main className="main-content-layout">
        {/* Preset Selector Banner */}
        <section className="presets-banner">
          <span className="presets-label">Quick Scenario Presets:</span>
          <div className="presets-pill-list">
            {presets.map(p => (
              <button
                key={p.id}
                type="button"
                className="btn-preset-pill"
                onClick={() => applyPreset(p)}
                title={p.description}
              >
                <span>{p.label.split('(')[0].trim()}</span>
                <span className="preset-miles">{p.label.includes('(') ? `(${p.label.split('(')[1]}` : ''}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Input Configuration & Top Controls */}
        <section className="trip-form-card">
          <form onSubmit={handlePlanTrip} className="trip-form-grid">
            <LocationAutocomplete
              id="current_loc"
              label="Current Location"
              icon={MapPin}
              iconColor="var(--accent-success)"
              placeholder="e.g. Chicago, IL"
              value={currentLocation}
              onChange={setCurrentLocation}
              required
            />

            <LocationAutocomplete
              id="pickup_loc"
              label="Pickup Location (1h Loading)"
              icon={Navigation2}
              iconColor="var(--accent-primary)"
              placeholder="e.g. Indianapolis, IN"
              value={pickupLocation}
              onChange={setPickupLocation}
              required
            />

            <LocationAutocomplete
              id="dropoff_loc"
              label="Dropoff Location (1h Unloading)"
              icon={MapPin}
              iconColor="#dc2626"
              placeholder="e.g. Dallas, TX"
              value={dropoffLocation}
              onChange={setDropoffLocation}
              required
            />


            <div className="input-group">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="cycle_used" className="input-label">
                  <Clock size={15} style={{ color: 'var(--accent-amber)' }} />
                  <span>Current Cycle Used</span>
                </label>
                <span className="cycle-value-badge">{currentCycleUsed} / 70 hrs</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="cycle_used"
                  type="range"
                  min="0"
                  max="70"
                  step="0.5"
                  className="range-input flex-1"
                  value={currentCycleUsed}
                  onChange={e => setCurrentCycleUsed(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min="0"
                  max="70"
                  step="0.5"
                  className="num-input-small"
                  value={currentCycleUsed}
                  onChange={e => setCurrentCycleUsed(Math.max(0, Math.min(70, parseFloat(e.target.value) || 0)))}
                />
              </div>
            </div>

            <div className="input-group submit-group">
              <button
                type="submit"
                id="btn-plan-trip"
                className="btn-plan-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    <span>Calculating FMCSA Itinerary...</span>
                  </>
                ) : (
                  <>
                    <Truck size={18} />
                    <span>Generate Compliant Route & ELD Logs</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Regulatory Assumptions Strip */}
          <div className="hos-assumptions-strip">
            <span style={{ fontWeight: 700, color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={14} /> FMCSA Rules:
            </span>
            <span>• 11h Max Drive</span>
            <span>• 14h Duty Window</span>
            <span>• 30m Break / 8h Drive</span>
            <span>• 10h Consecutive Rest</span>
            <span>• Fuel &le; 1,000 mi</span>
            <span>• 1h Pickup & 1h Dropoff</span>
            <span>• 34h Cycle Restart</span>
          </div>
        </section>


        {error && (
          <div className="error-card">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        {/* Output Metrics Overview */}
        {tripData && tripData.summary && (
          <MetricsOverview summary={tripData.summary} source={engineSource} />
        )}

        {/* Map & Timeline Split Section */}
        {tripData && (
          <section className="map-and-timeline-grid">
            <RouteMap
              locations={tripData.locations}
              stops={tripData.stops}
              routeGeometry={tripData.route_geometry}
            />
            <TripTimeline
              stops={tripData.stops}
              summary={tripData.summary}
            />
          </section>
        )}

        {/* DAILY LOG SHEETS (RODS) SECTION */}
        {tripData && tripData.daily_logs && tripData.daily_logs.length > 0 && (
          <section className="eld-logs-section">
            <div className="eld-logs-section-header">
              <div className="section-title-wrap">
                <FileText className="text-blue-400" size={24} />
                <div>
                  <h2 className="section-heading">FMCSA Driver's Daily Log Sheets (RODS)</h2>
                  <p className="section-subheading">
                    Official 24-Hour Graph Grids with stepped duty lines, location remarks, and 70-Hour / 8-Day recap
                  </p>
                </div>
              </div>

              {/* Day Selector Tabs */}
              <div className="day-selector-tabs no-print">
                {tripData.daily_logs.map((log, index) => (
                  <button
                    key={log.day_number}
                    className={`day-tab-btn ${activeDayIndex === index ? 'active' : ''}`}
                    onClick={() => setActiveDayIndex(index)}
                  >
                    <span className="tab-day-title">Day {log.day_number}</span>
                    <span className="tab-day-date">{log.date_str}</span>
                    <span className="tab-day-miles">{log.miles_today} mi</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Selected Log Sheet */}
            <div className="active-sheet-display">
              <EldLogSheet
                log={tripData.daily_logs[activeDayIndex]}
                totalDays={tripData.daily_logs.length}
              />
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer no-print">
        <div className="footer-content">
          <div>
            <span>Spotter Full-Stack Developer Assessment Submission</span> •
            <span className="text-slate-400 ml-1">Built with Django REST Framework, React & Leaflet</span>
          </div>
          <div className="text-slate-400">
            Adheres to FMCSA Interstate Truck Driver's Guide to Hours of Service (April 2022)
          </div>
        </div>
      </footer>
    </div>
  );
}
