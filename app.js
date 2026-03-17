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
        <span class="tab-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3L3 9L5 9V19H9V15H15V19H19V9L21 9L12 3Z" fill="currentColor"/>
            </svg>
        </span>
        <span class="tab-label">Home</span>
    </button>
    <button class="tab-btn" onclick="switchTab('search')">
        <span class="tab-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
                <path d="M16 16L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </span>
        <span class="tab-label">Search</span>
    </button>
    <button class="tab-btn" onclick="switchTab('messages')">
        <span class="tab-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M22 6L12 13L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </span>
        <span class="tab-label">Messages</span>
    </button>
    <button class="tab-btn" onclick="switchTab('profile')">
        <span class="tab-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
                <path d="M5 20V19C5 15.1 8.1 12 12 12C15.9 12 19 15.1 19 19V20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </span>
        <span class="tab-label">Profile</span>
    </button>
</div>
        </div>
    `;
    
    // Load home tab by default
    loadHomeTab();
}

// ========== PROFILE TAB ==========
async function loadProfileTab(profileUserId = null) {
    const container = document.getElementById('tab-content');
    if (!container) return;
    
    const targetUserId = profileUserId || firebase.auth().currentUser.uid;
    const isOwnProfile = targetUserId === firebase.auth().currentUser.uid;
    
    try {
        // Get profile data
        const profileDoc = await firebase.firestore().collection('users').doc(targetUserId).get();
        if (!profileDoc.exists) {
            container.innerHTML = '<div class="error-state">Profile not found</div>';
            return;
        }
        
        const profile = profileDoc.data();
        profile.id = targetUserId;
        
        // Get stats counts
        const savedCount = await getSavedCount(targetUserId);
        const savesCount = await getSavesCount(targetUserId);
        
        // Render profile
        container.innerHTML = renderProfile(profile, savedCount, savesCount, isOwnProfile);
        
        // Add event listeners
        if (isOwnProfile) {
            setupOwnProfileListeners(profile);
        } else {
            setupOtherProfileListeners(profile);
        }
        
    } catch (error) {
        console.error('Error loading profile:', error);
        container.innerHTML = '<div class="error-state">Error loading profile</div>';
    }
}

function renderProfile(profile, savedCount, savesCount, isOwnProfile) {
    const jobsCount = profile.jobsDone || 0;
    const rating = profile.rating || 0;
    
    return `
    <div class="profile-container">
        <!-- Profile Picture + Business Name + Stats Row (Instagram style) -->
        <div class="profile-stats-row">
            <div class="profile-picture">
            <img src="${profile.profileImage || 'https://via.placeholder.com/80'}" alt="${profile.businessName}">
                ${isOwnProfile ? '<div class="camera-icon" onclick="openImageUpload()">📷</div>' : ''}
            </div>
            
            <div class="profile-info-right">
                <h1 class="profile-business-name">${profile.businessName || 'Business Name'}</h1>
                
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-number">${jobsCount}</span>
                        <span class="stat-label">Jobs</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${rating}</span>
                        <span class="stat-label">★ Rating</span>
                    </div>
                    <div class="stat-item clickable" onclick="${isOwnProfile ? 'openSavedModal()' : 'void(0)'}">
                        <span class="stat-number">${savedCount}</span>
                        <span class="stat-label">Saved</span>
                    </div>
                    <div class="stat-item clickable" onclick="${isOwnProfile ? 'openSavesModal()' : 'void(0)'}">
                        <span class="stat-number">${savesCount}</span>
                        <span class="stat-label">Saves</span>
                    </div>
                </div>
            </div>
        </div>
                
            <!-- Bio -->
            <div class="profile-bio">
                ${profile.bio || 'No bio yet.'}
            </div>
            
            <!-- Contact Info (only show if exists) -->
            ${profile.phoneNumber ? `
                <div class="profile-contact">
                    <span class="contact-icon">📞</span>
                    <span class="contact-text">${profile.phoneNumber}</span>
                </div>
            ` : ''}
            
            ${profile.location ? `
                <div class="profile-contact">
                    <span class="contact-icon">📍</span>
                    <span class="contact-text">${profile.location}</span>
                </div>
            ` : ''}
            
            <!-- Services Section -->
            <div class="profile-section">
                <h3 class="section-title">Services</h3>
                <div class="services-horizontal">
                    ${(profile.services || []).map(service => 
                        `<span class="service-pill-static">${service}</span>`
                    ).join('')}
                    ${(profile.pendingServices || []).map(service => 
                        `<span class="service-pill-static pending">${service} (pending)</span>`
                    ).join('')}
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="profile-actions">
                ${isOwnProfile ? `
                    <button class="btn" onclick="openEditProfile()">Edit Profile</button>
                    <button class="btn btn-outline" onclick="shareProfile()">Share</button>
                ` : `
                    <button class="btn" onclick="startChat('${profile.id}')">Message</button>
                    <button class="btn" onclick="toggleSaveProfile('${profile.id}')" id="save-btn-${profile.id}">Save</button>
                    <button class="btn btn-outline" onclick="shareProfile('${profile.id}')">Share</button>
                `}
            </div>
            
            <!-- Portfolio Section -->
            <div class="profile-section">
                <div class="section-header">
                    <h3 class="section-title">Portfolio ${profile.portfolioImages?.length ? `(${profile.portfolioImages.length})` : ''}</h3>
                    ${isOwnProfile ? '<button class="btn-small" onclick="addPortfolioImages()">+ Add</button>' : ''}
                </div>
                <div class="portfolio-grid">
                    ${(profile.portfolioImages || []).map((img, index) => `
                        <div class="portfolio-item" onclick="openPhotoSwipe(${index})">
                            <img src="${img}" loading="lazy">
                            ${isOwnProfile ? '<div class="delete-overlay" onclick="deleteImage(event, \'' + img + '\')">✕</div>' : ''}
                        </div>
                    `).join('')}
                    ${!profile.portfolioImages?.length ? '<p class="empty-portfolio">No portfolio images yet</p>' : ''}
                </div>
            </div>
        </div>
    `;
}

// Helper functions for stats
async function getSavedCount(userId) {
    try {
        const snapshot = await firebase.firestore()
            .collection('saves')
            .where('saverId', '==', userId)
            .count()
            .get();
        return snapshot.data().count;
    } catch (error) {
        console.error('Error getting saved count:', error);
        return 0;
    }
}

async function getSavesCount(userId) {
    try {
        const snapshot = await firebase.firestore()
            .collection('saves')
            .where('savedUserId', '==', userId)
            .count()
            .get();
        return snapshot.data().count;
    } catch (error) {
        console.error('Error getting saves count:', error);
        return 0;
    }
}

// Placeholder functions (to be implemented)
window.openImageUpload = () => alert('Image upload coming soon');
window.openSavedModal = () => alert('Saved profiles modal coming soon');
window.openSavesModal = () => alert('Saves modal coming soon');
window.openEditProfile = () => alert('Edit profile coming soon');
window.shareProfile = (id) => alert('Share coming soon');
window.startChat = (id) => alert('Chat coming soon');
window.toggleSaveProfile = (id) => alert('Save feature coming soon');
window.addPortfolioImages = () => alert('Add portfolio coming soon');
window.openPhotoSwipe = (index) => alert('Photo gallery coming soon');
window.deleteImage = (event, url) => {
    event.stopPropagation();
    if (confirm('Delete this image?')) {
        alert('Delete coming soon');
    }
};

// Setup functions
function setupOwnProfileListeners(profile) {
    // Add any own-profile specific listeners
}

function setupOtherProfileListeners(profile) {
    // Check if already saved and update button text
    checkIfSaved(profile.id);
}

async function checkIfSaved(profileId) {
    // Will implement in save feature phase
    const btn = document.getElementById(`save-btn-${profileId}`);
    if (btn) {
        btn.textContent = 'Saved';
    }
}

// ========== SEARCH TAB ==========
let map = null;
let userMarker = null;
let providerMarkers = [];
let routingControl = null;
let searchProviders = [];
let radiusCircle = null;
let currentRadius = 10; // Default 10km
let userLocation = null;

function loadSearchTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="search-container">
            <!-- Map Container (45%) -->
            <div id="search-map" class="search-map"></div>
            
            <!-- Search Controls (10%) -->
            <div class="search-controls">
                <div class="search-input-container">
                    <input type="text" id="search-input" class="search-input" placeholder="Search by service...">
                </div>
                
                <div class="radius-control">
                    <span class="radius-icon">📍</span>
                    <span class="radius-value" id="radius-value">${currentRadius} km</span>
                    <input type="range" id="radius-slider" class="radius-slider" min="1" max="200" value="${currentRadius}" step="1">
                </div>
            </div>
            
            <!-- Provider List Drawer (45%) -->
            <div class="provider-drawer">
                <div class="drawer-handle"></div>
                <div id="provider-list" class="provider-list">
                    <!-- Providers will load here -->
                </div>
                <div id="drawer-loading" class="drawer-loading hidden">
                    <div class="spinner-small"></div>
                </div>
            </div>
        </div>
    `;
    
    // Get user location
    getUserLocation();
    
    // Setup event listeners
    setupSearchListeners();
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                initializeMap();
                loadNearbyProviders();
            },
            (error) => {
                console.error('Geolocation error:', error);
                // Default to Lagos if geolocation fails
                userLocation = { lat: 6.5244, lng: 3.3792 };
                initializeMap();
                loadNearbyProviders();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        // Default to Lagos if geolocation not supported
        userLocation = { lat: 6.5244, lng: 3.3792 };
        initializeMap();
        loadNearbyProviders();
    }
}

