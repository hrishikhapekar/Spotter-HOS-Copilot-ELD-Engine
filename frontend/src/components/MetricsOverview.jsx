import React from 'react';
import { Route, Gauge, Clock, ShieldCheck, FileText, BatteryMedium } from 'lucide-react';

export default function MetricsOverview({ summary, source }) {
  if (!summary) return null;

  const cyclePercent = Math.min(100, Math.round((summary.ending_cycle_used / 70.0) * 100));
  const remainingCycle = Math.max(0, Math.round((70.0 - summary.ending_cycle_used) * 10) / 10);

  return (
    <div className="metrics-grid">
      {/* Card 1: Total Distance */}
      <div className="metric-card">
        <div className="metric-icon-wrap" style={{ color: 'var(--accent-primary)' }}>
          <Route size={22} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Total Distance</span>
          <div className="metric-value-row">
            <span className="metric-value">{summary.total_miles.toLocaleString()}</span>
            <span className="metric-unit">miles</span>
          </div>
          <span className="metric-sub">
            Leg 1: {summary.leg1_miles} mi • Leg 2: {summary.leg2_miles} mi
          </span>
        </div>
      </div>

      {/* Card 2: Driving Time */}
      <div className="metric-card">
        <div className="metric-icon-wrap" style={{ color: 'var(--accent-success)' }}>
          <Gauge size={22} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Driving Time</span>
          <div className="metric-value-row">
            <span className="metric-value">{summary.total_driving_hours}</span>
            <span className="metric-unit">hours</span>
          </div>
          <span className="metric-sub">
            Max 11h per shift limit enforced
          </span>
        </div>
      </div>

      {/* Card 3: Total Trip Duration */}
      <div className="metric-card">
        <div className="metric-icon-wrap" style={{ color: 'var(--accent-amber)' }}>
          <Clock size={22} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Trip Duration</span>
          <div className="metric-value-row">
            <span className="metric-value">{summary.total_trip_hours}</span>
            <span className="metric-unit">hours</span>
          </div>
          <span className="metric-sub">
            Rest: {summary.total_rest_hours}h • Loading: {summary.total_on_duty_nd_hours}h
          </span>
        </div>
      </div>

      {/* Card 4: Daily Log Sheets */}
      <div className="metric-card">
        <div className="metric-icon-wrap" style={{ color: '#7c3aed' }}>
          <FileText size={22} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Daily Log Sheets</span>
          <div className="metric-value-row">
            <span className="metric-value">{summary.total_days}</span>
            <span className="metric-unit">{summary.total_days === 1 ? 'Sheet' : 'Sheets'}</span>
          </div>
          <span className="metric-sub">
            24.0 hours per calendar sheet
          </span>
        </div>
      </div>

      {/* Card 5: 70-Hr / 8-Day Cycle Gauge */}
      <div className="metric-card col-span-2">
        <div className="metric-icon-wrap" style={{ color: 'var(--accent-primary)' }}>
          <BatteryMedium size={22} />
        </div>

        <div className="metric-body w-full">
          <div className="flex justify-between items-center mb-1">
            <span className="metric-label">70-Hour / 8-Day Cycle Used</span>
            <span className="cycle-badge-status">
              {summary.ending_cycle_used <= 70 ? 'Compliant' : 'Exceeded'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="metric-value">{summary.ending_cycle_used}</span>
            <span className="metric-unit">/ 70.0 hrs</span>
            <span className="metric-rem-tag">({remainingCycle} hrs available)</span>
          </div>
          <div className="cycle-progress-bar">
            <div
              className={`cycle-progress-fill ${cyclePercent > 85 ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${cyclePercent}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
