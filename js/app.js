// js/app.js
import { initializeAuth } from './auth/auth.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7dRYpXukVlyV6ipmCfbCXEJ4kp8t1Gmg",
  authDomain: "gigscourt.firebaseapp.com",
  projectId: "gigscourt",
  storageBucket: "gigscourt.firebasestorage.app",
  messagingSenderId: "1055157379736",
  appId: "1:1055157379736:web:215763c63606c2c5a966ed",
  measurementId: "G-BY1YBSYJHV"
};

export default firebaseConfig;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Auth
initializeAuth();

// Listen for auth state changes
firebase.auth().onAuthStateChanged((user) => {
    const app = document.getElementById('app');
    
    if (user) {
        // User is signed in
        if (user.emailVerified) {
            // Email verified - load main app
            loadMainApp();
        } else {
            // Email not verified - show verification screen
            loadVerification();
        }
    } else {
        // No user - show login/signup
        loadAuthScreen();
    }
});

function loadMainApp() {
    document.getElementById('app').innerHTML = `
        <div class="app-container">
            <div class="tabs-container">
                <!-- We'll add tabs later -->
                <div style="padding: 20px; text-align: center;">
                    <h2>Welcome to GigsCourt!</h2>
                    <p>You're logged in as ${firebase.auth().currentUser.email}</p>
                    <button class="btn" onclick="logout()">Logout</button>
                    <button class="btn" onclick="deleteAccount()">Delete Account</button>
                </div>
            </div>
        </div>
    `;
}

function loadAuthScreen() {
    document.getElementById('app').innerHTML = `
        <div class="auth-container">
            <div class="auth-header">
                <h1>GigsCourt</h1>
                <p>Find local services, instantly</p>
            </div>
            
            <div class="auth-tabs">
                <button class="auth-tab active" onclick="showLogin()">Login</button>
                <button class="auth-tab" onclick="showSignup()">Sign Up</button>
            </div>
            
            <div id="auth-content"></div>
        </div>
    `;
    
    // Show login by default
    showLogin();
}

function loadVerification() {
    document.getElementById('app').innerHTML = `
        <div class="verification-container">
            <div class="verification-icon">✉️</div>
            <h2>Verify your email</h2>
            <p>We sent a verification link to:</p>
            <p class="email">${firebase.auth().currentUser.email}</p>
            <p class="small">Click the link in the email to verify your account</p>
            
            <button class="btn" onclick="checkVerification()">I've verified</button>
            <button class="btn btn-outline" onclick="resendVerification()">Resend email</button>
            <button class="btn btn-outline" onclick="logout()">Back to login</button>
        </div>
    `;
}

// Make functions globally available
window.logout = function() {
    firebase.auth().signOut();
};

window.deleteAccount = function() {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
        const user = firebase.auth().currentUser;
        user.delete().catch(error => {
            alert('Error: ' + error.message);
        });
    }
};

window.checkVerification = function() {
    firebase.auth().currentUser.reload().then(() => {
        if (firebase.auth().currentUser.emailVerified) {
            loadMainApp();
        } else {
            alert('Email not verified yet. Please check your inbox.');
        }
    });
};

window.resendVerification = function() {
    firebase.auth().currentUser.sendEmailVerification()
        .then(() => {
            alert('Verification email sent!');
        })
        .catch(error => {
            alert('Error: ' + error.message);
        });
};
