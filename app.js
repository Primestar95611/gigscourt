// app.js - Complete with Home Tab

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
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Global state
let currentUser = null;
let providers = [];
let lastDoc = null;
let loading = false;
let hasMore = true;
let pullToRefresh = {
    startY: 0,
    currentY: 0,
    refreshing: false,
    pulling: false
};

// Listen for auth state
firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;
    const app = document.getElementById('app');
    
    if (user) {
        if (user.emailVerified) {
            try {
                // Get user data from Firestore
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    // User document exists - normal flow
                    currentUserData = userDoc.data();
                    loadMainApp();
                } else {
                    // User document doesn't exist - redirect to profile completion
                    console.log('User document missing, redirecting to profile setup');
                    window.location.hash = 'complete-profile';
                    loadProfileCompletion();
                }
            } catch (error) {
                console.error('Error fetching user document:', error);
                // Show error message to user
                alert('Error loading your profile. Please try again.');
                // Optionally sign out
                firebase.auth().signOut();
            }
        } else {
            loadVerification();
        }
    } else {
        loadAuthScreen();
    }
});

function loadProfileCompletion() {
    document.getElementById('app').innerHTML = `
        <div class="profile-completion-container">
            <div class="completion-header">
                <h1>Complete Your Profile</h1>
                <p>We noticed your profile needs setup</p>
            </div>
            
            <div class="completion-form">
                <div class="form-group">
                    <label>Business Name</label>
                    <input type="text" id="complete-business" value="${firebase.auth().currentUser?.displayName || ''}" placeholder="Your business name">
                </div>
                
                <div class="form-group">
                    <label>Services Offered</label>
                    <div class="service-presets">
                        <button type="button" class="service-pill" onclick="toggleService('Barber')">Barber</button>
                        <button type="button" class="service-pill" onclick="toggleService('Tech')">Tech</button>
                        <button type="button" class="service-pill" onclick="toggleService('Design')">Design</button>
                        <button type="button" class="service-pill" onclick="toggleService('Marketing')">Marketing</button>
                    </div>
                    
                    <div id="selected-services" class="selected-services"></div>
                </div>
                
                <div class="form-group">
                    <label>Bio (optional)</label>
                    <textarea id="complete-bio" rows="3" placeholder="Tell customers about yourself"></textarea>
                </div>
                
                <button class="btn btn-full" onclick="saveProfile()">Save Profile</button>
                <button class="btn btn-outline btn-full" onclick="firebase.auth().signOut()">Sign Out</button>
            </div>
        </div>
    `;
}

// Add save profile function
window.saveProfile = async function() {
    const businessName = document.getElementById('complete-business').value;
    const bio = document.getElementById('complete-bio').value;
    
    if (!businessName) {
        alert('Business name is required');
        return;
    }
    
    try {
        await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).set({
            businessName: businessName,
            email: firebase.auth().currentUser.email,
            services: window.selectedServices || [],
            pendingServices: [],
            bio: bio,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: true,
            phoneVerified: false,
            signupMethod: 'email',
            rating: 0,
            reviewCount: 0,
            jobsDone: 0,
            profileImage: '',
            portfolioImages: [],
            location: null
        });
        
        // Reload the app
        loadMainApp();
    } catch (error) {
        alert('Error saving profile: ' + error.message);
    }
};

