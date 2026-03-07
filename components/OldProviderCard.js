// components/ProviderCard.js
// ─────────────────────────────────────────────────────────
//  GigsCourt — Provider Card Component
//  The main building block of the search results feed.
//  Designed for a 2-column mobile grid.
//
//  Props:
//    provider {object} — see PropTypes at bottom of file
//    onViewPortfolio {function} — called when button is tapped
// ─────────────────────────────────────────────────────────

import { useState } from “react”;

// ─── SVG Icons (inline — zero dependencies) ───────────────

const StarIcon = ({ filled }) => (
<svg
width=“11”
height=“11”
viewBox=“0 0 24 24”
fill={filled ? “#FF385C” : “none”}
stroke={filled ? “#FF385C” : “#CCCCDD”}
strokeWidth=“2”
strokeLinecap=“round”
strokeLinejoin=“round”

```
<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
```

  </svg>
);

const MapPinIcon = () => (
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
<circle cx="12" cy="9" r="2.5" />
</svg>
);

const ArrowIcon = () => (
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
<path d="M5 12h14M12 5l7 7-7 7" />
</svg>
);

const VerifiedIcon = () => (
<svg width="12" height="12" viewBox="0 0 24 24" fill="#FF385C" stroke="none">
<path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
<path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
);

// ─── Star Rating Display ───────────────────────────────────
function StarRating({ rating, reviewCount }) {
const MAX_STARS = 5;
const fullStars  = Math.floor(rating);
const hasHalf    = rating % 1 >= 0.5;

return (
<div style={styles.ratingRow}>
<div style={styles.stars}>
{Array.from({ length: MAX_STARS }, (_, i) => (
<StarIcon key={i} filled={i < fullStars || (i === fullStars && hasHalf)} />
))}
</div>
<span style={styles.ratingText}>
{rating.toFixed(1)}
</span>
{reviewCount != null && (
<span style={styles.reviewCount}>({reviewCount})</span>
)}
</div>
);
}

// ─── Image with Skeleton Loader ────────────────────────────
function ProviderImage({ src, alt, category }) {
const [loaded,  setLoaded]  = useState(false);
const [errored, setErrored] = useState(false);

// Fallback gradient per category when image fails
const fallbackGradients = {
barber:   “linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)”,
stylist:  “linear-gradient(135deg, #2d1b4e 0%, #1a0a2e 100%)”,
tailor:   “linear-gradient(135deg, #1b2838 0%, #0d1b2a 100%)”,
makeup:   “linear-gradient(135deg, #3d1a1a 0%, #2a0d0d 100%)”,
default:  “linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)”,
};

const fallback = fallbackGradients[category?.toLowerCase()] || fallbackGradients.default;

return (
<div style={styles.imageWrapper}>
{/* Skeleton shown until image loads */}
{!loaded && !errored && (
<div style={styles.skeleton} className="skeleton" />
)}

```
  {/* Fallback when image errors */}
  {errored && (
    <div style={{ ...styles.imageFallback, background: fallback }}>
      <span style={styles.fallbackEmoji}>
        {category === "barber"  ? "✂️" :
         category === "stylist" ? "💇" :
         category === "tailor"  ? "🧵" :
         category === "makeup"  ? "💄" : "⭐"}
      </span>
    </div>
  )}

  {!errored && (
    <img
      src={src}
      alt={alt}
      style={{
        ...styles.image,
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
      onLoad={() => setLoaded(true)}
      onError={() => setErrored(true)}
      loading="lazy"
    />
  )}
</div>
```

);
}

// ─── Main ProviderCard Component ───────────────────────────
export default function ProviderCard({ provider, onViewPortfolio }) {
const [pressed, setPressed] = useState(false);

const {
id,
businessName  = “Unnamed Provider”,
locationName  = “Unknown Area”,
distanceKm    = null,
rating        = 0,
reviewCount   = 0,
imageUrl      = “”,
category      = “default”,
isVerified    = false,
isAvailable   = true,
} = provider || {};

const handlePress      = () => setPressed(true);
const handleRelease    = () => setPressed(false);
const handlePortfolio  = () => {
setPressed(false);
onViewPortfolio?.(provider);
};

const formatDistance = (km) => {
if (km == null)   return null;
if (km < 1)       return `${Math.round(km * 1000)}m away`;
if (km < 10)      return `${km.toFixed(1)}km away`;
return `${Math.round(km)}km away`;
};

return (
<article
style={{
…styles.card,
transform: pressed ? “scale(0.97)” : “scale(1)”,
boxShadow: pressed
? “0 2px 8px rgba(0,0,0,0.06)”
: “0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)”,
}}
onMouseDown={handlePress}
onMouseUp={handleRelease}
onMouseLeave={handleRelease}
onTouchStart={handlePress}
onTouchEnd={handleRelease}
role=“article”
aria-label={`${businessName} — ${locationName}`}
>

```
  {/* ── Card Header: Location + Distance ─────────── */}
  <div style={styles.cardHeader}>
    <div style={styles.locationRow}>
      <MapPinIcon />
      <span style={styles.locationName} title={locationName}>
        {locationName}
      </span>
      {isVerified && (
        <span style={styles.verifiedWrap} title="Verified Provider">
          <VerifiedIcon />
        </span>
      )}
    </div>

    {/* Distance badge — only shown when distance is known */}
    {distanceKm != null && (
      <span style={styles.distanceBadge}>
        {formatDistance(distanceKm)}
      </span>
    )}
  </div>

  {/* ── Provider Work Image ───────────────────────── */}
  <ProviderImage
    src={imageUrl}
    alt={`Work sample by ${businessName}`}
    category={category}
  />

  {/* ── Availability Dot ──────────────────────────── */}
  <div style={styles.availabilityDot(isAvailable)} title={isAvailable ? "Available now" : "Busy"} />

  {/* ── Card Footer ───────────────────────────────── */}
  <div style={styles.cardFooter}>

    {/* Business Name */}
    <h3 style={styles.businessName} title={businessName}>
      {businessName}
    </h3>

    {/* Star Rating */}
    <StarRating rating={rating} reviewCount={reviewCount} />

    {/* View Portfolio CTA */}
    <button
      style={styles.portfolioBtn}
      onClick={handlePortfolio}
      aria-label={`View portfolio of ${businessName}`}
    >
      <span>View Portfolio</span>
      <ArrowIcon />
    </button>

  </div>
</article>
```

);
}

// ─── Styles Object ────────────────────────────────────────
// Kept as a JS object so no extra CSS file is needed.
// Uses var(–*) tokens from styles.css for consistency.
const styles = {

card: {
backgroundColor: “var(–white)”,
borderRadius: “var(–radius-lg)”,
overflow: “hidden”,
display: “flex”,
flexDirection: “column”,
position: “relative”,
transition: “transform 0.15s ease, box-shadow 0.15s ease”,
cursor: “pointer”,
WebkitUserSelect: “none”,
userSelect: “none”,
},

// ── Header ──
cardHeader: {
display: “flex”,
alignItems: “center”,
justifyContent: “space-between”,
padding: “10px 10px 8px”,
gap: 4,
},

locationRow: {
display: “flex”,
alignItems: “center”,
gap: 4,
minWidth: 0,
flex: 1,
color: “var(–text-secondary)”,
},

locationName: {
fontFamily: “var(–font-body)”,
fontSize: 11,
fontWeight: 500,
color: “var(–text-secondary)”,
overflow: “hidden”,
textOverflow: “ellipsis”,
whiteSpace: “nowrap”,
letterSpacing: “0.1px”,
},

verifiedWrap: {
flexShrink: 0,
display: “flex”,
alignItems: “center”,
},

distanceBadge: {
flexShrink: 0,
display: “inline-flex”,
alignItems: “center”,
padding: “3px 8px”,
backgroundColor: “var(–red-mist)”,
border: “1px solid rgba(255,56,92,0.18)”,
borderRadius: “var(–radius-full)”,
fontFamily: “var(–font-display)”,
fontSize: 10,
fontWeight: 600,
color: “var(–red)”,
letterSpacing: “0.2px”,
whiteSpace: “nowrap”,
},

// ── Image ──
imageWrapper: {
position: “relative”,
width: “100%”,
aspectRatio: “1 / 1”,   // square — uniform across all cards
overflow: “hidden”,
backgroundColor: “var(–surface)”,
},

skeleton: {
position: “absolute”,
inset: 0,
borderRadius: 0,
},

image: {
width: “100%”,
height: “100%”,
objectFit: “cover”,
display: “block”,
},

imageFallback: {
position: “absolute”,
inset: 0,
display: “flex”,
alignItems: “center”,
justifyContent: “center”,
},

fallbackEmoji: {
fontSize: 32,
opacity: 0.6,
},

// ── Availability dot (absolute, overlaid on image corner) ──
availabilityDot: (available) => ({
position: “absolute”,
top: 46,   // just below the header row
right: 10,
width: 8,
height: 8,
borderRadius: “50%”,
backgroundColor: available ? “#22C55E” : “#94A3B8”,
border: “1.5px solid var(–white)”,
boxShadow: available ? “0 0 0 2px rgba(34,197,94,0.25)” : “none”,
zIndex: 2,
}),

// ── Footer ──
cardFooter: {
padding: “10px 10px 12px”,
display: “flex”,
flexDirection: “column”,
gap: 6,
},

businessName: {
fontFamily: “var(–font-display)”,
fontSize: 13,
fontWeight: 700,
color: “var(–text-primary)”,
margin: 0,
overflow: “hidden”,
textOverflow: “ellipsis”,
whiteSpace: “nowrap”,
letterSpacing: “-0.2px”,
lineHeight: 1.2,
},

// ── Rating ──
ratingRow: {
display: “flex”,
alignItems: “center”,
gap: 4,
},

stars: {
display: “flex”,
alignItems: “center”,
gap: 1,
},

ratingText: {
fontFamily: “var(–font-body)”,
fontSize: 11,
fontWeight: 600,
color: “var(–text-primary)”,
},

reviewCount: {
fontFamily: “var(–font-body)”,
fontSize: 10,
fontWeight: 400,
color: “var(–text-muted)”,
},

// ── Button ──
portfolioBtn: {
marginTop: 2,
width: “100%”,
height: 34,
display: “flex”,
alignItems: “center”,
justifyContent: “center”,
gap: 5,
backgroundColor: “var(–red)”,
color: “var(–white)”,
fontFamily: “var(–font-body)”,
fontSize: 12,
fontWeight: 600,
border: “none”,
borderRadius: “var(–radius-full)”,
cursor: “pointer”,
letterSpacing: “0.2px”,
transition: “background 0.15s ease”,
WebkitTapHighlightColor: “transparent”,
boxShadow: “0 3px 10px rgba(255,56,92,0.30)”,
},
};

// ─── PropTypes Reference (no library needed) ──────────────
/**

- provider {object}:
- id           {string|number} — unique key
- businessName {string}        — e.g. “Khalid Cuts”
- locationName {string}        — human area, e.g. “Sabo Auchi”
- distanceKm   {number|null}   — calculated by locationService.js
- rating       {number}        — 0.0 – 5.0
- reviewCount  {number}        — total reviews
- imageUrl     {string}        — work sample photo URL
- category     {string}        — “barber”|“stylist”|“tailor”|“makeup”
- isVerified   {boolean}       — shows verified badge
- isAvailable  {boolean}       — green/grey availability dot
- 
- onViewPortfolio {function}:
- Called with the full provider object when button is tapped.
- App.js will use this to open a detail/portfolio screen.
  */
