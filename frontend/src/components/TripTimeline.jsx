import React from 'react';
import { MapPin, Navigation, Clock, Coffee, Moon, Fuel, CheckCircle2, RotateCcw } from 'lucide-react';

export default function TripTimeline({ stops, summary }) {
  if (!stops || stops.length === 0) return null;

  const getStopIcon = (type) => {
    switch (type) {
      case 'origin':
        return <Navigation className="icon-origin" size={16} />;
      case 'pickup':
        return <MapPin className="icon-pickup" size={16} />;
      case 'dropoff':
        return <CheckCircle2 className="icon-dropoff" size={16} />;
      case 'fuel':
        return <Fuel className="icon-fuel" size={16} />;
      case 'break_30m':
        return <Coffee className="icon-break" size={16} />;
      case 'rest_10h':
        return <Moon className="icon-rest" size={16} />;
      case 'restart_34h':
        return <RotateCcw className="icon-restart" size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  return (
    <div className="timeline-card">
      <div className="timeline-header">
        <h3 className="section-title">Route Itinerary & Scheduled Stops</h3>
        <span className="stop-count-badge">{stops.length} Waypoints</span>
      </div>

      <div className="stops-timeline-list">
        {stops.map((st, idx) => {
          const dt = st.time ? new Date(st.time) : null;
          const timeFormatted = dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const dateFormatted = dt ? dt.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

          return (
            <div key={idx} className={`timeline-stop-item type-${st.type}`}>
              <div className="timeline-node">
                <div className="node-icon-circle">
                  {getStopIcon(st.type)}
                </div>
                {idx < stops.length - 1 && <div className="timeline-line"></div>}
              </div>

              <div className="timeline-content">
                <div className="stop-title-row">
                  <span className="stop-name">{st.name}</span>
                  <div className="stop-time-tag">
                    <span className="date-sub">{dateFormatted}</span>
                    <span className="time-main">{timeFormatted}</span>
                  </div>
                </div>
                <div className="stop-notes-row">
                  <span className={`badge-type badge-${st.type}`}>{st.type.replace('_', ' ')}</span>
                  <span className="stop-notes-text">{st.notes}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
