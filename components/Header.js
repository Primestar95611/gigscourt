// components/Header.js
// ─────────────────────────────────────────────────────────
//  Service Marketplace PWA — Header Component
//  Contains: Logo, Search Bar, GPS Button, Radius Slider
//  Mobile-First | Sticky | PWA-optimized
// ─────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from “react”;

// ─── SVG Icon Components (inline, no external dependency) ─
const SearchIcon = () => (
<svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
<circle cx="11" cy="11" r="7.5" />
<line x1="16.5" y1="16.5" x2="22" y2="22" />
</svg>
);

const GPSIcon = () => (
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
<circle cx="12" cy="12" r="3" />
<path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
<circle cx="12" cy="12" r="7" opacity="0.4" />
</svg>
);

const MapPinIcon = () => (
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
<circle cx="12" cy="9" r="2.5" />
</svg>
);

const RadiusIcon = () => (
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
<circle cx="12" cy="12" r="2" />
<circle cx="12" cy="12" r="6" strokeDasharray="2 2" opacity="0.5" />
<circle cx="12" cy="12" r="10" strokeDasharray="2 3" opacity="0.3" />
</svg>
);

// ─── Radius formatting helper ──────────────────────────
/**

- Converts raw slider value (1–20 scale) to km distance.
- Uses a non-linear curve so short distances feel precise
- and long distances are reachable without being fiddly.
  */
  const SLIDER_MIN = 1;
  const SLIDER_MAX = 20;

function sliderToKm(val) {
// Non-linear mapping: 1→1km, 10→25km, 20→100km+
if (val <= 10) return val; // 1–10 km (linear)
// 11–20 maps to 11–100+ km (exponential)
return Math.round(10 + Math.pow((val - 10) / 10, 1.6) * 90);
}

function formatRadius(km) {
if (km >= 100) return “100+ km”;
if (km >= 10) return `${km} km`;
return `${km} km`;
}

function getFillPercent(val) {
return ((val - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
}

// ─── Main Header Component ─────────────────────────────
export default function Header({
searchQuery,
onSearchChange,
radiusKm,
onRadiusChange,
locationLabel,
onRequestGPS,
isLocating = false,
}) {
const [sliderVal, setSliderVal] = useState(() => {
// Reverse-map initial radiusKm back to slider position
if (!radiusKm || radiusKm <= 10) return radiusKm || 5;
// Approximate reverse for exponential section
return Math.round(10 + Math.pow((radiusKm - 10) / 90, 1 / 1.6) * 10);
});

const [badgePulse, setBadgePulse] = useState(false);
const badgeTimer = useRef(null);

// ── Handle slider change ────────────────────────────
const handleSlider = useCallback(
(e) => {
const raw = Number(e.target.value);
setSliderVal(raw);

```
  const km = sliderToKm(raw);
  onRadiusChange?.(km);

  // Pulse badge on change
  setBadgePulse(true);
  clearTimeout(badgeTimer.current);
  badgeTimer.current = setTimeout(() => setBadgePulse(false), 400);
},
[onRadiusChange]
```

);

const fillPct = getFillPercent(sliderVal);
const displayKm = sliderToKm(sliderVal);

return (
<header className="app-header">

```
  {/* ── Row 1: Logo + Location Pill ───────────────── */}
  <div className="header-top">
    <h1 className="header-logo">
      Gigs<span>Court</span>
    </h1>

    {/* Location status pill */}
    <button
      className={`location-pill ${locationLabel ? "active" : ""}`}
      onClick={onRequestGPS}
      aria-label="Update my location"
      style={{ background: "none", cursor: "pointer", border: "none", padding: 0 }}
    >
      {locationLabel ? (
        <>
          <span className="gps-dot" />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--red)",
              maxWidth: 130,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            }}
          >
            {locationLabel}
          </span>
        </>
      ) : (
        <>
          <MapPinIcon
            style={{ width: 13, height: 13, color: "var(--text-muted)" }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-muted)",
            }}
          >
            Set location
          </span>
        </>
      )}
    </button>
  </div>

  {/* ── Row 2: Search Bar ─────────────────────────── */}
  <div className="search-wrapper">
    <SearchIcon />

    <input
      type="search"
      inputMode="search"
      enterKeyHint="search"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      className="search-input"
      placeholder="Find gigs near you — barbers, stylists…"
      value={searchQuery}
      onChange={(e) => onSearchChange?.(e.target.value)}
      aria-label="Search for services or providers"
    />

    {/* GPS quick-locate button */}
    <button
      className="search-gps-btn"
      onClick={onRequestGPS}
      aria-label="Use my current location"
      disabled={isLocating}
      style={{
        opacity: isLocating ? 0.7 : 1,
        animation: isLocating ? "gpsPing 1s ease-out infinite" : "none",
      }}
    >
      <GPSIcon />
    </button>
  </div>

  {/* ── Row 3: Radius Slider ──────────────────────── */}
  <div className="radius-section">

    {/* Label row */}
    <div className="radius-label-row">
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <RadiusIcon
          style={{ width: 14, height: 14, color: "var(--text-muted)" }}
        />
        <span className="radius-label">Search Radius</span>
      </div>

      <span className={`radius-badge ${badgePulse ? "pulse" : ""}`}>
        {formatRadius(displayKm)}
      </span>
    </div>

    {/* Slider */}
    <div className="slider-track-wrapper">
      <input
        type="range"
        className="radius-slider"
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step={1}
        value={sliderVal}
        onChange={handleSlider}
        style={{ "--fill-pct": `${fillPct}%` }}
        aria-label="Distance radius filter"
        aria-valuetext={formatRadius(displayKm)}
      />
    </div>

    {/* Min / Max markers */}
    <div className="slider-markers">
      <span className="slider-marker">1 km</span>
      <span className="slider-marker">25 km</span>
      <span className="slider-marker">100+ km</span>
    </div>

  </div>
</header>
```

);
}

// ─── PropTypes documentation (plain comments, no lib needed) ─
/**

- Props:
- searchQuery    {string}   - current search input value
- onSearchChange {function} - called with new search string
- radiusKm       {number}   - current radius in kilometres
- onRadiusChange {function} - called with new km value
- locationLabel  {string}   - human label e.g. “Sabo Auchi”
- onRequestGPS   {function} - triggers GPS lookup in App.js
- isLocating     {boolean}  - true while GPS is fetching
  */
