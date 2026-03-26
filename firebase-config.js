// firebase-config.js - Firebase initialization

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyD7dRYpXukVlyV6ipmCfbCXEJ4kp8t1Gmg",
    authDomain: "gigscourt.firebaseapp.com",
    projectId: "gigscourt",
    storageBucket: "gigscourt.firebasestorage.app",
    messagingSenderId: "1055157379736",
    appId: "1:1055157379736:web:215763c63606c2c5a966ed",
    measurementId: "G-BY1YBSYJHV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore settings
//firebase.firestore().settings({
   // experimentalForceLongPolling: true,
    //useFetchStreams: false
//});

// Enable offline persistence
firebase.firestore().enablePersistence({
    synchronizeTabs: true
}).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log('Persistence failed: multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.log('Persistence not supported in this browser');
    }
});

// Auth persistence
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Initialize ImageKit
var imagekit = new ImageKit({
    publicKey: "public_t2gpKmHQ/9binh9kNSsQBq0zsys=",
    urlEndpoint: "https://ik.imagekit.io/GigsCourt"
});

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Initialize GeoFirestore
const firestore = firebase.firestore();
const GeoFirestore = window.GeoFirestore;
const geofirestore = new GeoFirestore(firestore);
