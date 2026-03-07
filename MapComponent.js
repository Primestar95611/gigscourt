// MapComponent.js
// ─────────────────────────────────────────────────────────
//  GigsCourt — Map Component
//  Location: root directory (same level as App.js)
//
//  Current state: Placeholder UI
//  Next step: Integrate Google Maps or Leaflet.js with
//             provider pins plotted from Firestore GPS coords.
//
//  Props:
//    providers    {array}   — list of providers with lat/lng
//    userCoords   {object}  — { lat, lng } from GPS
//    radiusKm     {number}  — search radius circle to draw
//    onPinPress   {function}— called with provider when pin tapped
// ─────────────────────────────────────────────────────────

import { useState } from “react”;

// ── Icons ─────────────────────────────────────────────────
const MapPinIcon = () => (
<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
<circle cx="12" cy="9" r="2.5" />
</svg>
);

const CompassIcon = () => (
<svg width=“36” height=“36” viewBox=“0 0 24 24” fill=“none”
stroke=“currentColor” strokeWidth=“1.4” strokeLinecap=“round”
style={{ color: “#FF385C”, opacity: 0.6 }}>
<circle cx="12" cy="12" r="10" />
<polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
</svg>
);

// ── Fake map pin data for placeholder ────────────────────
const PLACEHOLDER_PINS = [
{ id: 1, name: “Elite Cuts”,     top: “38%”, left: “48%”, active: true  },
{ id: 2, name: “Glam Studio NG”, top: “55%”, left: “62%”, active: false },
{ id: 3, name: “Stitch & Silk”,  top: “30%”, left: “30%”, active: false },
{ id: 4, name: “Fade King”,      top: “65%”, left: “42%”, active: false },
{ id: 5, name: “Gloss & Glow”,   top: “44%”, left: “70%”, active: false },
];

// ── Main Component ────────────────────────────────────────
export default function MapComponent({
providers  = [],
userCoords = null,
radiusKm   = 5,
onPinPress,
}) {
const [activePin, setActivePin] = useState(1);
const [tooltip,   setTooltip]   = useState(PLACEHOLDER_PINS[0]);

const handlePinPress = (pin) => {
setActivePin(pin.id);
setTooltip(pin);
onPinPress?.(pin);
};

return (
<div style={styles.wrapper}>

```
  {/* ── Coming Soon Banner ── */}
  <div style={styles.banner}>
    <span style={styles.bannerDot} />
    <span style={styles.bannerText}>Map View — Coming Soon</span>
  </div>

  {/* ── Map Placeholder ── */}
  <div style={styles.mapArea}>

    {/* Grid overlay to simulate a map tile */}
    <div style={styles.gridOverlay} />

    {/* Radius circle */}
    <div style={styles.radiusCircle}>
      <span style={styles.radiusLabel}>{radiusKm}km</span>
    </div>

    {/* User location dot */}
    <div style={styles.userDot} title="Your location">
      <div style={styles.userDotInner} />
      <div style={styles.userDotRing} />
    </div>

    {/* Provider pins */}
    {PLACEHOLDER_PINS.map((pin) => (
      <button
        key={pin.id}
        style={{
          ...styles.pin,
          top: pin.top,
          left: pin.left,
          backgroundColor: activePin === pin.id ? "#FF385C" : "#FFFFFF",
          color:           activePin === pin.id ? "#FFFFFF" : "#FF385C",
          transform:       activePin === pin.id
            ? "translate(-50%, -100%) scale(1.15)"
            : "translate(-50%, -100%) scale(1)",
          zIndex: activePin === pin.id ? 10 : 5,
          boxShadow: activePin === pin.id
            ? "0 4px 14px rgba(255,56,92,0.45)"
            : "0 2px 8px rgba(0,0,0,0.15)",
        }}
        onClick={() => handlePinPress(pin)}
        aria-label={`Pin: ${pin.name}`}
      >
        <MapPinIcon />
      </button>
    ))}

    {/* Active pin tooltip */}
    {tooltip && (
      <div style={{
        ...styles.tooltip,
        top:  `calc(${tooltip.top} - 12px)`,
        left: tooltip.left,
      }}>
        <span style={styles.tooltipText}>{tooltip.name}</span>
        <div style={styles.tooltipArrow} />
      </div>
    )}

    {/* Center compass watermark */}
    <div style={styles.compass}>
      <CompassIcon />
      <span style={styles.compassText}>Map Loading…</span>
    </div>

  </div>

  {/* ── Map footer info ── */}
  <div style={styles.footer}>
    <div style={styles.footerStat}>
      <span style={styles.footerNum}>{PLACEHOLDER_PINS.length}</span>
      <span style={styles.footerLabel}>providers shown</span>
    </div>
    <div style={styles.footerDivider} />
    <div style={styles.footerStat}>
      <span style={styles.footerNum}>{radiusKm}km</span>
      <span style={styles.footerLabel}>search radius</span>
    </div>
    <div style={styles.footerDivider} />
    <div style={styles.footerStat}>
      <span style={{ ...styles.footerNum, color: userCoords ? "#22C55E" : "#9999AA" }}>
        {userCoords ? "Active" : "Off"}
      </span>
      <span style={styles.footerLabel}>GPS</span>
    </div>
  </div>

  {/* ── Integration note ── */}
  <p style={styles.note}>
    🗺 Google Maps / Leaflet integration connects here.
    Provider GPS coordinates are already stored and ready.
  </p>

</div>
```

);
}

// ── Styles ────────────────────────────────────────────────
const styles = {
wrapper: {
display: “flex”,
flexDirection: “column”,
gap: 0,
backgroundColor: “var(–white, #fff)”,
borderRadius: “var(–radius-lg, 20px)”,
overflow: “hidden”,
boxShadow: “0 4px 16px rgba(0,0,0,0.08)”,
width: “100%”,
maxWidth: 480,
margin: “0 auto”,
},
banner: {
display: “flex”,
alignItems: “center”,
gap: 7,
padding: “10px 16px”,
backgroundColor: “rgba(255,56,92,0.06)”,
borderBottom: “1px solid rgba(255,56,92,0.12)”,
},
bannerDot: {
width: 7,
height: 7,
borderRadius: “50%”,
backgroundColor: “#FF385C”,
},
bannerText: {
fontFamily: “var(–font-body, ‘DM Sans’, sans-serif)”,
fontSize: 12,
fontWeight: 600,
color: “#FF385C”,
letterSpacing: “0.3px”,
},
mapArea: {
position: “relative”,
width: “100%”,
aspectRatio: “4/3”,
backgroundColor: “#E8EDF2”,
overflow: “hidden”,
},
gridOverlay: {
position: “absolute”,
inset: 0,
backgroundImage:
“linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), “ +
“linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)”,
backgroundSize: “40px 40px”,
},
radiusCircle: {
position: “absolute”,
top: “50%”,
left: “50%”,
transform: “translate(-50%, -50%)”,
width: “55%”,
aspectRatio: “1”,
borderRadius: “50%”,
border: “2px dashed rgba(255,56,92,0.4)”,
backgroundColor: “rgba(255,56,92,0.05)”,
display: “flex”,
alignItems: “flex-start”,
justifyContent: “flex-end”,
padding: 8,
pointerEvents: “none”,
},
radiusLabel: {
fontFamily: “var(–font-display, ‘Clash Display’, sans-serif)”,
fontSize: 10,
fontWeight: 700,
color: “#FF385C”,
opacity: 0.8,
},
userDot: {
position: “absolute”,
top: “50%”,
left: “50%”,
transform: “translate(-50%, -50%)”,
zIndex: 8,
},
userDotInner: {
width: 14,
height: 14,
borderRadius: “50%”,
backgroundColor: “#3B82F6”,
border: “3px solid #FFFFFF”,
boxShadow: “0 2px 8px rgba(59,130,246,0.5)”,
position: “relative”,
zIndex: 2,
},
userDotRing: {
position: “absolute”,
top: “50%”,
left: “50%”,
transform: “translate(-50%, -50%)”,
width: 30,
height: 30,
borderRadius: “50%”,
backgroundColor: “rgba(59,130,246,0.15)”,
zIndex: 1,
},
pin: {
position: “absolute”,
width: 32,
height: 32,
borderRadius: “50% 50% 50% 0”,
border: “2px solid #FF385C”,
display: “flex”,
alignItems: “center”,
justifyContent: “center”,
cursor: “pointer”,
transition: “all 0.2s ease”,
padding: 0,
WebkitTapHighlightColor: “transparent”,
},
tooltip: {
position: “absolute”,
transform: “translate(-50%, -100%)”,
marginTop: -52,
backgroundColor: “#0D0D12”,
color: “#FFFFFF”,
padding: “4px 10px”,
borderRadius: 6,
fontSize: 11,
fontWeight: 600,
fontFamily: “var(–font-body, ‘DM Sans’, sans-serif)”,
whiteSpace: “nowrap”,
pointerEvents: “none”,
zIndex: 20,
},
tooltipArrow: {
position: “absolute”,
bottom: -5,
left: “50%”,
transform: “translateX(-50%)”,
width: 0,
height: 0,
borderLeft: “5px solid transparent”,
borderRight: “5px solid transparent”,
borderTop: “5px solid #0D0D12”,
},
tooltipText: { display: “block” },
compass: {
position: “absolute”,
bottom: 16,
right: 16,
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
gap: 4,
opacity: 0.7,
},
compassText: {
fontFamily: “var(–font-body, ‘DM Sans’, sans-serif)”,
fontSize: 10,
fontWeight: 600,
color: “#5A5A6E”,
letterSpacing: “0.3px”,
},
footer: {
display: “flex”,
alignItems: “center”,
padding: “12px 16px”,
borderTop: “1px solid #F0F0F5”,
backgroundColor: “#FAFAFA”,
},
footerStat: {
flex: 1,
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
gap: 2,
},
footerNum: {
fontFamily: “var(–font-display, ‘Clash Display’, sans-serif)”,
fontSize: 16,
fontWeight: 700,
color: “#0D0D12”,
lineHeight: 1,
},
footerLabel: {
fontFamily: “var(–font-body, ‘DM Sans’, sans-serif)”,
fontSize: 10,
fontWeight: 500,
color: “#9999AA”,
textTransform: “uppercase”,
letterSpacing: “0.4px”,
},
footerDivider: {
width: 1,
height: 28,
backgroundColor: “#E8E8EE”,
},
note: {
fontFamily: “var(–font-body, ‘DM Sans’, sans-serif)”,
fontSize: 11,
color: “#9999AA”,
textAlign: “center”,
padding: “10px 16px 14px”,
margin: 0,
lineHeight: 1.6,
borderTop: “1px solid #F0F0F5”,
},
};