// ========== HOME TAB ==========
function loadHomeTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="home-container">
            <div class="home-header">
                <h1 class="logo">GigsCourt</h1>
                <div class="header-actions">
                    <div class="notification-bell" onclick="openNotifications()">
                        <span class="bell-icon">🔔</span>
                        <span class="notification-badge" id="notification-count">0</span>
                    </div>
                </div>
            </div>
            
            <div id="pull-to-refresh-indicator" class="ptr-indicator">
                <span class="ptr-spinner"></span>
                <span class="ptr-text">Pull to refresh</span>
            </div>
            
            <div id="providers-grid" class="providers-grid">
                <!-- Providers will load here -->
            </div>
            
            <div id="loading-spinner" class="loading-spinner hidden">
                <div class="spinner"></div>
            </div>
            
            <div id="empty-state" class="empty-state hidden">
                <p>No providers found nearby</p>
            </div>
        </div>
    `;
    
    // Load initial providers
    loadProviders();
    
    // Setup pull to refresh
    setupPullToRefresh();
    
    // Setup infinite scroll
    setupInfiniteScroll();
}

async function loadProviders(reset = true) {
    if (loading) return;
    loading = true;
    
    if (reset) {
        providers = [];
        lastDoc = null;
        hasMore = true;
        document.getElementById('providers-grid').innerHTML = '';
    }
    
    if (!hasMore) {
        loading = false;
        return;
    }
    
    document.getElementById('loading-spinner')?.classList.remove('hidden');
    
    try {
        // Get user's location (mock for now - will implement geolocation later)
        const userLocation = new firebase.firestore.GeoPoint(6.5244, 3.3792); // Lagos example
        
        let query = firebase.firestore().collection('users')
            .where('emailVerified', '==', true)
            .limit(6);
        
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            hasMore = false;
            if (providers.length === 0) {
                document.getElementById('empty-state').classList.remove('hidden');
            }
        } else {
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            // Process each provider
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                
                // Calculate mock distance (replace with real geo calculation later)
                const distance = (Math.random() * 10 + 0.5).toFixed(1);
                
                providers.push({
                    id: doc.id,
                    ...data,
                    distance: distance
                });
            });
            
            renderProviders();
        }
        
    } catch (error) {
        console.error('Error loading providers:', error);
    }
    
    document.getElementById('loading-spinner')?.classList.add('hidden');
    loading = false;
}

function renderProviders() {
    const grid = document.getElementById('providers-grid');
    if (!grid) return;
    
    providers.forEach(provider => {
        // Check if already rendered
        if (document.getElementById(`provider-${provider.id}`)) return;
        
        const card = document.createElement('div');
        card.id = `provider-${provider.id}`;
        card.className = 'provider-card';
        card.onclick = () => openQuickView(provider);
        
        // Get first 2 services
        const services = provider.services || [];
        const displayServices = services.slice(0, 2).join(' • ');
        const hasMoreServices = services.length > 2 ? '...' : '';
        
        card.innerHTML = `
            <div class="provider-image">
                <img src="${provider.profileImage || 'https://via.placeholder.com/150'}" alt="${provider.businessName}">
            </div>
            <div class="provider-info">
                <h3 class="provider-name">${provider.businessName}</h3>
                <div class="provider-rating">
                    <span class="stars">⭐ ${provider.rating || '0.0'}</span>
                    <span class="review-count">(${provider.reviewCount || 0})</span>
                </div>
                <div class="provider-services">${displayServices}${hasMoreServices}</div>
                <div class="provider-distance" onclick="event.stopPropagation(); showOnMap('${provider.id}')">
                    📍 ${provider.distance} km
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Pull to Refresh
function setupPullToRefresh() {
    const container = document.querySelector('.home-container');
    if (!container) return;
    
    let startY = 0;
    let currentY = 0;
    let pulling = false;
    
    container.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    }, { passive: true });
    
    container.addEventListener('touchmove', (e) => {
        if (!pulling) return;
        
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        if (diff > 0) {
            e.preventDefault();
            
            const indicator = document.getElementById('pull-to-refresh-indicator');
            const spinner = indicator.querySelector('.ptr-spinner');
            const text = indicator.querySelector('.ptr-text');
            
            // Resistance physics
            const pullDistance = Math.min(diff * 0.3, 80);
            indicator.style.transform = `translateY(${pullDistance}px)`;
            
            if (pullDistance > 60) {
                text.textContent = 'Release to refresh';
                spinner.style.transform = 'rotate(180deg)';
            } else {
                text.textContent = 'Pull to refresh';
                spinner.style.transform = `rotate(${pullDistance * 3}deg)`;
            }
        }
    }, { passive: false });
    
    container.addEventListener('touchend', () => {
        if (pulling) {
            const diff = currentY - startY;
            const pullDistance = Math.min(diff * 0.3, 80);
            
            if (pullDistance > 60) {
                refreshProviders();
            } else {
                resetPullToRefresh();
            }
            
            pulling = false;
        }
    });
    
    container.addEventListener('touchcancel', () => {
        resetPullToRefresh();
        pulling = false;
    });
}

