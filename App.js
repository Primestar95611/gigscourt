// App.js
// ─────────────────────────────────────────────────────────
//  GigsCourt — Main Application (Audited & Corrected)
//
//  IMPORT PATH RULES (enforced):
//    ./components/  → Header, ProviderCard, ProfileGrid
//    ./             → CloudinaryUpload, MapComponent, ProfilePage
//
//  AUDIT FIXES APPLIED:
//    ✅ useEffect added to import list
//    ✅ loading state clears after 1.5s via useEffect
//    ✅ All component import paths verified
//    ✅ export default App confirmed at function declaration
//    ✅ Stubbed imports for CloudinaryUpload, MapComponent, ProfilePage
// ─────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from “react”;
import “./styles.css”;

// ── components/ sub-folder ────────────────────────────────
import Header       from “./components/Header”;
import ProviderCard from “./components/ProviderCard”;
import ProfileGrid  from “./components/ProfileGrid”;

// ── Root folder (same level as App.js) ───────────────────
// All three files now exist — imports are active.
import CloudinaryUpload from “./CloudinaryUpload”;
import MapComponent     from “./MapComponent”;
import ProfilePage      from “./ProfilePage”;

// ─── Dummy Provider Data ───────────────────────────────────
const DUMMY_PROVIDERS = [
{
id:           1,
businessName: “Elite Cuts”,
locationName: “Sabo Auchi”,
distanceKm:   1.2,
rating:       4.9,
reviewCount:  214,
imageUrl:     “https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80”,
category:     “barber”,
isVerified:   true,
isAvailable:  true,
},
{
id:           2,
businessName: “Glam Studio NG”,
locationName: “Iyamho”,
distanceKm:   3.7,
rating:       4.7,
reviewCount:  98,
imageUrl:     “https://images.unsplash.com/photo-1560066984-138daaa0ce8f?w=400&q=80”,
category:     “stylist”,
isVerified:   true,
isAvailable:  true,
},
{
id:           3,
businessName: “Stitch & Silk”,
locationName: “Fugar”,
distanceKm:   6.1,
rating:       4.5,
reviewCount:  61,
imageUrl:     “https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80”,
category:     “tailor”,
isVerified:   false,
isAvailable:  true,
},
{
id:           4,
businessName: “Fade King”,
locationName: “Auchi Town”,
distanceKm:   8.4,
rating:       4.6,
reviewCount:  177,
imageUrl:     “https://images.unsplash.com/photo-1521490683712-35a1cb235d1c?w=400&q=80”,
category:     “barber”,
isVerified:   true,
isAvailable:  false,
},
{
id:           5,
businessName: “Gloss & Glow”,
locationName: “Jattu”,
distanceKm:   12.0,
rating:       4.8,
reviewCount:  43,
imageUrl:     “https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80”,
category:     “makeup”,
isVerified:   false,
isAvailable:  true,
},
{
id:           6,
businessName: “Royal Tailors”,
locationName: “Uzairue”,
distanceKm:   15.5,
rating:       4.4,
reviewCount:  29,
imageUrl:     “https://images.unsplash.com/photo-1594938298603-c8148c4b4691?w=400&q=80”,
category:     “tailor”,
isVerified:   true,
isAvailable:  true,
},
];

const DUMMY_PROFILE = {
businessName:  “Elite Cuts”,
locationName:  “Sabo Auchi”,
avatarUrl:     “https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&q=80”,
category:      “Barber”,
rating:        4.9,
reviewCount:   214,
bio:           “Sharp fades. Clean lines. Premium cuts for the modern gentleman. Walk-ins welcome.”,
jobsCompleted: 847,
followers:     1203,
isVerified:    true,
};

