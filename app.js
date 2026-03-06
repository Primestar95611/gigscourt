/**

- App.js
- ──────
- Application controller — orchestrates all modules:
- • Auth state management (FirebaseConfig)
- • Tab navigation
- • Home: category chips, nearby list, provider notifications
- • Search: text + radius filter, map markers, result cards
- • Profile: delegates to ProfilePage
- • Provider modal with mini-map
- • Real-time request/response system
- 
- This file imports from all other modules but contains
- NO Firebase SDK calls directly — those stay in FirebaseConfig.js.
  */

// ─── LEAFLET (global, loaded via CDN in index.html) ──────────────
// We reference window.L inside MapComponent.js; here we just import our wrappers.

import {
registerUser,
loginUser,
logoutUser,
onAuthChange,
loadUserProfile,
fetchAllProviders,
createServiceRequest,
listenForMatchingRequests,
respondToRequest,
listenForResponses,
normaliseService,
} from “./FirebaseConfig.js”;

import {
initSearchMap,
setClientPosition,
renderProviderMarkers,
locateUser,
filterAndSortByDistance,
showMiniMap,
geocodeAddress,
haversineKm,
} from “./MapComponent.js”;

import { renderProfilePage } from “./ProfilePage.js”;

// ─── STATE ───────────────────────────────────────────────────────

const state = {
user:             null,       // Firebase Auth User
profile:          null,       // Firestore user document
providers:        [],         // All providers fetched from Firestore
searchResults:    [],         // Filtered providers
currentTab:       “home”,
radiusKm:         10,
searchQuery:      “”,
activeRequestId:  null,       // Live serviceRequest doc ID
unsubRequests:    null,       // Unsubscribe for provider notifications
unsubResponses:   null,       // Unsubscribe for client responses
mapInitialised:   false,
};

// ─── INIT ────────────────────────────────────────────────────────

export function initApp() {
// Leaflet must be loaded before we use MapComponent
ensureLeafletLoaded().then(() => {
setupAuthListeners();
setupNavListeners();
setupSearchListeners();
});
}

function ensureLeafletLoaded() {
return new Promise((resolve) => {
if (window.L) { resolve(); return; }
const script = document.createElement(“script”);
script.src = “https://unpkg.com/leaflet@1.9.4/dist/leaflet.js”;
script.onload = resolve;
document.head.appendChild(script);
});
}

// ─── AUTH ────────────────────────────────────────────────────────

function setupAuthListeners() {
// Tab toggle
document.querySelectorAll(”.auth-tab”).forEach((btn) => {
btn.addEventListener(“click”, () => {
document.querySelectorAll(”.auth-tab, .auth-form”).forEach((el) => el.classList.remove(“active”));
btn.classList.add(“active”);
document.getElementById(`${btn.dataset.tab}Form`).classList.add(“active”);
});
});

// Sign up
document.getElementById(“signupBtn”).addEventListener(“click”, async () => {
const name     = document.getElementById(“signupName”).value.trim();
const email    = document.getElementById(“signupEmail”).value.trim();
const password = document.getElementById(“signupPassword”).value;
const errEl    = document.getElementById(“signupError”);
errEl.textContent = “”;

```
if (!name || !email || !password) { errEl.textContent = "All fields are required."; return; }

try {
  showLoading(true);
  await registerUser(name, email, password);
} catch (e) {
  errEl.textContent = friendlyAuthError(e.code);
} finally {
  showLoading(false);
}
```

});

// Sign in
document.getElementById(“loginBtn”).addEventListener(“click”, async () => {
const email    = document.getElementById(“loginEmail”).value.trim();
const password = document.getElementById(“loginPassword”).value;
const errEl    = document.getElementById(“loginError”);
errEl.textContent = “”;

```
try {
  showLoading(true);
  await loginUser(email, password);
} catch (e) {
  errEl.textContent = friendlyAuthError(e.code);
} finally {
  showLoading(false);
}
```

});

// Logout
document.getElementById(“logoutBtn”).addEventListener(“click”, async () => {
await cleanupListeners();
await logoutUser();
});

// Auth state observer
onAuthChange(async (user) => {
if (user) {
state.user    = user;
showLoading(true);
state.profile = await loadUserProfile(user.uid);
showLoading(false);
showApp();
await onAppReady();
} else {
state.user    = null;
state.profile = null;
showAuth();
}
});
}

// ─── APP READY ───────────────────────────────────────────────────

