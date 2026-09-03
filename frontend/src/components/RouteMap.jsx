import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function RouteMap({ locations, stops, routeGeometry }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current, {
        center: [39.8283, -98.5795], // Center of US
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // Free OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(map);

      leafletMapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = leafletMapRef.current;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const bounds = [];

    // Helper to generate clean SVG custom icons
    const createCustomIcon = (bgColor, iconChar, labelText) => {
      return L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            background: ${bgColor};
            color: #ffffff;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            border: 2px solid #ffffff;
          ">
            <span style="transform: rotate(45deg); font-size: 13px; font-weight: bold;">${iconChar}</span>
          </div>
          ${labelText ? `<div style="
            background: rgba(15, 23, 42, 0.9);
            color: #ffffff;
            font-size: 10px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
            margin-top: 4px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.2);
            text-align: center;
            width: fit-content;
            margin-left: -12px;
          ">${labelText}</div>` : ''}
        `,
        iconSize: [32, 48],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });
    };

    // Draw route polyline
    if (routeGeometry && routeGeometry.length > 0) {
      const polyline = L.polyline(routeGeometry, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.85,
        smoothFactor: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      routeGeometry.forEach(c => bounds.push(c));
    }

    // Add Stop & Waypoint Markers
    if (stops && stops.length > 0) {
      stops.forEach((st) => {
        let color = '#3b82f6';
        let iconSymbol = '📍';
        let badge = '';

        if (st.type === 'origin') {
          color = '#10b981'; // Green
          iconSymbol = 'A';
          badge = 'Origin';
        } else if (st.type === 'pickup') {
          color = '#0284c7'; // Blue
          iconSymbol = '📦';
          badge = 'Pickup (1h)';
        } else if (st.type === 'dropoff') {
          color = '#059669'; // Emerald
          iconSymbol = '🏁';
          badge = 'Dropoff (1h)';
        } else if (st.type === 'fuel') {
          color = '#d97706'; // Amber
          iconSymbol = '⛽';
          badge = 'Fuel Stop';
        } else if (st.type === 'break_30m') {
          color = '#0d9488'; // Teal
          iconSymbol = '☕';
          badge = '30m Break';
        } else if (st.type === 'rest_10h') {
          color = '#7c3aed'; // Purple
          iconSymbol = '🛌';
          badge = '10h Rest';
        } else if (st.type === 'restart_34h') {
          color = '#dc2626'; // Red
          iconSymbol = '🔄';
          badge = '34h Restart';
        }

        const markerIcon = createCustomIcon(color, iconSymbol, badge);
        const marker = L.marker([st.lat, st.lng], { icon: markerIcon }).addTo(layerGroup);

        const timeFormatted = st.time ? new Date(st.time).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : '';

        marker.bindPopup(`
          <div style="font-family: 'Inter', sans-serif; font-size: 12px; line-height: 1.4; color: #1e293b;">
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
              ${st.name}
            </div>
            <div style="margin-bottom: 4px;"><strong>Type:</strong> <span style="text-transform: capitalize;">${st.type.replace('_', ' ')}</span></div>
            ${timeFormatted ? `<div style="margin-bottom: 4px;"><strong>Estimated Time:</strong> ${timeFormatted}</div>` : ''}
            <div style="color: #475569; font-style: italic; background: #f1f5f9; padding: 4px 6px; border-radius: 4px; margin-top: 4px;">
              ${st.notes || ''}
            </div>
          </div>
        `);

        bounds.push([st.lat, st.lng]);
      });
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [locations, stops, routeGeometry]);

  return (
    <div className="map-container-card">
      <div className="map-header">
        <div className="map-title-row">
          <span className="map-title">Interactive Route & HOS Stop Waypoints</span>
          <span className="map-sub">OpenStreetMap & OSRM Engine</span>
        </div>
        <div className="map-legend">
          <span className="legend-item"><span className="dot dot-origin"></span> Origin</span>
          <span className="legend-item"><span className="dot dot-pickup"></span> Pickup (1h)</span>
          <span className="legend-item"><span className="dot dot-fuel"></span> Fuel (~1,000 mi)</span>
          <span className="legend-item"><span className="dot dot-break"></span> 30m Break</span>
          <span className="legend-item"><span className="dot dot-rest"></span> 10h Rest</span>
          <span className="legend-item"><span className="dot dot-dropoff"></span> Dropoff (1h)</span>
        </div>
      </div>
      <div ref={mapRef} className="leaflet-map-view" />
    </div>
  );
}
