/**

- FirebaseConfig.js
- ─────────────────
- Firebase initialization, Authentication helpers, and
- Firestore instance export.
- 
- SETUP: Replace the firebaseConfig object below with
- ```
     your own project credentials from the Firebase console.
  ```

*/

import { initializeApp } from “https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js”;
import {
getAuth,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
signOut,
onAuthStateChanged,
updateProfile,
} from “https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js”;
import {
getFirestore,
doc,
setDoc,
getDoc,
updateDoc,
collection,
addDoc,
query,
where,
getDocs,
onSnapshot,
serverTimestamp,
orderBy,
limit,
} from “https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js”;

// ─── YOUR FIREBASE CONFIG ────────────────────────────────────────
// Replace this object with your own Firebase project credentials.
// Go to: Firebase Console → Project Settings → Your Apps → Web App
const firebaseConfig = {
apiKey:            “AIzaSyD7dRYpXukVlyV6ipmCfbCXEJ4kp8t1Gmg”,
authDomain:        “gigscourt.firebaseapp.com”,
projectId:         “gigscourt”,
storageBucket:     “gigscourt.firebasestorage.app”,
messagingSenderId: “1055157379736”,
appId:             “1:1055157379736:web:215763c63606c2c5a966ed”,
measurementId:     “G-BY1YBSYJHV”,
};
// ─────────────────────────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── AUTH HELPERS ────────────────────────────────────────────────

/**

- Create a new account and write an initial user doc to Firestore.
- @param {string} name
- @param {string} email
- @param {string} password
- @returns {Promise<import(“firebase/auth”).UserCredential>}
  */
  async function registerUser(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });

// Write initial Firestore user document
await setDoc(doc(db, “users”, cred.user.uid), {
uid:          cred.user.uid,
name,
email,
bio:          “”,
photoURL:     “”,
workPhotos:   [],
serviceCategory: “”,
serviceName:  “”,
address:      “”,
lat:          null,
lng:          null,
createdAt:    serverTimestamp(),
});

return cred;
}

/**

- Sign in with email/password.
  */
  async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
  }

/**

- Sign out the current user.
  */
  async function logoutUser() {
  return signOut(auth);
  }

/**

- Subscribe to auth state changes.
- @param {function} callback  receives Firebase User or null
- @returns unsubscribe function
  */
  function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
  }

// ─── FIRESTORE HELPERS ───────────────────────────────────────────

/**

- Load a user’s profile document from Firestore.
- @param {string} uid
- @returns {Promise<Object|null>}
  */
  async function loadUserProfile(uid) {
  const snap = await getDoc(doc(db, “users”, uid));
  return snap.exists() ? snap.data() : null;
  }

/**

- Save (merge) profile data to Firestore.
- @param {string} uid
- @param {Object} data
  */
  async function saveUserProfile(uid, data) {
  await setDoc(doc(db, “users”, uid), data, { merge: true });
  }

/**

- Fetch all users who have a service configured.
- @returns {Promise<Array>}
  */
  async function fetchAllProviders() {
  const q = query(
  collection(db, “users”),
  where(“serviceName”, “!=”, “”),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
  }

/**

- Create a serviceRequest document (client broadcasting a search).
- @param {Object} requestData
- @returns {Promise<string>} new document ID
  */
  async function createServiceRequest(requestData) {
  const ref = await addDoc(collection(db, “serviceRequests”), {
  …requestData,
  timestamp: serverTimestamp(),
  });
  return ref.id;
  }

/**

- Listen for new serviceRequests that might match a provider’s service
- and be within their area.  Returns an unsubscribe function.
- @param {Object} providerProfile  – must have lat, lng, serviceName, serviceCategory
- @param {function} onNewRequest   – called with each matching request doc
- @returns {function} unsubscribe
  */
  function listenForMatchingRequests(providerProfile, onNewRequest) {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000); // last 5 minutes
  const q = query(
  collection(db, “serviceRequests”),
  orderBy(“timestamp”, “desc”),
  limit(20),
  );

return onSnapshot(q, (snapshot) => {
snapshot.docChanges().forEach((change) => {
if (change.type !== “added”) return;
const req = change.doc.data();

```
  // Skip stale requests
  if (req.timestamp && req.timestamp.toDate() < cutoff) return;

  // Check service match (fuzzy – normalise and compare)
  const providerTerms = normaliseService(providerProfile.serviceName)
    .concat(normaliseService(providerProfile.serviceCategory));
  const requestTerms  = normaliseService(req.serviceName);

  const matches = providerTerms.some((pt) =>
    requestTerms.some((rt) => pt.includes(rt) || rt.includes(pt)),
  );

  if (!matches) return;

  // Check radius
  if (req.clientLat && req.clientLng && providerProfile.lat && providerProfile.lng) {
    const dist = haversineKm(
      providerProfile.lat, providerProfile.lng,
      req.clientLat, req.clientLng,
    );
    if (dist > (req.radiusKm || 20)) return;
  }

  onNewRequest({ id: change.doc.id, ...req });
});
```

});
}

/**

- A provider responds to a serviceRequest.
- @param {string} requestId
- @param {Object} providerData
  */
  async function respondToRequest(requestId, providerData) {
  await addDoc(collection(db, “responses”), {
  requestId,
  providerId:   providerData.uid,
  providerName: providerData.name,
  providerPhoto: providerData.photoURL || “”,
  serviceName:  providerData.serviceName,
  lat:          providerData.lat,
  lng:          providerData.lng,
  timestamp:    serverTimestamp(),
  });
  }

/**

- Listen for provider responses to a client’s request.
- @param {string} requestId
- @param {function} onResponse
- @returns {function} unsubscribe
  */
  function listenForResponses(requestId, onResponse) {
  const q = query(
  collection(db, “responses”),
  where(“requestId”, “==”, requestId),
  );
  return onSnapshot(q, (snap) => {
  snap.docChanges().forEach((change) => {
  if (change.type === “added”) onResponse({ id: change.doc.id, …change.doc.data() });
  });
  });
  }

// ─── UTILITY ─────────────────────────────────────────────────────

/**

- Haversine distance in km between two lat/lng points.
  */
  function haversineKm(lat1, lng1, lat2, lng2) {
  const R  = 6371;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dG = ((lng2 - lng1) * Math.PI) / 180;
  const a  =
  Math.sin(dL / 2) ** 2 +
  Math.cos((lat1 * Math.PI) / 180) *
  Math.cos((lat2 * Math.PI) / 180) *
  Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

/**

- Normalise a service name into an array of search tokens.
- Splits camelCase, lowercases, removes stop words.
  */
  function normaliseService(str = “”) {
  return str
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, “ “)
  .split(/\s+/)
  .filter((w) => w.length > 1);
  }

export {
auth,
db,
registerUser,
loginUser,
logoutUser,
onAuthChange,
loadUserProfile,
saveUserProfile,
fetchAllProviders,
createServiceRequest,
listenForMatchingRequests,
respondToRequest,
listenForResponses,
haversineKm,
normaliseService,
};