async function refreshProviders() {
    const indicator = document.getElementById('pull-to-refresh-indicator');
    indicator.classList.add('refreshing');
    indicator.querySelector('.ptr-text').textContent = 'Refreshing...';
    
    // Reset and reload
    providers = [];
    lastDoc = null;
    hasMore = true;
    document.getElementById('providers-grid').innerHTML = '';
    await loadProviders();
    
    setTimeout(resetPullToRefresh, 500);
}

function resetPullToRefresh() {
    const indicator = document.getElementById('pull-to-refresh-indicator');
    indicator.style.transform = '';
    indicator.classList.remove('refreshing');
    indicator.querySelector('.ptr-text').textContent = 'Pull to refresh';
    indicator.querySelector('.ptr-spinner').style.transform = '';
}

// Infinite Scroll
function setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            if (!loading && hasMore) {
                loadProviders(false);
            }
        }
    });
}

// Quick View Bottom Sheet
function openQuickView(provider) {
    const overlay = document.createElement('div');
    overlay.className = 'bottom-sheet-overlay';
    overlay.onclick = closeQuickView;
    
    const sheet = document.createElement('div');
    sheet.className = 'bottom-sheet';
    
    sheet.innerHTML = `
        <div class="sheet-handle"></div>
        <div class="sheet-content">
            <div class="quick-view-header">
                <img src="${provider.profileImage || 'https://via.placeholder.com/100'}" class="quick-view-image">
                <div class="quick-view-info">
                    <h2>${provider.businessName}</h2>
                    <div class="quick-view-rating">⭐ ${provider.rating || '0.0'} (${provider.reviewCount || 0} reviews)</div>
                    <div class="quick-view-distance">📍 ${provider.distance} km away</div>
                </div>
            </div>
            
            <div class="quick-view-services">
                ${(provider.services || []).map(s => `<span class="service-tag">${s}</span>`).join('')}
            </div>
            
            <div class="quick-view-bio">
                ${provider.bio ? provider.bio.substring(0, 100) + (provider.bio.length > 100 ? '...' : '') : 'No bio yet.'}
            </div>
            
            <div class="quick-view-portfolio">
                ${(provider.portfolioImages || []).slice(0, 3).map(img => 
                    `<div class="portfolio-thumb"><img src="${img}"></div>`
                ).join('')}
            </div>
            
            <div class="quick-view-actions">
                <button class="btn" onclick="viewProfile('${provider.id}')">View Profile</button>
                <button class="btn" onclick="messageUser('${provider.id}')">Message</button>
                <button class="btn" onclick="getDirections('${provider.id}')">Directions</button>
            </div>
        </div>
    `;
    
    // Drag to close
    let startY = 0;
    sheet.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    sheet.addEventListener('touchmove', (e) => {
        const diff = e.touches[0].clientY - startY;
        if (diff > 0) {
            e.preventDefault();
            sheet.style.transform = `translateY(${diff}px)`;
        }
    }, { passive: false });
    
    sheet.addEventListener('touchend', (e) => {
        const diff = e.changedTouches[0].clientY - startY;
        if (diff > 100) {
            closeQuickView();
        } else {
            sheet.style.transform = '';
        }
    });
    
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
    
    // Animate in
    setTimeout(() => {
        overlay.classList.add('active');
        sheet.classList.add('active');
    }, 10);
}

window.closeQuickView = function() {
    const overlay = document.querySelector('.bottom-sheet-overlay');
    const sheet = document.querySelector('.bottom-sheet');
    
    if (overlay) overlay.classList.remove('active');
    if (sheet) sheet.classList.remove('active');
    
    setTimeout(() => {
        if (overlay) overlay.remove();
        if (sheet) sheet.remove();
    }, 300);
};

