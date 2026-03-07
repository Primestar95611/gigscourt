// components/ProfileGrid.js
// ─────────────────────────────────────────────────────────
//  GigsCourt — Provider Profile Page Component
//  Instagram-style 3-column square photo grid.
//  Includes profile header, verified badge, upload slot.
//
//  Props:
//    provider      {object}   — profile data (see bottom)
//    images        {array}    — array of uploaded work photos
//    onUpload      {function} — called with File object (→ Cloudinary later)
//    onImagePress  {function} — called with image object when tapped
// ─────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from “react”;

// ─── SVG Icons ─────────────────────────────────────────────

const PlusIcon = () => (
<svg width="28" height="28" viewBox="0 0 24 24" fill="none"
stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
<line x1="12" y1="5" x2="12" y2="19" />
<line x1="5" y1="12" x2="19" y2="12" />
</svg>
);

const VerifiedBadgeIcon = () => (
<svg width="18" height="18" viewBox="0 0 24 24">
<circle cx="12" cy="12" r="11" fill="#FF385C" />
<path d="M7 12.5l3.5 3.5 6.5-7"
stroke="white" strokeWidth="2.2"
strokeLinecap="round" strokeLinejoin="round"
fill="none" />
</svg>
);

const StarIcon = () => (
<svg width="13" height="13" viewBox="0 0 24 24"
fill="#FF385C" stroke="none">
<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
</svg>
);

const MapPinIcon = () => (
<svg width="13" height="13" viewBox="0 0 24 24" fill="none"
stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
<circle cx="12" cy="9" r="2.5" />
</svg>
);

const GridIcon = () => (
<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
stroke="currentColor" strokeWidth="2" strokeLinecap="round">
<rect x="3" y="3" width="7" height="7" rx="1" />
<rect x="14" y="3" width="7" height="7" rx="1" />
<rect x="3" y="14" width="7" height="7" rx="1" />
<rect x="14" y="14" width="7" height="7" rx="1" />
</svg>
);

// ─── Profile Header ────────────────────────────────────────
function ProfileHeader({ provider }) {
const [avatarError, setAvatarError] = useState(false);

const {
businessName  = “Your Business”,
locationName  = “Location”,
rating        = 0,
reviewCount   = 0,
category      = “Provider”,
avatarUrl     = “”,
isVerified    = false,
bio           = “”,
jobsCompleted = 0,
followers     = 0,
} = provider || {};

// Initials fallback when avatar fails
const initials = businessName
.split(” “)
.slice(0, 2)
.map((w) => w[0]?.toUpperCase() || “”)
.join(””);

return (
<div style={styles.profileHeader}>

```
  {/* ── Avatar ── */}
  <div style={styles.avatarWrapper}>
    {/* Decorative ring — Action Red gradient */}
    <div style={styles.avatarRing}>
      <div style={styles.avatarInner}>
        {!avatarError && avatarUrl ? (
          <img
            src={avatarUrl}
            alt={businessName}
            style={styles.avatarImg}
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div style={styles.avatarFallback}>
            <span style={styles.avatarInitials}>{initials || "?"}</span>
          </div>
        )}
      </div>
    </div>

    {/* Verified badge — sits at bottom-right of avatar */}
    {isVerified && (
      <div style={styles.verifiedBadge} title="Verified Provider">
        <VerifiedBadgeIcon />
      </div>
    )}
  </div>

  {/* ── Name + Category ── */}
  <h2 style={styles.profileName}>{businessName}</h2>
  <span style={styles.categoryChip}>{category}</span>

  {/* ── Location + Rating row ── */}
  <div style={styles.metaRow}>
    <div style={styles.metaItem}>
      <MapPinIcon />
      <span style={styles.metaText}>{locationName}</span>
    </div>
    <div style={styles.metaDivider} />
    <div style={styles.metaItem}>
      <StarIcon />
      <span style={styles.metaText}>
        {rating.toFixed(1)}
        <span style={styles.metaMuted}> ({reviewCount})</span>
      </span>
    </div>
  </div>

  {/* ── Bio ── */}
  {bio ? (
    <p style={styles.bio}>{bio}</p>
  ) : null}

  {/* ── Stats bar ── */}
  <div style={styles.statsBar}>
    <div style={styles.statItem}>
      <span style={styles.statNumber}>{jobsCompleted}</span>
      <span style={styles.statLabel}>Jobs</span>
    </div>
    <div style={styles.statDivider} />
    <div style={styles.statItem}>
      <span style={styles.statNumber}>{followers}</span>
      <span style={styles.statLabel}>Followers</span>
    </div>
    <div style={styles.statDivider} />
    <div style={styles.statItem}>
      <span style={styles.statNumber}>{rating.toFixed(1)}★</span>
      <span style={styles.statLabel}>Rating</span>
    </div>
  </div>

</div>
```

);
}