async function onAppReady() {
// Load all providers
state.providers = await fetchAllProviders();

// Render category chips
buildCategoryChips();

// Attempt geolocation silently
try {
const { lat, lng } = await locateUser();
state.clientLat = lat;
state.clientLng = lng;
} catch (_) {
// No geolocation — that’s OK
}

// Render home list
renderHomeNearby();

// Setup provider real-time listener if user has a service
setupProviderListener();

// Render profile tab
renderProfileTab();
}

// ─── NAVIGATION ──────────────────────────────────────────────────

function setupNavListeners() {
document.querySelectorAll(”.nav-btn”).forEach((btn) => {
btn.addEventListener(“click”, () => {
const tab = btn.dataset.tab;
switchTab(tab);
});
});
}

function switchTab(tabName) {
state.currentTab = tabName;

document.querySelectorAll(”.nav-btn”).forEach((b) => {
b.classList.toggle(“active”, b.dataset.tab === tabName);
});

document.querySelectorAll(”.tab-content”).forEach((el) => {
el.classList.toggle(“active”, el.id === `${tabName}Tab`);
});

if (tabName === “search”) {
initMapIfNeeded();
}

if (tabName === “profile”) {
renderProfileTab();
}

if (tabName === “home”) {
renderHomeNearby();
}
}

// ─── CATEGORY CHIPS ──────────────────────────────────────────────