// Notifications
window.openNotifications = function() {
    const panel = document.createElement('div');
    panel.className = 'notification-panel';
    
    panel.innerHTML = `
        <div class="notification-header">
            <h3>Notifications</h3>
            <button class="btn btn-small" onclick="markAllRead()">Mark all read</button>
        </div>
        <div class="notification-list">
            <div class="notification-item">
                <div class="notification-content">
                    <strong>3 people</strong> saved your profile
                </div>
                <div class="notification-time">2h ago</div>
            </div>
            <div class="notification-item unread">
                <div class="notification-content">
                    <strong>Jane's Cuts</strong> sent you a message
                </div>
                <div class="notification-time">5m ago</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closePanel(e) {
            if (!panel.contains(e.target) && !e.target.closest('.notification-bell')) {
                panel.remove();
                document.removeEventListener('click', closePanel);
            }
        });
    }, 100);
};

window.markAllRead = function() {
    document.querySelectorAll('.notification-item').forEach(item => {
        item.classList.remove('unread');
    });
};

// Placeholders for other functions
window.viewProfile = (id) => alert('Profile view coming soon');
window.messageUser = (id) => alert('Messaging coming soon');
window.getDirections = (id) => alert('Directions coming soon');
window.showOnMap = (id) => alert('Map view coming soon');

// ========== MAIN APP LOADER ==========
function loadMainApp() {
    document.getElementById('app').innerHTML = `
        <div class="app-container">
            <div id="tab-content" class="tab-content"></div>
            
            <div class="tab-bar">
                <button class="tab-btn active" onclick="switchTab('home')">
                    <span class="tab-icon">🏠</span>
                    <span class="tab-label">Home</span>
                </button>
                <button class="tab-btn" onclick="switchTab('search')">
                    <span class="tab-icon">🔍</span>
                    <span class="tab-label">Search</span>
                </button>
                <button class="tab-btn" onclick="switchTab('messages')">
                    <span class="tab-icon">💬</span>
                    <span class="tab-label">Messages</span>
                </button>
                <button class="tab-btn" onclick="switchTab('profile')">
                    <span class="tab-icon">👤</span>
                    <span class="tab-label">Profile</span>
                </button>
            </div>
        </div>
    `;
    
    // Load home tab by default
    loadHomeTab();
}

window.switchTab = (tab) => {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Load tab content
    switch(tab) {
        case 'home':
            loadHomeTab();
            break;
        case 'search':
            document.getElementById('tab-content').innerHTML = '<div style="padding:20px">Search tab coming soon</div>';
            break;
        case 'messages':
            document.getElementById('tab-content').innerHTML = '<div style="padding:20px">Messages tab coming soon</div>';
            break;
        case 'profile':
            document.getElementById('tab-content').innerHTML = '<div style="padding:20px">Profile tab coming soon</div>';
            break;
    }
};

// ========== AUTH SCREENS ==========
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
    showLogin();
}

function loadVerification() {
    document.getElementById('app').innerHTML = `
        <div class="verification-container">
            <div class="verification-icon">✉️</div>
            <h2>Verify your email</h2>
            <p>We sent a verification link to:</p>
            <p class="email">${firebase.auth().currentUser?.email}</p>
            <p class="small">Click the link in the email to verify your account</p>
            
            <button class="btn" onclick="checkVerification()">I've verified</button>
            <button class="btn btn-outline" onclick="resendVerification()">Resend email</button>
            <button class="btn btn-outline" onclick="firebase.auth().signOut()">Back to login</button>
        </div>
    `;
}

// Auth functions
window.showLogin = function() {
    const content = document.getElementById('auth-content');
    if (!content) return;
    
    content.innerHTML = `
        <form id="login-form" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="login-email" required placeholder="your@email.com">
            </div>
            
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="login-password" required placeholder="••••••••">
            </div>
            
            <button type="submit" class="btn btn-full">Login</button>
        </form>
        
        <div class="auth-divider">
            <span>or</span>
        </div>
        
        <button class="btn btn-outline btn-full" onclick="alert('Phone signup coming soon!')">
            Continue with Phone (Coming Soon)
        </button>
    `;
    
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[onclick="showLogin()"]').classList.add('active');
};

window.showSignup = function() {
    const content = document.getElementById('auth-content');
    if (!content) return;
    
    content.innerHTML = `
        <form id="signup-form" onsubmit="handleSignup(event)">
            <div class="form-group">
                <label>Business Name</label>
                <input type="text" id="signup-business" required placeholder="Your business name">
            </div>
            
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="signup-email" required placeholder="your@email.com">
            </div>
            
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="signup-password" required placeholder="At least 6 characters">
                <small class="hint">Minimum 6 characters</small>
            </div>
            
            <div class="form-group">
                <label>Services Offered</label>
                <div class="service-presets">
                    <button type="button" class="service-pill" onclick="toggleService('Barber')">Barber</button>
                    <button type="button" class="service-pill" onclick="toggleService('Tech')">Tech</button>
                    <button type="button" class="service-pill" onclick="toggleService('Design')">Design</button>
                    <button type="button" class="service-pill" onclick="toggleService('Marketing')">Marketing</button>
                </div>
                
                <div class="form-group" style="margin-top: 15px;">
                    <label>Or add custom services (separate with commas)</label>
                    <input type="text" id="custom-services" placeholder="e.g., Photography, Consulting">
                </div>
                
                <div id="selected-services" class="selected-services"></div>
                <input type="hidden" id="services-input">
            </div>
            
            <button type="submit" class="btn btn-full">Sign Up</button>
        </form>
        
        <p class="terms-text">
            By signing up, you agree to our Terms of Service
        </p>
    `;
    
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[onclick="showSignup()"]').classList.add('active');
};

window.selectedServices = [];

window.toggleService = function(service) {
    const index = window.selectedServices.indexOf(service);
    if (index === -1) {
        window.selectedServices.push(service);
    } else {
        window.selectedServices.splice(index, 1);
    }
    
    const container = document.getElementById('selected-services');
    if (container) {
        container.innerHTML = window.selectedServices.map(s => 
            `<span class="service-tag">${s}</span>`
        ).join('');
    }
    
    document.querySelectorAll('.service-pill').forEach(btn => {
        if (window.selectedServices.includes(btn.textContent)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

window.handleLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
};

window.handleSignup = async function(event) {
    event.preventDefault();
    
    const businessName = document.getElementById('signup-business').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const customServices = document.getElementById('custom-services').value;
    
    let services = [...window.selectedServices];
    
    if (customServices.trim()) {
        const customList = customServices.split(',').map(s => s.trim()).filter(s => s);
        services = [...services, ...customList];
    }
    
    services = [...new Set(services)];
    
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await user.sendEmailVerification();
        
        await firebase.firestore().collection('users').doc(user.uid).set({
            businessName: businessName,
            email: email,
            services: services.filter(s => ['Barber', 'Tech', 'Design', 'Marketing'].includes(s)),
            pendingServices: services.filter(s => !['Barber', 'Tech', 'Design', 'Marketing'].includes(s)),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false,
            phoneVerified: false,
            signupMethod: 'email',
            rating: 0,
            reviewCount: 0,
            jobsDone: 0,
            profileImage: '',
            portfolioImages: [],
            bio: '',
            location: null
        });
        
        alert('Account created! Please check your email for verification.');
        
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
};

window.checkVerification = function() {
    firebase.auth().currentUser?.reload().then(() => {
        if (firebase.auth().currentUser?.emailVerified) {
            loadMainApp();
        } else {
            alert('Email not verified yet.');
        }
    });
};

window.resendVerification = function() {
    firebase.auth().currentUser?.sendEmailVerification()
        .then(() => alert('Verification email sent!'))
        .catch(error => alert('Error: ' + error.message));
};