// ─── Upload Slot (first cell in grid) ─────────────────────
function UploadSlot({ onUpload, isUploading }) {
const inputRef = useRef(null);
const [dragOver, setDragOver] = useState(false);

const handleClick = () => inputRef.current?.click();

const handleFileChange = useCallback(
(e) => {
const file = e.target.files?.[0];
if (file) {
// ── Cloudinary connection point ──────────────────
// onUpload receives the raw File object.
// In the next step, locationService / uploadService
// will send this to Cloudinary and return a URL.
onUpload?.(file);
}
// Reset input so same file can be re-selected if needed
e.target.value = “”;
},
[onUpload]
);

return (
<button
onClick={handleClick}
onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
onDragLeave={() => setDragOver(false)}
onDrop={(e) => {
e.preventDefault();
setDragOver(false);
const file = e.dataTransfer.files?.[0];
if (file) onUpload?.(file);
}}
style={{
…styles.uploadSlot,
borderColor: dragOver ? “#FF385C” : “rgba(255,56,92,0.35)”,
backgroundColor: dragOver ? “rgba(255,56,92,0.06)” : “var(–surface)”,
transform: dragOver ? “scale(0.97)” : “scale(1)”,
}}
aria-label=“Upload a work photo”
disabled={isUploading}
>
{/* Hidden file input — mobile gallery access */}
<input
ref={inputRef}
type=“file”
accept=“image/*”
capture={false}       // false = gallery, not direct camera
style={{ display: “none” }}
onChange={handleFileChange}
aria-hidden=“true”
/>

```
  {isUploading ? (
    <div style={styles.uploadingSpinner}>
      <div style={styles.spinner} />
      <span style={styles.uploadLabel}>Uploading…</span>
    </div>
  ) : (
    <div style={styles.uploadContent}>
      <div style={styles.plusCircle}>
        <PlusIcon />
      </div>
      <span style={styles.uploadLabel}>Add Work</span>
    </div>
  )}
</button>
```

);
}

// ─── Individual Grid Image Cell ────────────────────────────
function GridCell({ image, index, onImagePress }) {
const [loaded, setLoaded]   = useState(false);
const [pressed, setPressed] = useState(false);

return (
<button
style={{
…styles.gridCell,
transform: pressed ? “scale(0.95)” : “scale(1)”,
transition: “transform 0.12s ease”,
}}
onMouseDown={() => setPressed(true)}
onMouseUp={() => setPressed(false)}
onMouseLeave={() => setPressed(false)}
onTouchStart={() => setPressed(true)}
onTouchEnd={() => setPressed(false)}
onClick={() => onImagePress?.(image, index)}
aria-label={`View work photo ${index + 1}`}
>
{/* Skeleton while loading */}
{!loaded && (
<div style={styles.cellSkeleton} className="skeleton" />
)}

```
  <img
    src={image.url}
    alt={image.caption || `Work photo ${index + 1}`}
    style={{
      ...styles.cellImage,
      opacity: loaded ? 1 : 0,
    }}
    onLoad={() => setLoaded(true)}
    loading="lazy"
  />

  {/* Category tag overlay on first image */}
  {index === 0 && image.isFeatured && (
    <div style={styles.featuredTag}>Featured</div>
  )}
</button>
```

);
}