function initializeMap() {
    // Wait for container to be visible
    setTimeout(() => {
        const mapContainer = document.getElementById('search-map');
        if (!mapContainer) return;
        
        // Check if map already initialized
        if (map) {
            map.remove();
            map = null;
        }
        
        // Initialize map with Humanitarian OSM tiles
        map = L.map('search-map', {
            center: [userLocation.lat, userLocation.lng],
            zoom: 13,
            zoomControl: false,
            attributionControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);
        
        // Add zoom control to bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        
        // Add user location marker (blue dot)
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="user-dot"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
        
        // Draw initial radius circle
        updateRadiusCircle();
        
        // Handle map movement for location picker (will be used later)
        map.on('moveend', onMapMoved);
        
    }, 300);
}

function updateRadiusCircle() {
    if (!map || !userLocation) return;
    
    // Remove existing circle
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
    }
    
    // Draw new circle
    radiusCircle = L.circle([userLocation.lat, userLocation.lng], {
        radius: currentRadius * 1000, // Convert km to meters
        color: '#000000',
        weight: 1,
        fillColor: '#000000',
        fillOpacity: 0.1,
        lineCap: 'round'
    }).addTo(map);
    
    // Fit map to circle bounds
    map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] });
}

async function loadNearbyProviders() {
    if (!userLocation) return;
    
    const listContainer = document.getElementById('provider-list');
    const loadingEl = document.getElementById('drawer-loading');
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    
    try {
        // Get all providers
        const snapshot = await firebase.firestore().collection('users')
            .where('emailVerified', '==', true)
            .get();
        
        searchProviders = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Calculate distance (simplified - replace with proper geo calculation later)
            const distance = (Math.random() * 200 + 1).toFixed(1);
            
            // Only include if within radius
            if (parseFloat(distance) <= currentRadius) {
                searchProviders.push({
                    id: doc.id,
                    ...data,
                    distance: distance,
                    location: data.location || { lat: userLocation.lat + (Math.random() - 0.5) * 0.1, lng: userLocation.lng + (Math.random() - 0.5) * 0.1 }
                });
            }
        });
        
        // Sort by distance
        searchProviders.sort((a, b) => a.distance - b.distance);
        
        // Update map markers
        updateMapMarkers();
        
        // Update list
        renderProviderList();
        
    } catch (error) {
        console.error('Error loading providers:', error);
    }
    
    if (loadingEl) loadingEl.classList.add('hidden');
}

