// Firebase Configuration
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
const auth = firebase.auth();
const db = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Constants
const ADMIN_EMAIL = 'agboghidiaugust@gmail.com';
const RESEND_KEY = 're_AXzzsHd5_NAvZHMZ';
const CLOUDINARY_CLOUD = 'dszdwnuua';
const CLOUDINARY_PRESET = 'Gigscourt';
const MAX_GRID_IMAGES = 9;