// ─── Main ProfileGrid Component ────────────────────────────
export default function ProfileGrid({
provider,
images = [],
onUpload,
onImagePress,
}) {
const [isUploading, setIsUploading] = useState(false);

// ── Wrapped upload handler with loading state ──────────
// When Cloudinary is connected, replace the setTimeout
// with the real async upload call.
const handleUpload = useCallback(
async (file) => {
setIsUploading(true);
try {
// ── CLOUDINARY CONNECTION POINT ──────────────────
// Replace this placeholder with your upload call:
//
//   const formData = new FormData();
//   formData.append(“file”, file);
//   formData.append(“upload_preset”, “YOUR_PRESET”);
//   const res = await fetch(
//     “https://api.cloudinary.com/v1_1/YOUR_CLOUD/image/upload”,
//     { method: “POST”, body: formData }
//   );
//   const data = await res.json();
//   const newImage = { url: data.secure_url, id: data.public_id };
//   onUpload?.(newImage);
//
// For now, create a local preview URL:
const localUrl = URL.createObjectURL(file);
onUpload?.({ url: localUrl, id: Date.now(), caption: file.name });

```
    await new Promise((r) => setTimeout(r, 600)); // simulate upload
  } finally {
    setIsUploading(false);
  }
},
[onUpload]
```

);

const totalImages = images.length;

return (
<div style={styles.page}>

```
  {/* ── Profile Header ── */}
  <ProfileHeader provider={provider} />

  {/* ── Grid Section Header ── */}
  <div style={styles.gridSectionHeader}>
    <div style={styles.gridSectionLeft}>
      <GridIcon />
      <span style={styles.gridSectionTitle}>Work Portfolio</span>
    </div>
    <span style={styles.gridCount}>
      {totalImages} {totalImages === 1 ? "photo" : "photos"}
    </span>
  </div>

  {/* ── 3-Column Instagram Grid ── */}
  <div style={styles.grid}>

    {/* Slot 0: Always the upload button */}
    <UploadSlot onUpload={handleUpload} isUploading={isUploading} />

    {/* Slots 1–N: Work photos */}
    {images.map((image, index) => (
      <GridCell
        key={image.id || index}
        image={image}
        index={index}
        onImagePress={onImagePress}
      />
    ))}

    {/* Empty ghost slots to fill incomplete last row */}
    {(() => {
      const totalCells = totalImages + 1; // +1 for upload slot
      const remainder  = totalCells % 3;
      const ghosts     = remainder === 0 ? 0 : 3 - remainder;
      return Array.from({ length: ghosts }, (_, i) => (
        <div key={`ghost-${i}`} style={styles.ghostCell} />
      ));
    })()}

  </div>

  {/* Empty state — shown when no images yet */}
  {totalImages === 0 && (
    <div style={styles.emptyState}>
      <span style={styles.emptyEmoji}>📸</span>
      <p style={styles.emptyTitle}>No work photos yet</p>
      <p style={styles.emptySubtitle}>
        Tap the <strong style={{ color: "var(--red)" }}>+</strong> above
        to upload your first photo and attract clients.
      </p>
    </div>
  )}

</div>
```

);
}

// ─── Spinner keyframes (injected once) ────────────────────
const spinnerStyle = document.createElement(“style”);
spinnerStyle.textContent = `@keyframes gcSpin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinnerStyle);

// ─── Styles ────────────────────────────────────────────────
const styles = {

page: {
display: “flex”,
flexDirection: “column”,
backgroundColor: “var(–off-white)”,
minHeight: “100dvh”,
},

// ── Profile Header ──
profileHeader: {
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
backgroundColor: “var(–white)”,
padding: “28px 20px 24px”,
borderBottom: “1px solid var(–border-light)”,
},

avatarWrapper: {
position: “relative”,
marginBottom: 14,
},

avatarRing: {
width: 92,
height: 92,
borderRadius: “50%”,
padding: 3,
background: “linear-gradient(135deg, #FF385C 0%, #FF6B87 50%, #FF385C 100%)”,
boxShadow: “0 4px 20px rgba(255,56,92,0.35)”,
},

avatarInner: {
width: “100%”,
height: “100%”,
borderRadius: “50%”,
overflow: “hidden”,
border: “2.5px solid var(–white)”,
backgroundColor: “var(–surface)”,
},

avatarImg: {
width: “100%”,
height: “100%”,
objectFit: “cover”,
display: “block”,
},

avatarFallback: {
width: “100%”,
height: “100%”,
display: “flex”,
alignItems: “center”,
justifyContent: “center”,
background: “linear-gradient(135deg, #1a1a2e, #16213e)”,
},

avatarInitials: {
fontFamily: “var(–font-display)”,
fontSize: 28,
fontWeight: 700,
color: “var(–white)”,
letterSpacing: “-1px”,
},

verifiedBadge: {
position: “absolute”,
bottom: 2,
right: 2,
width: 22,
height: 22,
borderRadius: “50%”,
backgroundColor: “var(–white)”,
display: “flex”,
alignItems: “center”,
justifyContent: “center”,
boxShadow: “0 2px 6px rgba(0,0,0,0.15)”,
},

profileName: {
fontFamily: “var(–font-display)”,
fontSize: 22,
fontWeight: 700,
color: “var(–text-primary)”,
margin: “0 0 8px”,
letterSpacing: “-0.4px”,
textAlign: “center”,
},

categoryChip: {
display: “inline-block”,
padding: “4px 14px”,
backgroundColor: “var(–red-mist)”,
border: “1px solid rgba(255,56,92,0.2)”,
borderRadius: “var(–radius-full)”,
fontFamily: “var(–font-body)”,
fontSize: 12,
fontWeight: 600,
color: “var(–red)”,
letterSpacing: “0.3px”,
marginBottom: 12,
textTransform: “capitalize”,
},

metaRow: {
display: “flex”,
alignItems: “center”,
gap: 10,
marginBottom: 10,
},

metaItem: {
display: “flex”,
alignItems: “center”,
gap: 4,
color: “var(–text-secondary)”,
},

metaText: {
fontFamily: “var(–font-body)”,
fontSize: 13,
fontWeight: 500,
color: “var(–text-secondary)”,
},

metaMuted: {
color: “var(–text-muted)”,
fontWeight: 400,
},

metaDivider: {
width: 1,
height: 12,
backgroundColor: “var(–border)”,
},

bio: {
fontFamily: “var(–font-body)”,
fontSize: 13,
lineHeight: 1.55,
color: “var(–text-secondary)”,
textAlign: “center”,
margin: “0 0 14px”,
maxWidth: 280,
},

statsBar: {
display: “flex”,
alignItems: “center”,
gap: 0,
width: “100%”,
maxWidth: 280,
backgroundColor: “var(–surface)”,
borderRadius: “var(–radius-md)”,
overflow: “hidden”,
border: “1px solid var(–border-light)”,
},

statItem: {
flex: 1,
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
padding: “10px 0”,
gap: 2,
},

statNumber: {
fontFamily: “var(–font-display)”,
fontSize: 16,
fontWeight: 700,
color: “var(–text-primary)”,
lineHeight: 1,
},

statLabel: {
fontFamily: “var(–font-body)”,
fontSize: 10,
fontWeight: 500,
color: “var(–text-muted)”,
textTransform: “uppercase”,
letterSpacing: “0.4px”,
},

statDivider: {
width: 1,
height: 32,
backgroundColor: “var(–border)”,
},

// ── Grid Section Header ──
gridSectionHeader: {
display: “flex”,
alignItems: “center”,
justifyContent: “space-between”,
padding: “14px 14px 10px”,
},

gridSectionLeft: {
display: “flex”,
alignItems: “center”,
gap: 7,
color: “var(–text-secondary)”,
},

gridSectionTitle: {
fontFamily: “var(–font-display)”,
fontSize: 15,
fontWeight: 700,
color: “var(–text-primary)”,
},

gridCount: {
fontFamily: “var(–font-body)”,
fontSize: 12,
fontWeight: 500,
color: “var(–text-muted)”,
},

// ── The Grid ──
grid: {
display: “grid”,
gridTemplateColumns: “repeat(3, 1fr)”,
gap: 2,                  // thin Instagram-style gaps
backgroundColor: “#E8E8EE”, // gap colour shows through
},

// ── Upload Slot ──
uploadSlot: {
aspectRatio: “1 / 1”,
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
justifyContent: “center”,
gap: 6,
backgroundColor: “var(–surface)”,
border: “2px dashed rgba(255,56,92,0.35)”,
borderRadius: 0,         // flush with grid
cursor: “pointer”,
transition: “all 0.2s ease”,
WebkitTapHighlightColor: “transparent”,
outline: “none”,
padding: 0,
},

uploadContent: {
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
gap: 6,
},

plusCircle: {
width: 40,
height: 40,
borderRadius: “50%”,
backgroundColor: “var(–red)”,
display: “flex”,
alignItems: “center”,
justifyContent: “center”,
color: “var(–white)”,
boxShadow: “0 4px 12px rgba(255,56,92,0.35)”,
},

uploadLabel: {
fontFamily: “var(–font-body)”,
fontSize: 11,
fontWeight: 600,
color: “var(–red)”,
letterSpacing: “0.2px”,
},

uploadingSpinner: {
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
gap: 6,
},

spinner: {
width: 28,
height: 28,
borderRadius: “50%”,
border: “2.5px solid rgba(255,56,92,0.2)”,
borderTopColor: “var(–red)”,
animation: “gcSpin 0.75s linear infinite”,
},

// ── Grid Cells ──
gridCell: {
aspectRatio: “1 / 1”,
position: “relative”,
overflow: “hidden”,
backgroundColor: “var(–surface)”,
border: “none”,
borderRadius: 0,
padding: 0,
cursor: “pointer”,
display: “block”,
WebkitTapHighlightColor: “transparent”,
outline: “none”,
},

cellSkeleton: {
position: “absolute”,
inset: 0,
borderRadius: 0,
},

cellImage: {
width: “100%”,
height: “100%”,
objectFit: “cover”,
display: “block”,
transition: “opacity 0.3s ease”,
},

featuredTag: {
position: “absolute”,
bottom: 6,
left: 6,
padding: “2px 7px”,
backgroundColor: “var(–red)”,
borderRadius: “var(–radius-full)”,
fontFamily: “var(–font-body)”,
fontSize: 9,
fontWeight: 700,
color: “var(–white)”,
letterSpacing: “0.4px”,
textTransform: “uppercase”,
},

ghostCell: {
aspectRatio: “1 / 1”,
backgroundColor: “var(–surface)”,
},

// ── Empty State ──
emptyState: {
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
padding: “32px 24px”,
textAlign: “center”,
gap: 8,
animation: “fadeInUp 0.4s ease both”,
},

emptyEmoji: {
fontSize: 40,
marginBottom: 4,
},

emptyTitle: {
fontFamily: “var(–font-display)”,
fontSize: 18,
fontWeight: 700,
color: “var(–text-primary)”,
margin: 0,
},

emptySubtitle: {
fontFamily: “var(–font-body)”,
fontSize: 14,
color: “var(–text-muted)”,
lineHeight: 1.6,
maxWidth: 260,
margin: 0,
},
};

// ─── PropTypes Reference ──────────────────────────────────
/**

- provider {object}:
- businessName  {string}  — “Khalid Cuts”
- locationName  {string}  — “Sabo Auchi”
- avatarUrl     {string}  — profile photo URL
- category      {string}  — “Barber” | “Stylist” etc.
- rating        {number}  — 4.8
- reviewCount   {number}  — 132
- bio           {string}  — short provider description
- jobsCompleted {number}  — total completed gigs
- followers     {number}  — follower count
- isVerified    {boolean} — shows verified badge
- 
- images {array of objects}:
- { id, url, caption, isFeatured }
- 
- onUpload(file):
- Receives a raw File object.
- Replace the placeholder with your Cloudinary fetch call.
- 
- onImagePress(image, index):
- Called when a grid photo is tapped.
- Use to open a full-screen lightbox later.
  */