function updateMapMarkers() {
    // Clear existing markers
    providerMarkers.forEach(marker => map.removeLayer(marker));
    providerMarkers = [];
    
    // Add new markers
    searchProviders.forEach(provider => {
        // Create custom marker with rating badge
        const markerHtml = `
            <div class="provider-marker">
                <div class="marker-pin"></div>
                <div class="rating-badge">⭐ ${provider.rating || '0.0'}</div>
            </div>
        `;
        
        const markerIcon = L.divIcon({
            className: 'provider-marker-container',
            html: markerHtml,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });
        
        // Use provider location or random nearby point
        const lat = provider.location?.lat || userLocation.lat + (Math.random() - 0.5) * 0.1;
        const lng = provider.location?.lng || userLocation.lng + (Math.random() - 0.5) * 0.1;
        
        const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
        
        // Add popup
        marker.bindPopup(`
            <div class="map-popup">
                <strong>${provider.businessName}</strong><br>
                ⭐ ${provider.rating || '0.0'} (${provider.reviewCount || 0})<br>
                📍 ${provider.distance} km<br>
                <button class="popup-btn" onclick="viewProviderFromMap('${provider.id}')">View</button>
            </div>
        `);
        
        providerMarkers.push(marker);
    });
}

function renderProviderList() {
    const listContainer = document.getElementById('provider-list');
    if (!listContainer) return;
    
    if (searchProviders.length === 0) {
        listContainer.innerHTML = '<div class="empty-list">No providers found within radius</div>';
        return;
    }
    
    listContainer.innerHTML = searchProviders.map(provider => `
        <div class="provider-list-item" onclick="openQuickViewFromSearch('${provider.id}')">
            <img src="${provider.profileImage || 'https://via.placeholder.com/40'}" class="list-item-image">
            <div class="list-item-info">
                <div class="list-item-name">${provider.businessName}</div>
                <div class="list-item-details">
                    <span>⭐ ${provider.rating || '0.0'}</span>
                    <span>(${provider.reviewCount || 0})</span>
                    <span>• ${provider.distance} km</span>
                </div>
            </div>
        </div>
    `).join('');
}

function setupSearchListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterProviders(searchTerm);
        });
    }
    
    // Radius slider
    const radiusSlider = document.getElementById('radius-slider');
    const radiusValue = document.getElementById('radius-value');
    
    if (radiusSlider && radiusValue) {
        radiusSlider.addEventListener('input', (e) => {
            currentRadius = parseInt(e.target.value);
            radiusValue.textContent = `${currentRadius} km`;
        });
        
        radiusSlider.addEventListener('change', () => {
            updateRadiusCircle();
            loadNearbyProviders();
        });
    }
}

function filterProviders(searchTerm) {
    const items = document.querySelectorAll('.provider-list-item');
    
    items.forEach(item => {
        const name = item.querySelector('.list-item-name')?.textContent.toLowerCase() || '';
        if (name.includes(searchTerm) || searchTerm === '') {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Directions feature
window.getDirections = function(providerId) {
    const provider = searchProviders.find(p => p.id === providerId);
    if (!provider || !userLocation) return;
    
    // Switch to search tab
    switchTab('search');
    
    // Wait for map to be ready
    setTimeout(() => {
        if (!map) return;
        
        // Remove existing routing
        if (routingControl) {
            map.removeControl(routingControl);
        }
        
        // Create routing control
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(userLocation.lat, userLocation.lng),
                L.latLng(provider.location?.lat || userLocation.lat + 0.01, provider.location?.lng || userLocation.lng + 0.01)
            ],
            routeWhileDragging: false,
            showAlternatives: false,
            fitSelectedRoutes: true,
            lineOptions: {
                styles: [{ color: '#000000', opacity: 0.8, weight: 4 }]
            },
            createMarker: function() { return null; } // Don't create markers
        }).addTo(map);
        
        // Add show/hide button
        const directionsBtn = document.createElement('button');
        directionsBtn.className = 'directions-toggle-btn';
        directionsBtn.textContent = 'Hide';
        directionsBtn.onclick = toggleDirections;
        document.querySelector('.search-container').appendChild(directionsBtn);
    }, 500);
};

window.toggleDirections = function() {
    if (routingControl) {
        const container = routingControl.getContainer();
        if (container.style.display === 'none') {
            container.style.display = 'block';
            event.target.textContent = 'Hide';
        } else {
            container.style.display = 'none';
            event.target.textContent = 'Show';
        }
    }
};

window.viewProviderFromMap = function(providerId) {
    const provider = searchProviders.find(p => p.id === providerId);
    if (provider) {
        openQuickView(provider);
    }
};

window.openQuickViewFromSearch = function(providerId) {
    const provider = searchProviders.find(p => p.id === providerId);
    if (provider) {
        openQuickView(provider);
    }
};

function onMapMoved() {
    // Used for location picker later
}

// Add to placeholders
window.viewProfile = (id) => {
    switchTab('profile');
    loadProfileTab(id);
};

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
    loadSearchTab();
    break;
        case 'messages':
            document.getElementById('tab-content').innerHTML = '<div style="padding:20px">Messages tab coming soon</div>';
            break;
        case 'profile':
            loadProfileTab();
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
