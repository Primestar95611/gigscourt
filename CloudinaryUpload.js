// CloudinaryUpload.js
// ─────────────────────────────────────────────────────────
//  GigsCourt — Cloudinary Upload Module
//  Location: root directory (same level as App.js)
//
//  Current state: Placeholder UI
//  Next step: Connect to Cloudinary API with upload_preset
//
//  Props:
//    onUploadSuccess {function} — called with { url, publicId }
//    label           {string}   — button label override
//    disabled        {boolean}  — disables the upload button
// ─────────────────────────────────────────────────────────

import { useState, useRef } from “react”;

// ── Upload Icon ───────────────────────────────────────────
const UploadIcon = () => (
<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
<polyline points="16 16 12 12 8 16" />
<line x1="12" y1="12" x2="12" y2="21" />
<path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
</svg>
);

const CloudIcon = () => (
<svg width=“40” height=“40” viewBox=“0 0 24 24” fill=“none”
stroke=“currentColor” strokeWidth=“1.4” strokeLinecap=“round” strokeLinejoin=“round”
style={{ color: “var(–red, #FF385C)”, opacity: 0.5 }}>
<path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
<polyline points="16 16 12 12 8 16" />
<line x1="12" y1="12" x2="12" y2="21" />
</svg>
);

// ── Main Component ────────────────────────────────────────
export default function CloudinaryUpload({
onUploadSuccess,
label    = “Upload Photo”,
disabled = false,
}) {
const inputRef              = useRef(null);
const [status, setStatus]   = useState(“idle”); // idle | uploading | done | error
const [preview, setPreview] = useState(null);
const [fileName, setFileName] = useState(””);

const handleFileSelect = async (e) => {
const file = e.target.files?.[0];
if (!file) return;

```
setFileName(file.name);
setPreview(URL.createObjectURL(file));
setStatus("uploading");

try {
  // ── CLOUDINARY CONNECTION POINT ──────────────────────
  // When ready, replace this block with your real upload:
  //
  //   const formData = new FormData();
  //   formData.append("file",           file);
  //   formData.append("upload_preset",  "YOUR_UNSIGNED_PRESET");
  //   formData.append("cloud_name",     "YOUR_CLOUD_NAME");
  //
  //   const res  = await fetch(
  //     "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload",
  //     { method: "POST", body: formData }
  //   );
  //   const data = await res.json();
  //   onUploadSuccess?.({ url: data.secure_url, publicId: data.public_id });
  //
  // ─────────────────────────────────────────────────────
  // PLACEHOLDER: simulate a 1.5s upload delay
  await new Promise((r) => setTimeout(r, 1500));
  onUploadSuccess?.({ url: preview, publicId: `placeholder_${Date.now()}` });
  setStatus("done");
} catch (err) {
  console.error("CloudinaryUpload error:", err);
  setStatus("error");
}

// Reset input so the same file can be re-selected
e.target.value = "";
```

};

return (
<div style={styles.wrapper}>

```
  {/* Header badge */}
  <div style={styles.badge}>
    <span style={styles.badgeDot} />
    Upload Tool — Coming Soon
  </div>

  {/* Upload zone */}
  <button
    style={{
      ...styles.dropZone,
      borderColor: status === "uploading"
        ? "#FF385C"
        : "rgba(255,56,92,0.3)",
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
    }}
    onClick={() => !disabled && inputRef.current?.click()}
    disabled={disabled || status === "uploading"}
    aria-label="Upload a photo to Cloudinary"
  >
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={handleFileSelect}
      aria-hidden="true"
    />

    {/* Preview thumbnail */}
    {preview ? (
      <div style={styles.previewWrapper}>
        <img src={preview} alt="Upload preview" style={styles.previewImg} />
        {status === "uploading" && (
          <div style={styles.previewOverlay}>
            <div style={styles.spinner} />
          </div>
        )}
      </div>
    ) : (
      <div style={styles.emptyZone}>
        <CloudIcon />
        <p style={styles.dropLabel}>Tap to select a photo</p>
        <p style={styles.dropSub}>JPG, PNG or WEBP · Max 10MB</p>
      </div>
    )}
  </button>

  {/* Status messages */}
  {status === "idle" && (
    <p style={styles.statusText}>
      Cloudinary integration ready to connect.
    </p>
  )}
  {status === "uploading" && (
    <p style={{ ...styles.statusText, color: "#FF385C" }}>
      ⏳ Uploading <em>{fileName}</em>…
    </p>
  )}
  {status === "done" && (
    <p style={{ ...styles.statusText, color: "#22C55E" }}>
      ✅ Upload successful!
    </p>
  )}
  {status === "error" && (
    <p style={{ ...styles.statusText, color: "#EF4444" }}>
      ❌ Upload failed. Please try again.
    </p>
  )}

  {/* Upload button */}
  <button
    style={{
      ...styles.uploadBtn,
      opacity: disabled || status === "uploading" ? 0.6 : 1,
      cursor: disabled || status === "uploading" ? "not-allowed" : "pointer",
    }}
    onClick={() => !disabled && status !== "uploading" && inputRef.current?.click()}
    disabled={disabled || status === "uploading"}
  >
    <UploadIcon />
    <span>{status === "uploading" ? "Uploading…" : label}</span>
  </button>

</div>
```

);
}

// ── Styles ────────────────────────────────────────────────
const styles = {
wrapper: {
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
gap: 14,
padding: “28px 20px”,
backgroundColor: “var(–white, #fff)”,
borderRadius: “var(–radius-lg, 20px)”,
boxShadow: “0 4px 16px rgba(0,0,0,0.07)”,
maxWidth: 360,
margin: “0 auto”,
width: “100%”,
},
badge: {
display: “inline-flex”,
alignItems: “center”,
gap: 6,
padding: “4px 12px”,
backgroundColor: “rgba(255,56,92,0.08)”,
border: “1px solid rgba(255,56,92,0.2)”,
borderRadius: 999,
fontSize: 11,
fontWeight: 600,
color: “#FF385C”,
letterSpacing: “0.4px”,
fontFamily: “var(–font-body, ‘DM Sans’, sans-serif)”,
},
badgeDot: {
width: 6,
height: 6,
borderRadius: “50%”,
backgroundColor: “#FF385C”,
},
dropZone: {
width: “100%”,
minHeight: 160,
border: “2px dashed”,
borderRadius: “var(–radius-md, 14px)”,
backgroundColor: “var(–surface, #F2F2F7)”,
display: “flex”,
alignItems: “center”,
justifyContent: “center”,
transition: “all 0.2s ease”,
padding: 0,
overflow: “hidden”,
WebkitTapHighlightColor: “transparent”,
},
emptyZone: {
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
gap: 8,
padding: “24px 16px”,
},
dropLabel: {
fontFamily: “var(–font-body, ‘DM Sans’, sans-serif)”,
fontSize: 14,
fontWeight: 500,
color: “var(–text-secondary, #5A5A6E)”,
margin: 0,
},
dropSub: {
fontFamily: “var(–font-body, ‘DM Sans’, sans-serif)”,
fontSize: 11,
color: “var(–text-muted, #9999AA)”,
margin: 0,
},
previewWrapper: {
position: “relative”,
width: “100%”,
aspectRatio: “16/9”,
},
previewImg: {
width: “100%”,
height: “100%”,
objectFit: “cover”,
display: “block”,
},
previewOverlay: {
position: “absolute”,
inset: 0,
backgroundColor: “rgba(0,0,0,0.45)”,
display: “flex”,
alignItems: “center”,
justifyContent: “center”,
},
spinner: {
width: 32,
height: 32,
borderRadius: “50%”,
border: “3px solid rgba(255,255,255,0.3)”,
borderTopColor: “#FFFFFF”,
animation: “gcSpin 0.7s linear infinite”,
},
statusText: {
fontFamily: “var(–font-body, ‘DM Sans’, sans-serif)”,
fontSize: 12,
color: “var(–text-muted, #9999AA)”,
textAlign: “center”,
margin: 0,
},
uploadBtn: {
display: “inline-flex”,
alignItems: “center”,
justifyContent: “center”,
gap: 8,
width: “100%”,
height: 46,
backgroundColor: “#FF385C”,
color: “#FFFFFF”,
border: “none”,
borderRadius: 999,
fontFamily: “var(–font-body, ‘DM Sans’, sans-serif)”,
fontSize: 14,
fontWeight: 600,
boxShadow: “0 4px 14px rgba(255,56,92,0.35)”,
transition: “all 0.2s ease”,
letterSpacing: “0.2px”,
},
};
