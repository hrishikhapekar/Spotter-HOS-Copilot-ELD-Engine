import React, { useRef } from 'react';
import { Printer, CheckCircle, Clock, MapPin, ShieldAlert, Award } from 'lucide-react';

export default function EldLogSheet({ log, totalDays }) {
  const printRef = useRef(null);

  if (!log) return null;

  const {
    day_number,
    date_str,
    day_name,
    carrier_name,
    main_office,
    home_terminal,
    driver_name,
    vehicle_number,
    shipping_number,
    commodity,
    miles_today,
    totals,
    intervals,
    remarks,
    recap
  } = log;

  // Grid drawing parameters
  const GRID_LEFT = 140;
  const GRID_RIGHT = 880;
  const GRID_WIDTH = GRID_RIGHT - GRID_LEFT; // 740px
  const HOUR_WIDTH = GRID_WIDTH / 24; // ~30.83px per hour

  // Rows for the 4 lines (Y coordinates in SVG)
  const ROW_HEIGHT = 28;
  const HEADER_Y = 24;
  const ROW_Y = [
    54,  // Line 1: Off Duty
    82,  // Line 2: Sleeper Berth
    110, // Line 3: Driving
    138  // Line 4: On Duty (Not Driving)
  ];
  const GRID_BOTTOM = ROW_Y[3] + ROW_HEIGHT / 2;

  // Convert hour (0.0 - 24.0) to X pixel coordinate
  const hourToX = (hour) => GRID_LEFT + hour * HOUR_WIDTH;

  // Convert status line (1 to 4) to center Y pixel coordinate
  const lineToY = (lineNum) => ROW_Y[lineNum - 1];

  // Build stepped polyline points
  const polylinePoints = [];
  if (intervals && intervals.length > 0) {
    for (let i = 0; i < intervals.length; i++) {
      const it = intervals[i];
      const startX = hourToX(it.start_hour);
      const endX = hourToX(it.end_hour);
      const y = lineToY(it.line);

      if (i === 0) {
        polylinePoints.push(`${startX},${y}`);
      } else {
        // Vertical step from previous line to this line
        polylinePoints.push(`${startX},${y}`);
      }
      polylinePoints.push(`${endX},${y}`);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="eld-sheet-container" ref={printRef}>
      {/* Top Sheet Toolbar */}
      <div className="eld-toolbar no-print">
        <div className="eld-sheet-tag">
          <Award size={16} className="text-blue-400" />
          <span>Official FMCSA Form (§ 395.8)</span>
          <span className="badge-day">Day {day_number} of {totalDays}</span>
        </div>
        <div className="eld-toolbar-actions">
          <button className="btn-print" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Actual Paper Document Replica */}
      <div className="fmcsa-paper-sheet">
        {/* Document Header */}
        <div className="sheet-header">
          <div className="header-left">
            <h2 className="fmcsa-title">DRIVER’S DAILY LOG</h2>
            <div className="fmcsa-subtitle">(ONE CALENDAR DAY — 24 HOURS)</div>
            <div className="fmcsa-meta-small">
              <span>ORIGINAL — Submit to carrier within 13 days</span>
              <span>DUPLICATE — Driver retains possession for eight days</span>
            </div>
          </div>
          <div className="header-right">
            <div className="fmcsa-date-box">
              <div className="box-title">Date</div>
              <div className="box-val date-display">{date_str} ({day_name})</div>
            </div>
            <div className="fmcsa-miles-box">
              <div className="box-title">Total Miles Driving Today</div>
              <div className="box-val highlight-val">{miles_today} mi</div>
            </div>
          </div>
        </div>

        {/* Carrier & Driver Metadata Fields */}
        <div className="sheet-meta-grid">
          <div className="meta-field">
            <span className="field-lbl">Name of Carrier or Carriers:</span>
            <span className="field-val">{carrier_name}</span>
          </div>
          <div className="meta-field">
            <span className="field-lbl">Truck / Tractor & Trailer Numbers:</span>
            <span className="field-val">{vehicle_number}</span>
          </div>
          <div className="meta-field">
            <span className="field-lbl">Main Office Address:</span>
            <span className="field-val">{main_office}</span>
          </div>
          <div className="meta-field">
            <span className="field-lbl">Driver’s Signature in Full:</span>
            <span className="field-val signature-font">{driver_name}</span>
          </div>
          <div className="meta-field">
            <span className="field-lbl">Home Terminal Address:</span>
            <span className="field-val">{home_terminal}</span>
          </div>
          <div className="meta-field">
            <span className="field-lbl">Name of Co-Driver:</span>
            <span className="field-val">— (None / Solo Driver)</span>
          </div>
        </div>

        {/* SVG 24-HOUR GRAPH GRID */}
        <div className="graph-grid-wrapper">
          <svg
            viewBox="0 0 980 180"
            className="fmcsa-svg-grid"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background */}
            <rect x="0" y="0" width="980" height="180" fill="#ffffff" />

            {/* Status Row Headers */}
            <text x="12" y="58" className="grid-label">1. Off Duty</text>
            <text x="12" y="86" className="grid-label">2. Sleeper Berth</text>
            <text x="12" y="114" className="grid-label">3. Driving</text>
            <text x="12" y="142" className="grid-label">4. On Duty (Not Driving)</text>

            {/* Total Hours Header */}
            <text x="915" y="24" className="grid-header-label" textAnchor="middle">Total</text>
            <text x="915" y="36" className="grid-header-label" textAnchor="middle">Hours</text>

            {/* Outer Grid Border */}
            <rect
              x={GRID_LEFT}
              y="40"
              width={GRID_WIDTH}
              height={ROW_HEIGHT * 4}
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.5"
            />

            {/* Horizontal Row Divider Lines */}
            {ROW_Y.map((y, idx) => (
              <line
                key={`h-line-${idx}`}
                x1={GRID_LEFT}
                y1={40 + (idx + 1) * ROW_HEIGHT}
                x2={GRID_RIGHT}
                y2={40 + (idx + 1) * ROW_HEIGHT}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            ))}

            {/* Vertical Hour and Quarter-Hour Grid Lines */}
            {Array.from({ length: 25 }).map((_, h) => {
              const x = hourToX(h);
              const hourLabel =
                h === 0 ? "Mid-night" :
                h === 12 ? "Noon" :
                h === 24 ? "Mid-night" :
                h > 12 ? `${h - 12}` : `${h}`;

              return (
                <g key={`hour-${h}`}>
                  {/* Top Hour Label */}
                  <text
                    x={x}
                    y={HEADER_Y + (h === 0 || h === 12 || h === 24 ? 0 : 8)}
                    className="hour-tick-label"
                    textAnchor="middle"
                    fontSize={h === 0 || h === 12 || h === 24 ? "9" : "11"}
                    fontWeight={h === 0 || h === 12 || h === 24 ? "bold" : "600"}
                  >
                    {hourLabel}
                  </text>

                  {/* Vertical Hour Major Line */}
                  <line
                    x1={x}
                    y1="40"
                    x2={x}
                    y2={40 + ROW_HEIGHT * 4}
                    stroke="#475569"
                    strokeWidth={h === 0 || h === 12 || h === 24 ? "1.5" : "1"}
                  />

                  {/* 15-minute (Quarter Hour) Subdivisions within each hour */}
                  {h < 24 && [1, 2, 3].map((quarter) => {
                    const qX = x + quarter * (HOUR_WIDTH / 4);
                    return (
                      <g key={`q-${h}-${quarter}`}>
                        {ROW_Y.map((rowY, rIdx) => (
                          <line
                            key={`tick-${rIdx}`}
                            x1={qX}
                            y1={rowY - (quarter === 2 ? 8 : 4)}
                            x2={qX}
                            y2={rowY + (quarter === 2 ? 8 : 4)}
                            stroke="#94a3b8"
                            strokeWidth="0.8"
                            strokeDasharray={quarter === 2 ? "none" : "1,1"}
                          />
                        ))}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Total Hours Column Box & Values */}
            <rect
              x="880"
              y="40"
              width="70"
              height={ROW_HEIGHT * 4}
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
            {ROW_Y.map((_, idx) => (
              <line
                key={`tot-div-${idx}`}
                x1="880"
                y1={40 + (idx + 1) * ROW_HEIGHT}
                x2="950"
                y2={40 + (idx + 1) * ROW_HEIGHT}
                stroke="#94a3b8"
                strokeWidth="1"
              />
            ))}

            <text x="915" y="58" className="line-total-val" textAnchor="middle">{totals.off_duty.toFixed(2)}</text>
            <text x="915" y="86" className="line-total-val" textAnchor="middle">{totals.sleeper.toFixed(2)}</text>
            <text x="915" y="114" className="line-total-val" textAnchor="middle">{totals.driving.toFixed(2)}</text>
            <text x="915" y="142" className="line-total-val" textAnchor="middle">{totals.on_duty_nd.toFixed(2)}</text>

            {/* Bottom "= 24" verification badge */}
            <text x="915" y="170" className="grand-total-val" textAnchor="middle" fontWeight="bold">
              = {totals.total.toFixed(0)} hrs
            </text>

            {/* THE STEPPED LOG LINE (Authentic FMCSA Blue Ballpoint Ink Style) */}
            {polylinePoints.length > 0 && (
              <polyline
                points={polylinePoints.join(" ")}
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="miter"
              />
            )}
          </svg>
        </div>

        {/* Remarks Section */}
        <div className="sheet-remarks-section">
          <div className="remarks-title-bar">
            <span className="font-bold">REMARKS</span>
            <span className="remarks-sub">
              Enter name of place you reported, where released from work, and when/where each change of duty occurred (§ 395.8(h)).
            </span>
          </div>

          {/* Alternating 24-Hour Remarks Indicator Axis (Prevents text collision) */}
          <div className="remarks-axis-wrapper">
            <div className="remarks-axis-line"></div>
            {remarks && remarks.length > 0 && remarks.map((rm, idx) => {
              const posPercent = Math.min(96, Math.max(3, (rm.hour / 24) * 100));
              const isTop = idx % 2 === 0;

              return (
                <div
                  key={`pin-${idx}`}
                  className={`remarks-axis-pin ${isTop ? 'pin-direction-up' : 'pin-direction-down'}`}
                  style={{ left: `${posPercent}%` }}
                  title={`${rm.time} - ${rm.location} - ${rm.text}`}
                >
                  {isTop ? (
                    <>
                      <span className="pin-time-label pin-label-top">{rm.time}</span>
                      <div className="pin-stem"></div>
                      <div className="pin-dot"></div>
                    </>
                  ) : (
                    <>
                      <div className="pin-dot"></div>
                      <div className="pin-stem"></div>
                      <span className="pin-time-label pin-label-bottom">{rm.time}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Structured Chronological Remarks Table (Eliminates all jumbling) */}
          <div className="remarks-table-container">
            <table className="remarks-data-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Time</th>
                  <th style={{ width: '130px' }}>Duty Status</th>
                  <th style={{ width: '190px' }}>Location (City, ST)</th>
                  <th>Operational Remarks & HOS Activity</th>
                </tr>
              </thead>
              <tbody>
                {remarks && remarks.length > 0 ? (
                  remarks.map((rm, idx) => {
                    // Determine duty line from matching interval if available
                    const matchedInterval = intervals ? intervals.find(it => Math.abs(it.start_hour - rm.hour) < 0.05) : null;
                    const lineNum = matchedInterval ? matchedInterval.line : 4;
                    const statusName =
                      lineNum === 1 ? '1. Off Duty' :
                      lineNum === 2 ? '2. Sleeper Berth' :
                      lineNum === 3 ? '3. Driving' :
                      '4. On Duty (ND)';
                    const statusClass =
                      lineNum === 1 ? 'badge-line-1' :
                      lineNum === 2 ? 'badge-line-2' :
                      lineNum === 3 ? 'badge-line-3' :
                      'badge-line-4';

                    return (
                      <tr key={`rm-row-${idx}`}>
                        <td className="time-cell">{rm.time}</td>
                        <td>
                          <span className={`status-pill ${statusClass}`}>
                            {statusName}
                          </span>
                        </td>
                        <td className="loc-cell">{rm.location}</td>
                        <td className="text-cell">{rm.text}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="empty-remarks">
                      No duty status changes during this 24-hour cycle. Off Duty all day.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Shipping Manifest & Commodity */}
          <div className="shipping-info-row">
            <div className="ship-col">
              <span className="ship-lbl">Shipping Documents (BOL/Manifest No.):</span>
              <span className="ship-val">{shipping_number}</span>
            </div>
            <div className="ship-col">
              <span className="ship-lbl">Shipper & Commodity Hauling:</span>
              <span className="ship-val">{commodity}</span>
            </div>
          </div>
        </div>

        {/* 70-HOUR / 8-DAY RECAP TABLE (FMCSA standard) */}
        <div className="sheet-recap-table">
          <div className="recap-title">
            <strong>Recap: Complete at end of day</strong> (70 Hour / 8 Day Drivers)
          </div>
          <div className="recap-grid">
            <div className="recap-cell highlight-cell">
              <div className="rc-label">On duty hours today (Lines 3 & 4)</div>
              <div className="rc-val">{recap.on_duty_today.toFixed(2)} hrs</div>
            </div>
            <div className="recap-cell">
              <div className="rc-label">A. Total hours on duty last 7 days incl. today</div>
              <div className="rc-val">{recap.accumulated_cycle.toFixed(2)} hrs</div>
            </div>
            <div className="recap-cell accent-cell">
              <div className="rc-label">B. Total hours available tomorrow (70 hr. minus A)</div>
              <div className="rc-val text-emerald-700">{recap.available_tomorrow.toFixed(2)} hrs</div>
            </div>
            <div className="recap-cell">
              <div className="rc-label">Cycle Status (70 hrs / 8 days)</div>
              <div className="rc-val">
                {recap.available_tomorrow > 0 ? (
                  <span className="text-green-700 font-semibold">✓ Compliant</span>
                ) : (
                  <span className="text-red-700 font-semibold">34h Restart Needed</span>
                )}
              </div>
            </div>
          </div>
          <div className="recap-footer-note">
            *If you took 34 consecutive hours off duty or sleeper berth, you have full 70 hours available.
          </div>
        </div>
      </div>
    </div>
  );
}