const DUMMY_PORTFOLIO_IMAGES = [
{ id: 1, url: “https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&q=80”, isFeatured: true },
{ id: 2, url: “https://images.unsplash.com/photo-1521490683712-35a1cb235d1c?w=300&q=80” },
{ id: 3, url: “https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&q=80” },
{ id: 4, url: “https://images.unsplash.com/photo-1534297635766-a262cdcb8ee4?w=300&q=80” },
{ id: 5, url: “https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=300&q=80” },
{ id: 6, url: “https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&q=80” },
{ id: 7, url: “https://images.unsplash.com/photo-1593702288056-7cc3b8e26b36?w=300&q=80” },
];

// ─── DEV Toggle Banner ─────────────────────────────────────
function DevToggle({ view, onToggle }) {
return (
<div style={devStyles.wrapper}>
<span style={devStyles.label}>DEV</span>
<span style={devStyles.current}>
Current: <strong style={{ color: “#FF385C” }}>{view}</strong>
</span>
<button style={devStyles.button} onClick={onToggle}>
Switch to {view === “feed” ? “Profile →” : “← Feed”}
</button>
</div>
);
}

// ─── Feed View ─────────────────────────────────────────────
function FeedView({ providers, searchQuery, onViewPortfolio }) {
const filtered = providers.filter((p) => {
if (!searchQuery.trim()) return true;
const q = searchQuery.toLowerCase();
return (
p.businessName.toLowerCase().includes(q) ||
p.locationName.toLowerCase().includes(q)  ||
p.category.toLowerCase().includes(q)
);
});

return (
<main style={feedStyles.main}>

```
  <div style={feedStyles.resultsRow}>
    <span style={feedStyles.resultsCount}>
      {filtered.length} provider{filtered.length !== 1 ? "s" : ""} nearby
    </span>
  </div>

  {filtered.length > 0 ? (
    <div style={feedStyles.grid}>
      {filtered.map((provider, i) => (
        <div
          key={provider.id}
          className="animate-fadeInUp"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <ProviderCard
            provider={provider}
            onViewPortfolio={onViewPortfolio}
          />
        </div>
      ))}
    </div>
  ) : (
    <div style={feedStyles.emptyState}>
      <span style={{ fontSize: 44 }}>🔍</span>
      <p style={feedStyles.emptyTitle}>No results found</p>
      <p style={feedStyles.emptySub}>
        Try a different name or widen your radius.
      </p>
    </div>
  )}

</main>
```

);
}

// ─── App Root ──────────────────────────────────────────────
export default function App() {

// ── Loading state — clears splash screen ───────────────
// useEffect fires after first render, sets loading false
// after 1.5s. This guarantees the splash always clears
// even if GPS or network calls are slow.
const [loading, setLoading] = useState(true);

useEffect(() => {
const timer = setTimeout(() => {
setLoading(false);

```
  // Also dismiss the HTML splash loader directly
  // (belt-and-suspenders alongside the MutationObserver)
  const htmlLoader = document.getElementById("app-loader");
  if (htmlLoader) {
    htmlLoader.classList.add("hidden");
    setTimeout(() => htmlLoader.remove(), 450);
  }
}, 1500);

// Cleanup: cancel timer if component unmounts early
return () => clearTimeout(timer);
```

}, []); // ← empty array = runs once on mount only

// ── View Router ────────────────────────────────────────
const [view, setView] = useState(“feed”); // ‘feed’ | ‘profile’

// ── Search & Radius ────────────────────────────────────
const [searchQuery, setSearchQuery] = useState(””);
const [radiusKm,    setRadiusKm]    = useState(5);

// ── GPS / Location ─────────────────────────────────────
const [locationLabel, setLocationLabel] = useState(””);
const [userCoords,    setUserCoords]    = useState(null);
const [isLocating,    setIsLocating]    = useState(false);

// ── Portfolio Images ───────────────────────────────────
const [portfolioImages, setPortfolioImages] = useState(DUMMY_PORTFOLIO_IMAGES);

// ── GPS Handler ────────────────────────────────────────
const handleRequestGPS = useCallback(() => {
if (!navigator.geolocation) {
alert(“Location is not supported on this device.”);
return;
}
setIsLocating(true);
navigator.geolocation.getCurrentPosition(
async ({ coords: { latitude: lat, longitude: lng } }) => {
setUserCoords({ lat, lng });
try {
const res  = await fetch(
`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
);
const data = await res.json();
setLocationLabel(
data.address?.suburb  ||
data.address?.town    ||
data.address?.village ||
data.address?.city    ||
“My Location”
);
} catch {
setLocationLabel(`${lat.toFixed(3)}, ${lng.toFixed(3)}`);
}
setIsLocating(false);
},
(err) => {
console.error(“GPS error:”, err.message);
setIsLocating(false);
alert(“Could not get your location. Please check permissions.”);
},
{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
);
}, []);

// ── Upload Handler (Cloudinary-ready) ──────────────────
const handleUpload = useCallback((newImage) => {
setPortfolioImages((prev) => [newImage, …prev]);
}, []);

// ── View Portfolio from ProviderCard ───────────────────
const handleViewPortfolio = useCallback(() => {
setView(“profile”);
}, []);

// ── DEV Toggle ─────────────────────────────────────────
const toggleView = useCallback(() => {
setView((v) => (v === “feed” ? “profile” : “feed”));
}, []);

// ── Loading Screen ─────────────────────────────────────
// Shown for 1.5s while fonts, styles, and React boot.
if (loading) {
return (
<div style={loadingStyles.wrapper}>
<p style={loadingStyles.logo}>
Gigs<span style={{ color: “#FF385C” }}>Court</span>
</p>
<div style={loadingStyles.spinner} />
<p style={loadingStyles.tagline}>Finding gigs near you…</p>
</div>
);
}

// ── Main Render ────────────────────────────────────────
return (
<div style={appStyles.root}>

```
  {/* 1. DEV banner — remove after navigation is wired */}
  <DevToggle view={view} onToggle={toggleView} />

  {/* 2. Sticky Header — always visible */}
  <Header
    searchQuery={searchQuery}
    onSearchChange={setSearchQuery}
    radiusKm={radiusKm}
    onRadiusChange={setRadiusKm}
    locationLabel={locationLabel}
    onRequestGPS={handleRequestGPS}
    isLocating={isLocating}
  />

  {/* 3. View Router */}
  {view === "feed" && (
    <FeedView
      providers={DUMMY_PROVIDERS}
      searchQuery={searchQuery}
      onViewPortfolio={handleViewPortfolio}
    />
  )}

  {view === "profile" && (
    <ProfileGrid
      provider={DUMMY_PROFILE}
      images={portfolioImages}
      onUpload={handleUpload}
      onImagePress={(img, i) =>
        console.log("GigsCourt — image tapped:", img.url, "| index:", i)
      }
    />
  )}

</div>
```

);
}

// ─── Styles ────────────────────────────────────────────────

const appStyles = {
root: {
minHeight: “100dvh”,
display: “flex”,
flexDirection: “column”,
backgroundColor: “var(–off-white)”,
},
};

const loadingStyles = {
wrapper: {
position: “fixed”,
inset: 0,
backgroundColor: “#FFFFFF”,
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
justifyContent: “center”,
gap: 16,
zIndex: 9999,
},
logo: {
fontFamily: “var(–font-display, ‘Clash Display’, sans-serif)”,
fontSize: 28,
fontWeight: 700,
color: “#0D0D12”,
letterSpacing: “-0.5px”,
margin: 0,
},
spinner: {
width: 32,
height: 32,
borderRadius: “50%”,
border: “3px solid rgba(255,56,92,0.15)”,
borderTopColor: “#FF385C”,
animation: “gcSpin 0.7s linear infinite”,
},
tagline: {
fontFamily: “var(–font-body, ‘DM Sans’, sans-serif)”,
fontSize: 13,
color: “#9999AA”,
margin: 0,
letterSpacing: “0.2px”,
},
};

const devStyles = {
wrapper: {
display: “flex”,
alignItems: “center”,
justifyContent: “space-between”,
padding: “7px 14px”,
backgroundColor: “#0D0D12”,
gap: 8,
flexShrink: 0,
},
label: {
fontSize: 9,
fontWeight: 700,
letterSpacing: “1.5px”,
color: “rgba(255,255,255,0.3)”,
textTransform: “uppercase”,
border: “1px solid rgba(255,255,255,0.1)”,
padding: “2px 5px”,
borderRadius: 3,
fontFamily: “var(–font-body)”,
},
current: {
fontSize: 12,
color: “rgba(255,255,255,0.5)”,
fontFamily: “var(–font-body)”,
flex: 1,
textAlign: “center”,
},
button: {
fontFamily: “var(–font-body)”,
fontSize: 12,
fontWeight: 600,
color: “rgba(255,255,255,0.8)”,
backgroundColor: “rgba(255,56,92,0.18)”,
border: “1px solid rgba(255,56,92,0.35)”,
borderRadius: 20,
padding: “5px 13px”,
cursor: “pointer”,
whiteSpace: “nowrap”,
},
};

const feedStyles = {
main: {
flex: 1,
padding: “12px 10px 32px”,
display: “flex”,
flexDirection: “column”,
gap: 10,
},
resultsRow: {
paddingLeft: 4,
paddingBottom: 2,
},
resultsCount: {
fontFamily: “var(–font-body)”,
fontSize: 12,
fontWeight: 500,
color: “var(–text-muted)”,
letterSpacing: “0.2px”,
},
grid: {
display: “grid”,
gridTemplateColumns: “repeat(2, 1fr)”,
gap: 10,
},
emptyState: {
flex: 1,
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
justifyContent: “center”,
padding: “60px 24px”,
gap: 10,
textAlign: “center”,
animation: “fadeInUp 0.4s ease both”,
},
emptyTitle: {
fontFamily: “var(–font-display)”,
fontSize: 20,
fontWeight: 700,
color: “var(–text-primary)”,
margin: 0,
},
emptySub: {
fontFamily: “var(–font-body)”,
fontSize: 14,
color: “var(–text-muted)”,
lineHeight: 1.6,
margin: 0,
maxWidth: 260,
},
};