function buildCategoryChips() {
const categories = [
“All”, “Hair & Beauty”, “Home Repair”, “Education”, “Health”,
“Cleaning”, “Plumbing”, “Electrical”, “Tech”, “Fitness”, “Other”,
];

const wrap = document.getElementById(“categoryChips”);
if (!wrap) return;
wrap.innerHTML = “”;

categories.forEach((cat, i) => {
const chip = document.createElement(“button”);
chip.className = `chip${i === 0 ? " active" : ""}`;
chip.textContent = cat;
chip.addEventListener(“click”, () => {
document.querySelectorAll(”.chip”).forEach((c) => c.classList.remove(“active”));
chip.classList.add(“active”);

```
  if (cat === "All") {
    renderHomeNearby();
  } else {
    const filtered = state.providers.filter((p) => {
      const terms = normaliseService(p.serviceCategory).concat(normaliseService(p.serviceName));
      const query = normaliseService(cat);
      return terms.some((t) => query.some((q) => t.includes(q) || q.includes(t)));
    });
    renderCardList("nearbyList", filtered, state.radiusKm);
  }
});
wrap.appendChild(chip);
```

});
}

// ─── HOME TAB ────────────────────────────────────────────────────

function renderHomeNearby() {
renderCardList(“nearbyList”, state.providers, state.radiusKm);
}

// ─── SEARCH TAB ──────────────────────────────────────────────────

function setupSearchListeners() {
const input  = document.getElementById(“searchInput”);
const slider = document.getElementById(“radiusSlider”);

let debounceTimer;
input?.addEventListener(“input”, () => {
clearTimeout(debounceTimer);
debounceTimer = setTimeout(() => runSearch(), 350);
});

slider?.addEventListener(“input”, () => {
state.radiusKm = parseInt(slider.value, 10);
document.getElementById(“radiusValue”).textContent = `${state.radiusKm} km`;
runSearch();
if (state.mapInitialised) {
renderProviderMarkers(state.providers, state.radiusKm);
}
});

document.getElementById(“locateMeBtn”)?.addEventListener(“click”, async () => {
try {
showLoading(true);
const { lat, lng } = await locateUser();
state.clientLat = lat;
state.clientLng = lng;
runSearch();
} catch (e) {
alert(“Could not get your location: “ + e.message);
} finally {
showLoading(false);
}
});
}

async function runSearch() {
const q = (document.getElementById(“searchInput”)?.value || “”).trim();
state.searchQuery = q;

let results = […state.providers];

// Fuzzy service matching
if (q) {
const queryTokens = normaliseService(q);
results = results.filter((p) => {
const providerTokens = normaliseService(p.serviceName)
.concat(normaliseService(p.serviceCategory));
return queryTokens.some((qt) =>
providerTokens.some((pt) => pt.includes(qt) || qt.includes(pt)),
);
});
}

// Distance filter + sort
if (state.clientLat !== undefined) {
results = filterAndSortByDistance(results, state.radiusKm);
}

state.searchResults = results;

renderCardList(“searchResults”, results, state.radiusKm);
renderProviderMarkers(results, state.radiusKm);

// Broadcast a serviceRequest so providers can see it
if (q && state.user) {
broadcastServiceRequest(q);
}
}

async function broadcastServiceRequest(serviceName) {
try {
// Cancel previous response listener
if (state.unsubResponses) { state.unsubResponses(); state.unsubResponses = null; }

```
const reqId = await createServiceRequest({
  serviceName,
  clientId:   state.user.uid,
  clientLat:  state.clientLat || null,
  clientLng:  state.clientLng || null,
  radiusKm:   state.radiusKm,
});

state.activeRequestId = reqId;

// Listen for providers who respond
state.unsubResponses = listenForResponses(reqId, (response) => {
  showProviderResponse(response);
});
```

} catch (e) {
console.warn(“serviceRequest error:”, e.message);
}
}

function showProviderResponse(response) {
const container = document.getElementById(“searchResults”);
if (!container) return;

const banner = document.createElement(“div”);
banner.className = “notif-card”;
banner.style.margin = “0 0 10px”;
banner.innerHTML = `<div class="notif-text"> <div class="notif-title">✅ ${esc(response.providerName)} is available!</div> <div class="notif-sub">${esc(response.serviceName)} · responded just now</div> </div>`;
container.prepend(banner);
}

// ─── MAP ─────────────────────────────────────────────────────────

function initMapIfNeeded() {
if (state.mapInitialised) {
// Trigger resize in case tab was hidden
setTimeout(() => {
if (window._searchMapRef) window._searchMapRef.invalidateSize();
}, 50);
return;
}
state.mapInitialised = true;

const map = initSearchMap(“map”, (provider) => {
openProviderModal(provider);
});
window._searchMapRef = map;

if (state.clientLat) setClientPosition(state.clientLat, state.clientLng);
renderProviderMarkers(state.providers, state.radiusKm);
}

// ─── PROFILE TAB ─────────────────────────────────────────────────

function renderProfileTab() {
const container = document.getElementById(“profileView”);
if (!container || !state.user) return;
renderProfilePage(state.user.uid, container);
}

// ─── PROVIDER NOTIFICATIONS (real-time for providers) ────────────

function setupProviderListener() {
if (!state.profile || !state.profile.serviceName) return;

const notifContainer = document.getElementById(“providerNotifications”);
const notifLabel     = document.getElementById(“notifLabel”);

if (notifLabel) notifLabel.style.display = “block”;

state.unsubRequests = listenForMatchingRequests(state.profile, (request) => {
if (!notifContainer) return;

```
const card = document.createElement("div");
card.className = "notif-card";
card.innerHTML = `
  <div class="notif-text">
    <div class="notif-title">🔔 Someone nearby needs your service!</div>
    <div class="notif-sub">Looking for: <strong>${esc(request.serviceName)}</strong></div>
  </div>
  <button class="btn-green" data-reqid="${esc(request.id)}">I'm Available</button>
`;

card.querySelector("button").addEventListener("click", async (e) => {
  e.target.textContent = "Sent!";
  e.target.disabled = true;
  try {
    await respondToRequest(request.id, state.profile);
  } catch (err) {
    console.error("Response error:", err);
  }
});

notifContainer.prepend(card);

// Limit to 3 visible notifications
while (notifContainer.children.length > 3) {
  notifContainer.lastChild.remove();
}
```

});
}

// ─── PROVIDER MODAL ──────────────────────────────────────────────

function openProviderModal(provider) {
const modal   = document.getElementById(“profileModal”);
const content = document.getElementById(“modalContent”);

const dist = (state.clientLat !== undefined && provider.lat && provider.lng)
? haversineKm(state.clientLat, state.clientLng, provider.lat, provider.lng).toFixed(1) + “ km away”
: “”;

const workPhotos = (provider.workPhotos || []).slice(0, 9).map(
(url) => `<img class="modal-work-photo" src="${esc(url)}" loading="lazy" alt="work"/>`,
).join(””);

const hasMap = provider.lat && provider.lng;

content.innerHTML = `<div class="modal-profile-header"> <img class="modal-avatar" src="${esc(provider.photoURL || 'https://via.placeholder.com/72?text=👤')}" alt="${esc(provider.name)}"/> <div> <div class="modal-name">${esc(provider.name || "Provider")}</div> <div class="modal-service">${esc(provider.serviceName || provider.serviceCategory || "")}</div> ${dist ?`<div class="modal-dist">📍 ${dist}</div>` : “”}
</div>
</div>

```
${provider.bio ? `<p class="modal-bio">${esc(provider.bio)}</p>` : ""}

${provider.address ? `
  <div class="modal-address" id="modalAddrLink">
    📍 ${esc(provider.address)}
  </div>
  ${hasMap ? `<div class="inline-map-mini" id="modalMiniMap" style="display:none"></div>` : ""}
` : ""}

${workPhotos ? `
  <div style="font-size:0.75rem;color:var(--text3);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Work Photos</div>
  <div class="modal-work-grid">${workPhotos}</div>
` : ""}
```

`;

// Address → mini map toggle
const addrLink = content.querySelector(”#modalAddrLink”);
const miniMapEl = content.querySelector(”#modalMiniMap”);
if (addrLink && miniMapEl && provider.lat && provider.lng) {
let opened = false;
addrLink.addEventListener(“click”, () => {
const isOpen = miniMapEl.style.display === “block”;
miniMapEl.style.display = isOpen ? “none” : “block”;
if (!isOpen && !opened) {
opened = true;
// Small delay to ensure element is visible
setTimeout(() => {
showMiniMap(“modalMiniMap”, provider.lat, provider.lng, provider.name);
}, 80);
}
});
}

modal.classList.add(“open”);
}

document.getElementById(“closeModal”)?.addEventListener(“click”, () => {
document.getElementById(“profileModal”).classList.remove(“open”);
});

document.getElementById(“profileModal”)?.addEventListener(“click”, (e) => {
if (e.target === document.getElementById(“profileModal”)) {
document.getElementById(“profileModal”).classList.remove(“open”);
}
});

// ─── CARD LIST RENDERER ──────────────────────────────────────────

function renderCardList(containerId, providers, radiusKm) {
const container = document.getElementById(containerId);
if (!container) return;

// Apply distance filter/sort
let list = providers;
if (state.clientLat !== undefined && state.clientLat !== null) {
list = filterAndSortByDistance(providers, radiusKm);
}

if (!list.length) {
container.innerHTML = ` <div class="empty-state"> <div class="empty-icon">🔍</div> <p>No providers found in this area yet.<br/>Try expanding the radius or a different search term.</p> </div>`;
return;
}

container.innerHTML = list
.map((p) => buildProviderCardHTML(p))
.join(””);

// Attach click events
container.querySelectorAll(”.provider-card”).forEach((card, i) => {
card.addEventListener(“click”, () => openProviderModal(list[i]));
});
}

function buildProviderCardHTML(p) {
const dist = (state.clientLat !== undefined && p.lat && p.lng && p.distanceKm !== undefined)
? `<span class="card-dist">${p.distanceKm.toFixed(1)} km</span>`
: “”;

const avatar = p.photoURL
? `<img class="card-avatar" src="${esc(p.photoURL)}" alt="${esc(p.name)}" loading="lazy"/>`
: `<div class="card-avatar-placeholder">👤</div>`;

const photos = (p.workPhotos || []).slice(0, 4).map(
(url) => `<img class="work-thumb" src="${esc(url)}" loading="lazy" alt="work"/>`,
).join(””);

return `<div class="provider-card"> <div class="card-inner"> ${avatar} <div class="card-info"> <div class="card-name">${esc(p.name || "Provider")}</div> <div class="card-service">${esc(p.serviceName || p.serviceCategory || "Service provider")}</div> ${p.bio ?`<div class="card-bio">${esc(p.bio)}</div>`: ""} <div class="card-meta">${dist}</div> </div> </div> ${photos ?`<div class="card-work-photos">${photos}</div>` : ""} </div>`;
}

// ─── HELPERS ─────────────────────────────────────────────────────

function showAuth() {
document.getElementById(“authScreen”).classList.add(“active”);
document.getElementById(“appScreen”).classList.remove(“active”);
}

function showApp() {
document.getElementById(“authScreen”).classList.remove(“active”);
document.getElementById(“appScreen”).classList.add(“active”);
}

function showLoading(on) {
document.getElementById(“loadingOverlay”).classList.toggle(“active”, on);
}

async function cleanupListeners() {
if (state.unsubRequests)  { state.unsubRequests();  state.unsubRequests  = null; }
if (state.unsubResponses) { state.unsubResponses(); state.unsubResponses = null; }
}

function esc(str) {
return String(str ?? “”)
.replace(/&/g, “&”)
.replace(/</g, “<”)
.replace(/>/g, “>”)
.replace(/”/g, “"”);
}

function friendlyAuthError(code) {
const map = {
“auth/user-not-found”:        “No account found with that email.”,
“auth/wrong-password”:        “Incorrect password.”,
“auth/email-already-in-use”:  “That email is already registered.”,
“auth/weak-password”:         “Password must be at least 6 characters.”,
“auth/invalid-email”:         “Please enter a valid email address.”,
“auth/too-many-requests”:     “Too many attempts. Please try again later.”,
“auth/invalid-credential”:    “Invalid email or password.”,
};
return map[code] || “Something went wrong. Please try again.”;
}
