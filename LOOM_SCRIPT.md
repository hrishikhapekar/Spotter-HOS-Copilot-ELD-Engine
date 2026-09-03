# 3-5 Minute Loom Video Walkthrough Script
## Spotter Full-Stack Developer Assessment: FMCSA HOS Copilot & ELD Log Generator

---

### Video Overview
- **Target Duration:** 3:30 – 4:30 minutes
- **Speaker:** Full-Stack Developer
- **Screen Layout:** Fullscreen browser window (`http://localhost:5173/` or Vercel live URL) + small webcam bubble in the corner.
- **Goal:** Demonstrate compliance with the FMCSA Hours of Service (HOS) rules, show the interactive UI/UX, walk through the code architecture (Django REST Framework + React), and showcase the authentic multi-day ELD Driver's Daily Log (RODS) sheets.

---

### Segment 1: Introduction & Objective (0:00 – 0:45)
**[Action: Start on the main app dashboard with the header and preset cards visible]**

> *"Hi everyone! In this video, I’m presenting my submission for the Spotter Full-Stack Developer Assessment: the FMCSA HOS Copilot and Driver’s Daily Log Generator.*
> 
> *The objective was to build a full-stack web application using Django and React that takes trip details—Current Location, Pickup Location, Dropoff Location, and Current Cycle Hours Used—and outputs an interactive route map with all mandated stops and rests, alongside authentic, printable Driver's Daily Log (RODS) sheets.*
> 
> *Our solution strictly adheres to the FMCSA 49 CFR Part 395 regulations for property-carrying drivers: the 11-hour driving limit, 14-hour duty window, 30-minute rest break after 8 hours of cumulative driving, mandatory fueling at least once every 1,000 miles, 1-hour loading/unloading at stops, and the 70-hour / 8-day cycle with 34-hour restart logic."*

---

### Segment 2: Scenario 1 – Regional Single-Day Trip & Official RODS Sheet (0:45 – 1:45)
**[Action: Click on the 'Richmond, VA → Baltimore, MD → Newark, NJ' preset button]**

> *"Let’s test Scenario 1: a regional delivery along the Northeast corridor—matching the exact sample log provided in the FMCSA Guidebook.*
>
> *Notice our refined Minimalist Neumorphic (Soft UI) design system: all surfaces and cards seamlessly emerge from a single cohesive monochromatic base with dual-directional light highlights and dark falloff shadows, sunken inset input wells, and tactile pressed states.*
>
> *Looking at our KPI cards:*
> - *Total Distance is 325.3 miles across two legs (Empty repositioning to pickup, followed by laden haul).*
> - *Driving Time is 5.6 hours, well within the 11-hour limit.*
> - *Our 70-hour cycle updates to 28.1 hours used, leaving 41.9 hours available.*
>
> *Scrolling down to the map, you can see our Leaflet and OpenStreetMap integration plotting the exact route with custom markers for Origin, 1-hour Pickup loading, and 1-hour Dropoff unloading.*
>
> *And here is the highlight: our authentic FMCSA Driver's Daily Log Sheet. Notice how it faithfully mirrors the official 24-hour graph grid:*
> 1. *Row 1: Off Duty*
> 2. *Row 2: Sleeper Berth*
> 3. *Row 3: Driving*
> 4. *Row 4: On Duty (Not Driving)*
>
> *The stepped blue line precisely transitions between duty lines with 15-minute resolution, and the right-hand column validates that the total equals exactly 24.0 hours.*
>
> *Directly beneath the grid, we have solved the common logbook issue of jumbled remarks: an indicator axis points to duty changes along the 24-hour timeline, followed by a crisp, structured chronological remarks table showing exact timestamps, duty status badges, city/state locations, and activity reasons, accompanied by the official 70-Hour / 8-Day Recap table."*


---

### Segment 3: Scenario 2 – Cross-Country Multi-Day Trip with Fuel Stops & Rests (1:45 – 2:50)
**[Action: Click on the 'Los Angeles, CA → Phoenix, AZ → Atlanta, GA' preset button]**

> *"Now let's stress test the engine with a cross-country haul from Los Angeles to Phoenix to Atlanta—over 2,170 miles.*
>
> *Notice what happens immediately:*
> 1. *The engine determines that this trip cannot be done in a single shift, automatically generating 4 consecutive Daily Log Sheets.*
> 2. *It calculates 10 scheduled waypoints: inserting 10-hour consecutive overnight rest breaks every time the 11-hour driving cap or 14-hour duty window is approached.*
> 3. *It enforces the mandatory 1,000-mile fueling rule: scheduling 30-minute on-duty fueling stops at mile 1,000 and mile 2,000, which also reset the 8-hour driving clock.*
> 4. *Using the Day Selector tabs at the bottom, we can toggle between Day 1, Day 2, Day 3, and Day 4. Each sheet recalculates daily mileage, daily duty intervals totaling 24.0 hours, and rolling cycle hours."*

---

### Segment 4: Code Architecture & Implementation Highlights (2:50 – 3:45)
**[Action: Switch to VS Code / IDE displaying `backend/api/services/hos_engine.py` and `frontend/src/components/EldLogSheet.jsx`]**

> *"Let’s quickly inspect the codebase:*
> 
> *On the backend in Django REST Framework:*
> - *`hos_engine.py`: Encapsulates all statutory limits as configurable constants. The simulation advances a time cursor, checking cycle limits, 11-hour driving limits, 14-hour duty windows, and 1,000-mile fueling thresholds in a continuous loop, and then partitions the timeline into calendar days spanning midnight to midnight.*
> - *`routing_service.py`: Leverages OpenStreetMap Nominatim for geocoding and the OSRM routing engine for real road geometries and distances, backed by an offline freight hub fallback cache.*
> - *Comprehensive unit tests in `tests.py` validate all single-day, multi-day, and 34-hour restart scenarios with 100% pass rate.*
>
> *On the frontend in React + Vite:*
> - *`EldLogSheet.jsx`: Uses vector SVG to draw the exact 24-hour FMCSA graph grid with quarter-hour tick marks and stepped duty transitions.*
> - *`RouteMap.jsx`: Renders an interactive Leaflet map with custom status pins.*
> - *`hosSimulator.js`: Provides a client-side calculation mirror ensuring the app runs flawlessly on Vercel without external server cold starts."*

---

### Segment 5: Conclusion & Wrap-Up (3:45 – 4:00)
**[Action: Switch back to the web browser and click the 'Print / Save PDF' button to show the print preview]**

> *"Drivers and dispatchers can print or export any log sheet with one click. The repository is fully documented, live on Vercel, and backed by a robust Django REST Framework backend.*
>
> *Thank you for watching, and I look forward to your feedback!"*
