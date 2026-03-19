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

// Initialize ImageKit for client-side upload
var imagekit = new ImageKit({
    publicKey: "public_t2gpKmHQ/9binh9kNSsQBq0zsys=",
    urlEndpoint: "https://ik.imagekit.io/GigsCourt"
});

// Initialize GeoFirestore
const firestore = firebase.firestore();
const GeoFirestore = window.GeoFirestore;
const geofirestore = new GeoFirestore(firestore);

// Global state
let currentUser = null;
let currentUserData = null;
let providers = [];
let lastDoc = null;
let loading = false;
let hasMore = true;
let userLocation = null;  // Make it global for other tabs to use
let pullToRefresh = {
    startY: 0,
    currentY: 0,
    refreshing: false,
    pulling: false
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

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
    location: null,
    locationGeo: null  // Add this line
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
        // Get user's current location
        let userLat = 6.5244; // Default Lagos
        let userLng = 3.3792;
        
        // Try to get from global userLocation (set by search tab)
        if (window.userLocation) {
            userLat = window.userLocation.lat;
            userLng = window.userLocation.lng;
        } else {
            // Try localStorage
            const savedLocation = localStorage.getItem('userLocation');
            if (savedLocation) {
                const loc = JSON.parse(savedLocation);
                userLat = loc.lat;
                userLng = loc.lng;
            }
        }
        
        let query = firebase.firestore().collection('users')
            .where('emailVerified', '==', true)
            .where('locationGeo', '!=', null)  // Only get users with location
            .limit(10);  // Increased limit for home tab
        
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
                
                // Calculate REAL distance
                let distance = 999; // Default large number if no location
                if (data.locationGeo) {
                    distance = calculateDistance(
                        userLat,
                        userLng,
                        data.locationGeo.latitude,
                        data.locationGeo.longitude
                    );
                }
                
                providers.push({
                    id: doc.id,
                    ...data,
                    distance: distance.toFixed(1)
                });
            });
            
            // Sort by distance (closest first)
            providers.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
            
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
                <img src="${provider.profileImage ? provider.profileImage + '?tr=w-150,h-150' : 'https://via.placeholder.com/150'}" alt="${provider.businessName}">
            </div>
            <div class="provider-info">
                <h3 class="provider-name">${provider.businessName}</h3>
                <div class="provider-rating">
                    <span class="stars">⭐ ${provider.rating || '0.0'}</span>
                    <span class="review-count">(${provider.reviewCount || 0})</span>
                </div>
                <div class="provider-services">${displayServices}${hasMoreServices}</div>
                <div class="provider-distance" onclick="event.stopPropagation(); showOnMap('${provider.id}')">
    📍 ${provider.distance} km away
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
                <img src="${provider.profileImage ? provider.profileImage + '?tr=w-100,h-100' : 'https://via.placeholder.com/100'}" class="quick-view-image">
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
                    `<div class="portfolio-thumb"><img src="${img}?tr=w-100,h-100"></div>`
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

// ========== MESSAGE FUNCTIONS ==========
window.viewProfile = (id) => {
    switchTab('profile');
    loadProfileTab(id);
};

window.messageUser = (id) => {
    // Switch to messages tab and open chat with this user
    switchTab('messages');
    // We'll implement creating a new chat here
    setTimeout(() => {
        createNewChat(id);
    }, 500);
};

async function createNewChat(otherUserId) {
    const currentUserId = firebase.auth().currentUser.uid;
    
    try {
        // Check if chat already exists
        const chatsSnapshot = await firebase.firestore()
            .collection('chats')
            .where('participants', 'array-contains', currentUserId)
            .get();
        
        let existingChatId = null;
        
        chatsSnapshot.forEach(doc => {
            const chat = doc.data();
            if (chat.participants.includes(otherUserId)) {
                existingChatId = doc.id;
            }
        });
        
        if (existingChatId) {
            // Open existing chat
            const chatData = (await firebase.firestore().collection('chats').doc(existingChatId).get()).data();
            openChat(existingChatId, otherUserId, chatData);
        } else {
            // Create new chat
            // Get other user's info first
            const otherUserDoc = await firebase.firestore().collection('users').doc(otherUserId).get();
            const otherUserData = otherUserDoc.data();

            const newChatRef = await firebase.firestore().collection('chats').add({
                participants: [currentUserId, otherUserId],
                otherUserName: otherUserData.businessName || 'User',
                otherUserImage: otherUserData.profileImage || 'https://via.placeholder.com/40',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: '',
                lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageSender: '',
                lastMessageRead: true
            });  
            
            // Open the new chat
            openChat(newChatRef.id, otherUserId, {
                ...otherUserData,
                otherUserName: otherUserData.businessName
            });
        }
    } catch (error) {
        console.error('Error creating chat:', error);
        alert('Could not start chat. Please try again.');
    }
}

// Fix for existing chats - updates them with user names
async function fixChatUserNames() {
    const currentUserId = firebase.auth().currentUser.uid;
    
    try {
        const chatsSnapshot = await firebase.firestore()
            .collection('chats')
            .where('participants', 'array-contains', currentUserId)
            .get();
        
        for (const doc of chatsSnapshot.docs) {
            const chat = doc.data();
            const otherUserId = chat.participants.find(id => id !== currentUserId);
            
            // If chat doesn't have otherUserName, add it
            if (!chat.otherUserName) {
                const userDoc = await firebase.firestore().collection('users').doc(otherUserId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    await doc.ref.update({
                        otherUserName: userData.businessName || 'User',
                        otherUserImage: userData.profileImage || 'https://via.placeholder.com/40'
                    });
                    console.log('Updated chat with user:', userData.businessName);
                }
            }
        }
        console.log('Finished fixing chats');
    } catch (error) {
        console.error('Error fixing chats:', error);
    }
}

window.getDirections = (id) => alert('Directions coming soon');
window.showOnMap = (id) => alert('Map view coming soon');

window.getDirectionsToProvider = async function(providerId) {
    // Get provider's location from Firestore
    const providerDoc = await firebase.firestore().collection('users').doc(providerId).get();
    const provider = providerDoc.data();
    
    if (!provider.locationGeo) {
        alert('This provider has not set their location');
        return;
    }
    
    // Store the target provider for directions
    window.directionsTarget = {
        id: providerId,
        location: {
            lat: provider.locationGeo.latitude,
            lng: provider.locationGeo.longitude
        },
        name: provider.businessName
    };
    
    // Switch to search tab
    switchTab('search');
    
    // Wait for search tab to fully load
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkMapReady = setInterval(() => {
        attempts++;
        
        if (map && userLocation) {
            clearInterval(checkMapReady);
            showDirectionsToTarget();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkMapReady);
            alert('Map not ready. Please try again.');
        }
    }, 500);
};

function showDirectionsToTarget() {
    if (!window.directionsTarget) {
        alert('No destination selected');
        return;
    }
    
    if (!userLocation) {
        alert('Your location not found');
        return;
    }
    
    const target = window.directionsTarget;
    
    // Remove existing routing
    if (routingControl) {
        map.removeControl(routingControl);
    }
    
    // Create routing control with directions
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(userLocation.lat, userLocation.lng),
            L.latLng(target.location.lat, target.location.lng)
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: true,
        lineOptions: {
            styles: [{ color: '#0000FF', opacity: 0.8, weight: 5 }] // Blue line
        },
        createMarker: function() { return null; } // Don't create duplicate markers
    }).addTo(map);
    
    // Center map on the route
    setTimeout(() => {
        map.fitBounds([
            [userLocation.lat, userLocation.lng],
            [target.location.lat, target.location.lng]
        ], { padding: [50, 50] });
    }, 500);
    
    // Clear the target
    window.directionsTarget = null;
}

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
                ${firebase.auth().currentUser?.email === 'agboghidiaugust@gmail.com' ? `
                <button class="tab-btn" onclick="switchTab('admin')">
                    <span class="tab-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6-2.28 0-2.56 4-4 6-4s6 1.44 6 4c-1.57 1.46-3.97 2.28-6 2.28z" fill="currentColor"/>
                        </svg>
                    </span>
                    <span class="tab-label">Admin</span>
                </button>
                ` : ''}
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
                <img src="${profile.profileImage ? profile.profileImage + '?tr=w-80,h-80' : 'https://via.placeholder.com/80'}" alt="${profile.businessName}">
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
                    ${isOwnProfile ? `
                        <div class="stat-item clickable" onclick="openSavedModal()">
                            <span class="stat-number">${savedCount}</span>
                            <span class="stat-label">Saved</span>
                        </div>
                    ` : ''}
                    <div class="stat-item ${isOwnProfile ? 'clickable' : ''}" onclick="${isOwnProfile ? 'openSavesModal()' : ''}">
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
    <div class="profile-contact ${!isOwnProfile ? 'clickable-location' : ''}" 
         ${!isOwnProfile ? `onclick="getDirectionsToProvider('${profile.id}')"` : ''}>
        <span class="contact-icon">📍</span>
        <span class="contact-text">${profile.locationDescription || profile.location}</span>
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
                        <img src="${img}?tr=w-150,h-150" loading="lazy">
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
            .get();
        return snapshot.size; // Use .size instead of .count()
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
            .get();
        return snapshot.size; // Use .size instead of .count()
    } catch (error) {
        console.error('Error getting saves count:', error);
        return 0;
    }
}

// ========== IMAGE UPLOAD FUNCTIONS ==========
window.openImageUpload = function() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = uploadProfileImage;
    input.click();
};

async function uploadProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Show loading
    alert('Uploading image...');
    
    try {
        // Compress image
        const compressedFile = await compressImage(file);
        
        // Get authentication parameters from your backend FIRST
        const authResponse = await fetch('https://gigscourt.vercel.app/api/imagekit-auth');
        const authData = await authResponse.json();
        
        // Read as base64
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onload = function() {
            const base64 = reader.result.split(',')[1];
            
            // Upload to ImageKit with security parameters
            imagekit.upload({
                file: base64,
                fileName: `profile_${Date.now()}.jpg`,
                folder: '/profiles',
                signature: authData.signature,
                token: authData.token,
                expire: authData.expire,
                useUniqueFileName: true
            }, function(err, result) {
                if (err) {
                    console.error('ImageKit error:', err);
                    alert('Upload failed: ' + err.message);
                    return;
                }
                
                // Update user profile with new image URL
                firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
                    profileImage: result.url
                }).then(() => {
                    alert('Profile picture updated!');
                    
                    // Refresh current view
                    if (document.querySelector('.profile-container')) {
                        loadProfileTab();
                    } else if (document.querySelector('.edit-profile-container')) {
                        window.openEditProfile();
                    }
                }).catch(error => {
                    console.error('Firestore error:', error);
                    alert('Failed to save image URL');
                });
            });
        };
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image: ' + error.message);
    }
}

window.addPortfolioImages = function() {
    // Create file input that accepts multiple files
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = uploadPortfolioImages;
    input.click();
};

async function uploadPortfolioImages(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    alert(`Uploading ${files.length} images...`);
    
    try {
        const uploadedUrls = [];
        
        for (const file of files) {
            // Get fresh authentication parameters for EACH image
            const authResponse = await fetch('https://gigscourt.vercel.app/api/imagekit-auth');
            const authData = await authResponse.json();
            
            // Compress image
            const compressedFile = await compressImage(file);
            
            // Read as base64
            const base64 = await readFileAsBase64(compressedFile);
            
            // Upload to ImageKit with security parameters
            await new Promise((resolve, reject) => {
                imagekit.upload({
                    file: base64,
                    fileName: `portfolio_${Date.now()}_${Math.random()}.jpg`,
                    folder: '/portfolios',
                    signature: authData.signature,
                    token: authData.token,
                    expire: authData.expire,
                    useUniqueFileName: true
                }, function(err, result) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    uploadedUrls.push(result.url);
                    resolve();
                });
            });
        }
            
        // After all uploads complete, update Firestore
        await updateFirestoreWithPortfolio(uploadedUrls);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload images: ' + error.message);
    }
}

async function updateFirestoreWithPortfolio(uploadedUrls) {
    try {
        // Get current user data
        const userDoc = await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).get();
        const userData = userDoc.data();
        const existingImages = userData.portfolioImages || [];
        
        // Update with new images
        await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
            portfolioImages: [...existingImages, ...uploadedUrls]
        });
        
        alert(`${uploadedUrls.length} images uploaded successfully!`);
        
        // Refresh profile
        loadProfileTab();
    } catch (error) {
        console.error('Firestore error:', error);
        alert('Failed to save image URLs');
    }
}

// Helper function to compress images
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Max dimensions
                const MAX_WIDTH = 1600;
                const MAX_HEIGHT = 1600;
                
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, file.type, 0.8); // 80% quality
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
    });
}

window.deleteImage = async (event, imageUrl) => {
    event.stopPropagation();
    
    if (!confirm('Delete this image?')) return;
    
    try {
        const userDoc = await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).get();
        const userData = userDoc.data();
        
        // Filter out the deleted image
        const updatedImages = (userData.portfolioImages || []).filter(url => url !== imageUrl);
        
        // Update Firestore
        await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
            portfolioImages: updatedImages
        });
        
        alert('Image deleted');
        
        // Refresh profile
        loadProfileTab();
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete image');
    }
};

// ========== EDIT PROFILE FUNCTIONS ==========
window.openEditProfile = function() {
    const container = document.getElementById('tab-content');
    
    container.innerHTML = `
        <div class="edit-profile-container">
            <div class="edit-profile-header">
                <button class="back-btn" onclick="loadProfileTab()">←</button>
                <h1>Edit Profile</h1>
                <button class="save-btn" onclick="saveEditProfile()">Save</button>
            </div>
            
            <div class="edit-profile-form">
                <!-- Profile Picture -->
                <div class="edit-picture-section">
                    <div class="edit-picture">
                        <img src="${currentUserData?.profileImage ? currentUserData.profileImage + '?tr=w-80,h-80' : 'https://via.placeholder.com/80'}" alt="Profile">
                        <div class="change-picture-btn" onclick="openImageUpload()">Change</div>
                    </div>
                </div>
                
                <!-- Business Name (with cooldown) -->
                <div class="form-group">
                    <label>Business Name</label>
                    <input type="text" id="edit-business-name" value="${currentUserData?.businessName || ''}">
                    <small class="cooldown-hint">Can change every 14 days</small>
                </div>
                
                <!-- Username (with cooldown) -->
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="edit-username" value="${currentUserData?.username || ''}">
                    <small class="cooldown-hint">Can change every 14 days</small>
                </div>
                
                <!-- Bio -->
                <div class="form-group">
                    <label>Bio</label>
                    <textarea id="edit-bio" rows="3">${currentUserData?.bio || ''}</textarea>
                </div>
                
                <!-- Phone -->
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" id="edit-phone" value="${currentUserData?.phoneNumber || ''}">
                </div>
                
                <!-- Location -->
                <div class="form-group">
                    <label>Location</label>
                    <button class="location-picker-btn" onclick="openLocationPicker()">
                        📍 ${currentUserData?.location || 'Set your location'}
                    </button>
                </div>
                
                <!-- Services -->
                <div class="form-group">
                    <label>Services</label>
                    <div class="current-services">
                        ${(currentUserData?.services || []).map(service => 
                            `<span class="service-tag">${service} <span class="remove-service" onclick="removeService('${service}')">✕</span></span>`
                        ).join('')}
                    </div>
                    <div class="add-service">
                        <input type="text" id="new-service" placeholder="Add a service">
                        <button class="add-service-btn" onclick="addService()">Add</button>
                    </div>
                </div>
                
                <!-- Account Actions -->
                <div class="account-actions">
                    <button class="btn btn-outline" onclick="logout()">Log Out</button>
                    <button class="btn btn-outline delete-account" onclick="deleteAccount()">Delete Account</button>
                </div>
            </div>
        </div>
    `;
};

// Edit Profile Helper Functions
window.saveEditProfile = async function() {
    const businessName = document.getElementById('edit-business-name').value;
    const username = document.getElementById('edit-username').value;
    const bio = document.getElementById('edit-bio').value;
    const phone = document.getElementById('edit-phone').value;
    
    if (!businessName) {
        alert('Business name is required');
        return;
    }
    
    try {
        await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
            businessName: businessName,
            username: username,
            bio: bio,
            phoneNumber: phone
        });
        
        // Reload profile tab
        loadProfileTab();
    } catch (error) {
        alert('Error saving profile: ' + error.message);
    }
};

window.openLocationPicker = function() {
    const container = document.getElementById('tab-content');
    
    container.innerHTML = `
        <div class="location-picker-container">
            <div class="location-picker-header">
                <button class="back-btn" onclick="openEditProfile()">←</button>
                <h1>Set Location</h1>
                <button class="save-btn" onclick="saveLocation()">Done</button>
            </div>
            
            <div id="location-map" class="location-map"></div>
            
            <div class="location-search">
                <input type="text" id="location-search-input" class="location-search-input" placeholder="Search for a place...">
            </div>
            
            <div class="location-details">
                <div class="form-group">
                    <label>Address</label>
                    <input type="text" id="location-address" class="location-address" readonly placeholder="Drag the map to set location">
                </div>
                
                <div class="form-group">
                    <label>Description (optional)</label>
                    <textarea id="location-description" rows="2" placeholder="e.g., Beside the blue church, after the mechanic village">${currentUserData?.locationDescription || ''}</textarea>
                </div>
            </div>
            
            <div class="location-pin">
                <div class="pin"></div>
            </div>
        </div>
    `;
    
    // Initialize map after container is visible
    setTimeout(() => {
        initializeLocationMap();
    }, 300);
};

let locationMap = null;
let locationMarker = null;
let selectedLocation = null;

function initializeLocationMap() {
    const mapContainer = document.getElementById('location-map');
    if (!mapContainer) return;
    
    // Try to get user's current location first
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Use current location
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setupMap(lat, lng);
            },
            (error) => {
                console.log('Geolocation error:', error);
                // Fallback to stored location or Lagos default
                useFallbackLocation();
            },
            { timeout: 5000 }
        );
    } else {
        // Geolocation not supported, use fallback
        useFallbackLocation();
    }
    
    function useFallbackLocation() {
        let lat = 6.5244; // Lagos default
        let lng = 3.3792;
        
        if (currentUserData?.location) {
            const parts = currentUserData.location.split(',');
            if (parts.length === 2) {
                lat = parseFloat(parts[0]);
                lng = parseFloat(parts[1]);
            }
        }
        setupMap(lat, lng);
    }
    
    function setupMap(lat, lng) {
        // Initialize map
        locationMap = L.map('location-map', {
            center: [lat, lng],
            zoom: 15,
            zoomControl: true,
            attributionControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(locationMap);
        
        // Store selected location
        selectedLocation = { lat, lng };
        
        // Update address when map moves (pin stays centered)
        locationMap.on('moveend', function() {
            const center = locationMap.getCenter();
            selectedLocation = { lat: center.lat, lng: center.lng };
            updateAddressFromCoords(center.lat, center.lng);
        });
        
        // Get initial address
        updateAddressFromCoords(lat, lng);
    }
}
         
async function updateAddressFromCoords(lat, lng) {
    const addressInput = document.getElementById('location-address');
    if (!addressInput) return;
    
    // Store selected location
    selectedLocation = { lat, lng };
    
    // Show loading
    addressInput.value = 'Getting address...';
    
    try {
        // Use Nominatim for reverse geocoding
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'GigsCourt/1.0'
                }
            }
        );
        
        const data = await response.json();
        
        if (data.display_name) {
            addressInput.value = data.display_name;
        } else {
            addressInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        addressInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
}

window.saveLocation = function() {
    if (!selectedLocation) {
        alert('Please select a location');
        return;
    }
    
    const address = document.getElementById('location-address').value;
    const description = document.getElementById('location-description').value;
    
    // Create GeoPoint for Firestore
    const geopoint = new firebase.firestore.GeoPoint(selectedLocation.lat, selectedLocation.lng);
    
    // Format location as string "lat,lng" for backward compatibility
    const locationString = `${selectedLocation.lat},${selectedLocation.lng}`;
    
    // Update Firestore with both formats
    firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
        location: locationString,
        locationGeo: geopoint,  // New field for geo queries
        locationDescription: description
    }).then(() => {
        alert('Location saved!');
        // Refresh currentUserData
        firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).get().then(doc => {
            currentUserData = doc.data();
            openEditProfile();
        });
    }).catch(error => {
        console.error('Error saving location:', error);
        alert('Failed to save location');
    });
};

// Add search functionality
document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'location-search-input') {
        searchLocation(e.target.value);
    }
});

let searchTimeout;
async function searchLocation(query) {
    if (!query || query.length < 3) return;
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'User-Agent': 'GigsCourt/1.0'
                    }
                }
            );
            
            const results = await response.json();
            
            if (results.length > 0) {
                const first = results[0];
                const lat = parseFloat(first.lat);
                const lng = parseFloat(first.lon);
                
                // Move map to searched location
                locationMap.setView([lat, lng], 15);
                updateAddressFromCoords(lat, lng);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }, 500);
}

window.removeService = function(service) {
    const services = currentUserData?.services || [];
    const updatedServices = services.filter(s => s !== service);
    
    firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
        services: updatedServices
    }).then(() => {
        // Refresh edit profile
        window.openEditProfile();
    });
};

window.addService = function() {
    const newService = document.getElementById('new-service').value.trim();
    if (!newService) return;
    
    const services = currentUserData?.services || [];
    const pendingServices = currentUserData?.pendingServices || [];
    
    // Check if it's a preset service
    if (['Barber', 'Tech', 'Design', 'Marketing'].includes(newService)) {
        if (!services.includes(newService)) {
            firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
                services: [...services, newService]
            }).then(() => {
                document.getElementById('new-service').value = '';
                window.openEditProfile();
            });
        }
    } else {
        // Custom service goes to pending
        if (!pendingServices.includes(newService)) {
            firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
                pendingServices: [...pendingServices, newService]
            }).then(() => {
                document.getElementById('new-service').value = '';
                window.openEditProfile();
            });
        }
    }
};

// ========== SHARE PROFILE ==========
window.shareProfile = async function(profileId) {
    // If no profileId provided, use current user's ID
    const targetId = profileId || firebase.auth().currentUser.uid;
    console.log('1. Share function started', profileId);
    
    // Get the profile data
    const profileDoc = await firebase.firestore().collection('users').doc(targetId).get();
    console.log('2. Profile fetched', profileDoc.exists);
    
    if (!profileDoc.exists) return;
    
    const profile = profileDoc.data();
    const businessName = profile.businessName || 'GigsCourt Profile';
    const bio = profile.bio ? profile.bio.substring(0, 100) : 'Check out my profile on GigsCourt';
    
    // Create the profile URL using document ID
    const profileUrl = `${window.location.origin}/user/${targetId}`;
    
    console.log('3. Share data prepared', { businessName, bio, profileUrl });
    
    // Try native share first (mobile)
    if (navigator.share) {
        console.log('4. Web Share API is supported');
        try {
            await navigator.share({
                title: businessName,
                text: bio,
                url: profileUrl
            });
            console.log('5. Share successful');
        } catch (err) {
            console.log('5. Share error:', err.name, err.message);
            if (err.name !== 'AbortError') {
                console.log('6. Falling back to clipboard');
                copyProfileLink(profileUrl);
            }
        }
    } else {
        console.log('4. Web Share API NOT supported, using clipboard');
        copyProfileLink(profileUrl);
    }
};

// Helper function to copy link and show toast
async function copyProfileLink(url) {
    console.log('7. Copying to clipboard:', url);
    try {
        await navigator.clipboard.writeText(url);
        console.log('8. Copy successful');
        showToast('Link copied!');
    } catch (err) {
        console.error('8. Copy failed:', err);
        alert('Could not copy link. Please copy manually: ' + url);
    }
}

// Toast notification function
function showToast(message) {
    console.log('9. Showing toast:', message);
    // Remove any existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 2 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

window.startChat = (id) => alert('Chat coming soon');
window.toggleSaveProfile = async function(profileId) {
    const currentUserId = firebase.auth().currentUser.uid;
    if (currentUserId === profileId) {
        alert('You cannot save your own profile');
        return;
    }
    
    const saveBtn = document.getElementById(`save-btn-${profileId}`);
    const isSaved = saveBtn.textContent === 'Saved';
    
    try {
        if (isSaved) {
            // Unsave - delete the save document
            const savesSnapshot = await firebase.firestore()
                .collection('saves')
                .where('saverId', '==', currentUserId)
                .where('savedUserId', '==', profileId)
                .get();
            
            const deletePromises = [];
            savesSnapshot.forEach(doc => {
                deletePromises.push(doc.ref.delete());
            });
            
            await Promise.all(deletePromises);
            
            // Update button
            saveBtn.textContent = 'Save';
            saveBtn.classList.remove('saved');
            
        } else {
            // Save - create new save document
            await firebase.firestore().collection('saves').add({
                saverId: currentUserId,
                savedUserId: profileId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update button
            saveBtn.textContent = 'Saved';
            saveBtn.classList.add('saved');
        }
        
        // Update the stats counts in the profile
        updateProfileStats(profileId);
        
    } catch (error) {
        console.error('Error toggling save:', error);
        alert('Failed to save/unsave profile');
    }
};

async function updateProfileStats(profileId) {
    // Get updated counts
    const savedCount = await getSavedCount(profileId);
    const savesCount = await getSavesCount(profileId);
    
    // Update the displayed numbers
    const savedStat = document.querySelector('.stat-item.clickable .stat-number');
    const savesStat = document.querySelectorAll('.stat-item.clickable')[1]?.querySelector('.stat-number');
    
    if (savedStat) savedStat.textContent = savedCount;
    if (savesStat) savesStat.textContent = savesCount;
}

// ========== GLIGHTBOX GALLERY ==========
window.openPhotoSwipe = function(index) {
    // Find all portfolio images on the page
    const portfolioItems = document.querySelectorAll('.portfolio-item img');
    const images = [];
    
    portfolioItems.forEach((img, i) => {
        // Get high-quality image URL (remove transformation params)
        let imgUrl = img.src;
        if (imgUrl.includes('?tr=')) {
            imgUrl = imgUrl.split('?tr=')[0];
        }
        
        images.push({
            href: imgUrl,
            title: `Portfolio image ${i + 1}`,
            type: 'image'
        });
    });
    
    if (images.length === 0) return;
    
    // Initialize GLightbox with the images starting at clicked index
    const lightbox = GLightbox({
        elements: images,
        startAt: index,
        loop: true,
        touchNavigation: true,
        autoplayVideos: false,
        plyr: {
            css: false,
            js: false
        },
        closeButton: true,
        closeOnOutsideClick: true,
        zoomable: true,
        draggable: true,
        slideEffect: 'fade',
        moreText: 'See more',
        moreLength: 60,
        descPosition: 'bottom',
        openEffect: 'fade',
        closeEffect: 'fade',
        cssEfects: {
            fade: { in: 'fadeIn', out: 'fadeOut' },
            zoom: { in: 'zoomIn', out: 'zoomOut' }
        },
        // Custom styles for minimalist grayscale
        onOpen: function() {
            document.body.style.overflow = 'hidden';
        },
        onClose: function() {
            document.body.style.overflow = '';
        }
    });
    
    lightbox.open();
};

// Add minimalist CSS for GLightbox (injected via JS to match your dark/light mode)
const style = document.createElement('style');
style.textContent = `
    .glightbox-container .gclose,
    .glightbox-container .gprev,
    .glightbox-container .gnext,
    .glightbox-container .gcounter {
        background: rgba(0, 0, 0, 0.3) !important;
        color: #999 !important;
        border-radius: 50% !important;
        filter: grayscale(100%);
        transition: opacity 0.3s;
    }
    .glightbox-container .gclose:hover,
    .glightbox-container .gprev:hover,
    .glightbox-container .gnext:hover {
        opacity: 0.8;
    }
    .glightbox-container .gslide-description {
        background: linear-gradient(transparent, rgba(0,0,0,0.7)) !important;
    }
    .glightbox-container .gslide-title {
        color: #999 !important;
        font-size: 14px !important;
        font-weight: normal !important;
        text-align: center !important;
    }
    .glightbox-container .gslide-inner-content {
        background: transparent !important;
    }
    .glightbox-mobile .glightbox-container .gslide-media {
        margin-top: 0 !important;
    }
`;
document.head.appendChild(style);

// ========== SAVED/SAVES MODALS ==========
window.openSavedModal = async function() {
    const currentUserId = firebase.auth().currentUser.uid;
    
    try {
        // Get all profiles that current user has saved
        const savesSnapshot = await firebase.firestore()
            .collection('saves')
            .where('saverId', '==', currentUserId)
            .orderBy('timestamp', 'desc')
            .get();
        
        if (savesSnapshot.empty) {
            alert('You haven\'t saved any profiles yet');
            return;
        }
        
        // Get the saved user IDs
        const savedUserIds = [];
        savesSnapshot.forEach(doc => {
            savedUserIds.push(doc.data().savedUserId);
        });
        
        // Fetch all the user profiles
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-container';
        
        let html = `
            <div class="modal-header">
                <h2>Saved Profiles</h2>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-list">
        `;
        
        for (const userId of savedUserIds) {
            const userDoc = await firebase.firestore().collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                html += `
                    <div class="modal-item" onclick="viewProfileFromModal('${userId}')">
                        <img src="${userData.profileImage ? userData.profileImage + '?tr=w-50,h-50' : 'https://via.placeholder.com/50'}" class="modal-item-image">
                        <div class="modal-item-info">
                            <div class="modal-item-name">${userData.businessName || 'Business Name'}</div>
                            <div class="modal-item-rating">⭐ ${userData.rating || '0.0'}</div>
                        </div>
                        <button class="modal-unsave-btn" onclick="unsaveProfile(event, '${userId}')">Unsave</button>
                    </div>
                `;
            }
        }
        
        html += `</div>`;
        modalContent.innerHTML = html;
        
        // Add modal to page
        document.body.appendChild(modalContent);
        
    } catch (error) {
        console.error('Error opening saved modal:', error);
        alert('Failed to load saved profiles');
    }
};

window.openSavesModal = async function() {
    const currentUserId = firebase.auth().currentUser.uid;
    
    try {
        // Get all profiles that have saved current user
        const savesSnapshot = await firebase.firestore()
            .collection('saves')
            .where('savedUserId', '==', currentUserId)
            .orderBy('timestamp', 'desc')
            .get();
        
        if (savesSnapshot.empty) {
            alert('No one has saved your profile yet');
            return;
        }
        
        // Get the saver user IDs
        const saverUserIds = [];
        savesSnapshot.forEach(doc => {
            saverUserIds.push(doc.data().saverId);
        });
        
        // Fetch all the user profiles
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-container';
        
        let html = `
            <div class="modal-header">
                <h2>People who saved you</h2>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-list">
        `;
        
        for (const userId of saverUserIds) {
            const userDoc = await firebase.firestore().collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                html += `
                    <div class="modal-item" onclick="viewProfileFromModal('${userId}')">
                        <img src="${userData.profileImage ? userData.profileImage + '?tr=w-50,h-50' : 'https://via.placeholder.com/50'}" class="modal-item-image">
                        <div class="modal-item-info">
                            <div class="modal-item-name">${userData.businessName || 'Business Name'}</div>
                            <div class="modal-item-rating">⭐ ${userData.rating || '0.0'}</div>
                        </div>
                    </div>
                `;
            }
        }
        
        html += `</div>`;
        modalContent.innerHTML = html;
        
        // Add modal to page
        document.body.appendChild(modalContent);
        
    } catch (error) {
        console.error('Error opening saves modal:', error);
        alert('Failed to load saves');
    }
};

// Helper functions for modals
window.closeModal = function() {
    const modal = document.querySelector('.modal-container');
    if (modal) modal.remove();
};

window.viewProfileFromModal = function(userId) {
    closeModal();
    switchTab('profile');
    loadProfileTab(userId);
};

window.unsaveProfile = async function(event, savedUserId) {
    event.stopPropagation(); // Prevent triggering the parent click
    
    const currentUserId = firebase.auth().currentUser.uid;
    
    try {
        // Find and delete the save document
        const savesSnapshot = await firebase.firestore()
            .collection('saves')
            .where('saverId', '==', currentUserId)
            .where('savedUserId', '==', savedUserId)
            .get();
        
        savesSnapshot.forEach(doc => doc.ref.delete());
        
        // Refresh the modal
        closeModal();
        window.openSavedModal();
        
        // Update stats if on profile page
        updateProfileStats(currentUserId);
        
    } catch (error) {
        console.error('Error unsaving:', error);
        alert('Failed to unsave profile');
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
    const currentUserId = firebase.auth().currentUser.uid;
    if (currentUserId === profileId) return;
    
    const btn = document.getElementById(`save-btn-${profileId}`);
    if (!btn) return;
    
    try {
        // Check if already saved
        const savesSnapshot = await firebase.firestore()
            .collection('saves')
            .where('saverId', '==', currentUserId)
            .where('savedUserId', '==', profileId)
            .get();
        
        if (!savesSnapshot.empty) {
            btn.textContent = 'Saved';
            btn.classList.add('saved');
        } else {
            btn.textContent = 'Save';
            btn.classList.remove('saved');
        }
    } catch (error) {
        console.error('Error checking save status:', error);
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
                // Store in localStorage as backup
                localStorage.setItem('userLocation', JSON.stringify(userLocation));
                initializeMap();
                loadNearbyProviders();
            },
            (error) => {
                console.error('Geolocation error:', error);
                // Try to get from localStorage first
                const savedLocation = localStorage.getItem('userLocation');
                if (savedLocation) {
                    userLocation = JSON.parse(savedLocation);
                } else {
                    // Default to Lagos if no saved location
                    userLocation = { lat: 6.5244, lng: 3.3792 };
                }
                initializeMap();
                loadNearbyProviders();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        // Try to get from localStorage
        const savedLocation = localStorage.getItem('userLocation');
        if (savedLocation) {
            userLocation = JSON.parse(savedLocation);
        } else {
            // Default to Lagos
            userLocation = { lat: 6.5244, lng: 3.3792 };
        }
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
        // Get all providers with locationGeo field
        const snapshot = await firebase.firestore().collection('users')
            .where('emailVerified', '==', true)
            .where('locationGeo', '!=', null)  // Only get users with location
            .get();
        
        searchProviders = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Skip if no locationGeo
            if (!data.locationGeo) return;
            
            // Calculate REAL distance using our helper function
            const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                data.locationGeo.latitude,
                data.locationGeo.longitude
            );
            
            // Only include if within radius
            if (distance <= currentRadius) {
                // Create location object for map marker
                const providerLocation = {
                    lat: data.locationGeo.latitude,
                    lng: data.locationGeo.longitude
                };
                
                searchProviders.push({
                    id: doc.id,
                    ...data,
                    distance: distance.toFixed(1), // Round to 1 decimal
                    location: providerLocation
                });
            }
        });
        
        // Sort by distance (closest first)
        searchProviders.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        
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
            <img src="${provider.profileImage ? provider.profileImage + '?tr=w-40,h-40' : 'https://via.placeholder.com/40'}" class="list-item-image">
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

// ========== MESSAGES TAB ==========
let conversationsListener = null;
let currentChatId = null;
let messagesListener = null;

function loadMessagesTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="messages-container">
            <div class="messages-header">
                <h1 class="messages-title">Messages</h1>
            </div>
            
            <div id="conversations-list" class="conversations-list">
                <!-- Conversations will load here -->
            </div>
            
            <div id="conversations-loading" class="conversations-loading">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    loadConversations();
    fixChatUserNames();
}

function loadConversations() {
    const userId = firebase.auth().currentUser.uid;
    const conversationsList = document.getElementById('conversations-list');
    const loadingEl = document.getElementById('conversations-loading');
    
    // Clear existing listener
    if (conversationsListener) {
        conversationsListener();
    }
    
    // Set up real-time listener
    conversationsListener = firebase.firestore()
        .collection('chats')
        .where('participants', 'array-contains', userId)
        .orderBy('lastMessageTimestamp', 'desc')
        .onSnapshot((snapshot) => {
            loadingEl.style.display = 'none';
            
            if (snapshot.empty) {
                // Empty state - no conversations
                conversationsList.innerHTML = `
                    <div class="empty-state-messages">
                        <div class="empty-icon">💬</div>
                        <h3>No Messages Yet</h3>
                        <p>When you message a provider, they'll appear here</p>
                        <button class="btn" onclick="switchTab('search')">Find Providers</button>
                    </div>
                `;
                return;
            }
            
            // Build conversations list
            let html = '';
            snapshot.forEach(doc => {
                const chat = doc.data();
                chat.id = doc.id;
                html += renderConversationItem(chat, userId);
            });
            
            conversationsList.innerHTML = html;
            
            // Add click handlers
            snapshot.forEach(doc => {
                const chatId = doc.id;
                const otherUserId = doc.data().participants.find(id => id !== userId);
                document.getElementById(`chat-${chatId}`)?.addEventListener('click', () => {
                    openChat(chatId, otherUserId, doc.data());
                });
            });
        });
}

function renderConversationItem(chat, currentUserId) {
    const otherUserId = chat.participants.find(id => id !== currentUserId);
    const lastMessage = chat.lastMessage || '';
    const lastMessageTime = chat.lastMessageTimestamp ? formatMessageTime(chat.lastMessageTimestamp.toDate()) : '';
    const unread = chat.lastMessageSender !== currentUserId && !chat.lastMessageRead;
    
    // Get other user's name from chat data or use placeholder
    let otherUserName = chat.otherUserName || 'Loading...';
    let otherUserImage = chat.otherUserImage || 'https://via.placeholder.com/40';
    
    // Determine tick status for list
    let statusIcon = '';
    if (chat.lastMessageSender === currentUserId) {
        statusIcon = chat.lastMessageRead ? '✓✓' : '✓';
    }
    
    return `
        <div id="chat-${chat.id}" class="conversation-item ${unread ? 'unread' : ''}">
            <img src="${otherUserImage}" class="conversation-image">
            <div class="conversation-info">
                <div class="conversation-header">
                    <span class="conversation-name">${otherUserName}</span>
                    <span class="conversation-time">${lastMessageTime}</span>
                </div>
                <div class="conversation-preview">
                    <span class="preview-text">${lastMessage || 'No messages yet'}</span>
                    ${statusIcon ? `<span class="message-status ${chat.lastMessageRead ? 'read' : ''}">${statusIcon}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

function formatMessageTime(date) {
    const now = new Date();
    const diff = now - date;
    const diffMinutes = Math.floor(diff / (1000 * 60));
    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d`;
}

function openChat(chatId, otherUserId, chatData) {
    currentChatId = chatId;
    
    // Get other user's info if not already in chatData
    let otherUserName = 'Loading...';
    if (chatData.businessName) {
        otherUserName = chatData.businessName;
    } else {
        // Fetch user data
        firebase.firestore().collection('users').doc(otherUserId).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                otherUserName = userData.businessName || 'User';
                // Update the header
                const headerName = document.querySelector('.chat-header-name');
                if (headerName) headerName.textContent = otherUserName;
            }
        });
    }
    
    const container = document.getElementById('tab-content');
    
    container.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <button class="chat-back-btn" onclick="loadMessagesTab()">←</button>
                <img src="https://via.placeholder.com/32" class="chat-header-image">
                <span class="chat-header-name">${otherUserName}</span>
            </div>
            
            <div id="chat-messages" class="chat-messages">
                <!-- Messages will load here -->
            </div>
            
            <div class="chat-input-container">
                <input type="text" id="chat-input" class="chat-input" placeholder="Type a message...">
                <button class="chat-send-btn" onclick="sendMessage()">Send</button>
            </div>
        </div>
    `;
    
    loadMessages(chatId);
}

function loadMessages(chatId) {
    const messagesContainer = document.getElementById('chat-messages');
    const currentUserId = firebase.auth().currentUser.uid;
    
    // Clear existing listener
    if (messagesListener) {
        messagesListener();
    }
    
    // Set up real-time listener
    messagesListener = firebase.firestore()
        .collection('chats').doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                // Empty state - no messages
                messagesContainer.innerHTML = `
                    <div class="empty-state-chat">
                        <div class="empty-icon">💭</div>
                        <p>No messages yet</p>
                        <p class="empty-hint">Send a message to start the conversation</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            let lastDate = null;
            
            snapshot.forEach(doc => {
                const msg = doc.data();
                msg.id = doc.id;
                
                // Add date separator if needed
                const msgDate = msg.timestamp?.toDate().toLocaleDateString();
                if (msgDate !== lastDate) {
                    html += `<div class="chat-date-separator">${msg.timestamp?.toDate().toLocaleDateString()}</div>`;
                    lastDate = msgDate;
                }
                
                // Add message
                html += renderMessage(msg, currentUserId);
                
                // Mark as read if this message was sent to current user
                if (msg.senderId !== currentUserId && !msg.read) {
                    markMessageAsRead(chatId, msg.id);
                }
            });
            
            messagesContainer.innerHTML = html;
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
}

function renderMessage(msg, currentUserId) {
    const isMine = msg.senderId === currentUserId;
    const time = msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const status = isMine ? (msg.read ? '✓✓' : '✓') : '';
    
    return `
        <div class="message-row ${isMine ? 'mine' : 'theirs'}">
            <div class="message-bubble ${isMine ? 'mine' : 'theirs'}">
                <div class="message-text">${msg.text}</div>
                <div class="message-meta">
                    <span class="message-time">${time}</span>
                    ${isMine ? `<span class="message-status ${msg.read ? 'read' : ''}">${status}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

window.sendMessage = async function() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    
    if (!text || !currentChatId) return;
    
    input.value = '';
    
    const currentUserId = firebase.auth().currentUser.uid;
    const chatRef = firebase.firestore().collection('chats').doc(currentChatId);
    const messagesRef = chatRef.collection('messages');
    
    try {
        // Add message
        await messagesRef.add({
            senderId: currentUserId,
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
        // Update chat last message
        await chatRef.update({
            lastMessage: text,
            lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageSender: currentUserId,
            lastMessageRead: false
        });
        
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
    }
};

async function markMessageAsRead(chatId, messageId) {
    try {
        await firebase.firestore()
            .collection('chats').doc(chatId)
            .collection('messages').doc(messageId)
            .update({ read: true });
        
        // Check if all messages are read to update chat status
        const chatRef = firebase.firestore().collection('chats').doc(chatId);
        const messagesSnapshot = await chatRef.collection('messages')
            .where('senderId', '!=', firebase.auth().currentUser.uid)
            .where('read', '==', false)
            .get();
        
        if (messagesSnapshot.empty) {
            await chatRef.update({ lastMessageRead: true });
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

// Clean up listeners when switching tabs
window.addEventListener('tabChange', () => {
    if (conversationsListener) {
        conversationsListener();
        conversationsListener = null;
    }
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }
});

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
            loadMessagesTab();
            break;
        case 'profile':
            loadProfileTab();
            break;
            case 'admin':
            loadAdminTab();
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
    location: null,
    locationGeo: null  // Add this line for geolocation
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

// Logout function
window.logout = function() {
    firebase.auth().signOut();
};

// Delete account function
window.deleteAccount = function() {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
        const user = firebase.auth().currentUser;
        user.delete().catch(error => {
            alert('Error: ' + error.message);
        });
    }
}

// ========== ADMIN TAB ==========
let adminCurrentTab = 'dashboard';

async function loadAdminTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;
    
    // Check if current user is admin
    const currentUserEmail = firebase.auth().currentUser?.email;
    if (currentUserEmail !== 'agboghidiaugust@gmail.com') {
        container.innerHTML = `
            <div class="admin-unauthorized">
                <div class="unauthorized-icon">🔒</div>
                <h2>Access Denied</h2>
                <p>You don't have permission to view this page.</p>
                <button class="btn" onclick="switchTab('home')">Go Home</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="admin-container">
            <div class="admin-header">
                <h1 class="admin-title">Admin Panel</h1>
            </div>
            
            <div class="admin-subtabs">
                <button class="admin-subtab ${adminCurrentTab === 'dashboard' ? 'active' : ''}" onclick="switchAdminTab('dashboard')">
                    📊 Dashboard
                </button>
                <button class="admin-subtab ${adminCurrentTab === 'users' ? 'active' : ''}" onclick="switchAdminTab('users')">
                    👥 Users
                </button>
                <button class="admin-subtab ${adminCurrentTab === 'approvals' ? 'active' : ''}" onclick="switchAdminTab('approvals')">
                    ⏳ Approvals
                </button>
            </div>
            
            <div id="admin-content" class="admin-content">
                <!-- Content will load here -->
            </div>
        </div>
    `;
    
    // Load default tab
    switchAdminTab(adminCurrentTab);
}

window.switchAdminTab = function(tab) {
    adminCurrentTab = tab;
    
    // Update subtab active states
    document.querySelectorAll('.admin-subtab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(tab === 'dashboard' ? '📊' : 
                                      tab === 'users' ? '👥' : '⏳')) {
            btn.classList.add('active');
        }
    });
    
    // Load appropriate content
    switch(tab) {
        case 'dashboard':
            loadAdminDashboard();
            break;
        case 'users':
            loadAdminUsers();
            break;
        case 'approvals':
            loadAdminApprovals();
            break;
    }
};

async function loadAdminDashboard() {
    const container = document.getElementById('admin-content');
    if (!container) return;
    
    container.innerHTML = '<div class="admin-loading"><div class="spinner"></div></div>';
    
    try {
        // Get total users count
        const usersSnapshot = await firebase.firestore().collection('users').get();
        const totalUsers = usersSnapshot.size;
        
        // Get users joined this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentUsers = usersSnapshot.docs.filter(doc => {
            const createdAt = doc.data().createdAt?.toDate();
            return createdAt && createdAt > oneWeekAgo;
        }).length;
        
        // Get pending services count
        const pendingServices = usersSnapshot.docs.filter(doc => {
            return doc.data().pendingServices?.length > 0;
        }).length;
        
        // Get total portfolio images
        let totalImages = 0;
        usersSnapshot.docs.forEach(doc => {
            totalImages += doc.data().portfolioImages?.length || 0;
        });
        
        // Get recent sign-ups (last 5)
        const recentSignups = usersSnapshot.docs
            .filter(doc => doc.data().createdAt)
            .sort((a, b) => {
                return b.data().createdAt - a.data().createdAt;
            })
            .slice(0, 5);
        
        container.innerHTML = `
            <div class="admin-dashboard">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${totalUsers}</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${recentUsers}</div>
                        <div class="stat-label">Joined This Week</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${pendingServices}</div>
                        <div class="stat-label">Pending Approvals</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${totalImages}</div>
                        <div class="stat-label">Portfolio Images</div>
                    </div>
                </div>
                
                <div class="recent-section">
                    <h3 class="section-title">Recent Sign-ups</h3>
                    <div class="recent-list">
                        ${recentSignups.map(doc => {
                            const data = doc.data();
                            const date = data.createdAt?.toDate().toLocaleDateString() || 'Unknown';
                            return `
                                <div class="recent-item" onclick="viewUserProfile('${doc.id}')">
                                    <img src="${data.profileImage ? data.profileImage + '?tr=w-40,h-40' : 'https://via.placeholder.com/40'}" class="recent-image">
                                    <div class="recent-info">
                                        <div class="recent-name">${data.businessName || 'Unnamed'}</div>
                                        <div class="recent-meta">Joined: ${date}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        container.innerHTML = '<div class="error-state">Error loading dashboard</div>';
    }
}

async function loadAdminUsers() {
    const container = document.getElementById('admin-content');
    if (!container) return;
    
    container.innerHTML = '<div class="admin-loading"><div class="spinner"></div></div>';
    
    try {
        const usersSnapshot = await firebase.firestore().collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => {
            return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
        });
        
        container.innerHTML = `
            <div class="admin-users">
                <div class="users-search">
                    <input type="text" id="user-search" class="search-input" placeholder="Search by business name or email...">
                </div>
                <div class="users-list" id="users-list">
                    ${renderUserList(users)}
                </div>
            </div>
        `;
        
        // Add search functionality
        document.getElementById('user-search').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = users.filter(user => 
                (user.businessName?.toLowerCase().includes(searchTerm) ||
                 user.email?.toLowerCase().includes(searchTerm))
            );
            document.getElementById('users-list').innerHTML = renderUserList(filtered);
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<div class="error-state">Error loading users</div>';
    }
}

function renderUserList(users) {
    if (users.length === 0) {
        return '<div class="empty-list">No users found</div>';
    }
    
    return users.map(user => {
        const joinDate = user.createdAt?.toDate().toLocaleDateString() || 'Unknown';
        const imageCount = user.portfolioImages?.length || 0;
        const hasPending = user.pendingServices?.length > 0;
        
        return `
            <div class="user-item" onclick="viewUserProfile('${user.id}')">
                <img src="${user.profileImage ? user.profileImage + '?tr=w-50,h-50' : 'https://via.placeholder.com/50'}" class="user-item-image">
                <div class="user-item-info">
                    <div class="user-item-header">
                        <span class="user-item-name">${user.businessName || 'Unnamed'}</span>
                        ${hasPending ? '<span class="pending-badge">pending</span>' : ''}
                    </div>
                    <div class="user-item-email">${user.email || 'No email'}</div>
                    <div class="user-item-meta">
                        <span>📷 ${imageCount} images</span>
                        <span>• Joined: ${joinDate}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadAdminApprovals() {
    const container = document.getElementById('admin-content');
    if (!container) return;
    
    container.innerHTML = '<div class="admin-loading"><div class="spinner"></div></div>';
    
    try {
        const usersSnapshot = await firebase.firestore().collection('users').get();
        const usersWithPending = usersSnapshot.docs
            .filter(doc => doc.data().pendingServices?.length > 0)
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        
        if (usersWithPending.length === 0) {
            container.innerHTML = '<div class="empty-approvals">No pending approvals</div>';
            return;
        }
        
        container.innerHTML = `
            <div class="admin-approvals">
                ${usersWithPending.map(user => `
                    <div class="approval-item" id="approval-${user.id}">
                        <div class="approval-header">
                            <img src="${user.profileImage ? user.profileImage + '?tr=w-40,h-40' : 'https://via.placeholder.com/40'}" class="approval-image">
                            <div class="approval-user">
                                <div class="approval-name">${user.businessName || 'Unnamed'}</div>
                                <div class="approval-email">${user.email}</div>
                            </div>
                        </div>
                        <div class="pending-services">
                            ${user.pendingServices.map(service => `
                                <div class="pending-service-item" id="service-${user.id}-${service.replace(/\s+/g, '-')}">
                                    <span class="service-name">${service}</span>
                                    <div class="service-actions">
                                        <button class="btn-small approve-btn" onclick="approveService('${user.id}', '${service.replace(/'/g, "\\'")}')">Approve</button>
                                        <button class="btn-small edit-btn" onclick="editService('${user.id}', '${service.replace(/'/g, "\\'")}')">Edit</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading approvals:', error);
        container.innerHTML = '<div class="error-state">Error loading approvals</div>';
    }
}

// Admin action functions
window.approveService = async function(userId, service) {
    try {
        const userRef = firebase.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        // Remove from pending, add to services
        const updatedPending = userData.pendingServices.filter(s => s !== service);
        const updatedServices = [...(userData.services || []), service];
        
        await userRef.update({
            pendingServices: updatedPending,
            services: updatedServices
        });
        
        // Send notification via chat
        await sendAdminNotification(userId, `Your service "${service}" has been approved!`);
        
        // Remove from UI
        const serviceElement = document.getElementById(`service-${userId}-${service.replace(/\s+/g, '-')}`);
        if (serviceElement) {
            serviceElement.remove();
        }
        
        // Check if no more pending for this user
        const approvalItem = document.getElementById(`approval-${userId}`);
        if (approvalItem && !approvalItem.querySelector('.pending-service-item')) {
            approvalItem.remove();
        }
        
        // Show empty state if no approvals left
        const approvalsContainer = document.querySelector('.admin-approvals');
        if (approvalsContainer && !approvalsContainer.querySelector('.approval-item')) {
            document.getElementById('admin-content').innerHTML = '<div class="empty-approvals">No pending approvals</div>';
        }
        
        showToast('Service approved!');
    } catch (error) {
        console.error('Error approving service:', error);
        alert('Failed to approve service');
    }
};

window.editService = async function(userId, service) {
    const newService = prompt('Edit service name:', service);
    if (!newService || newService === service) return;
    
    try {
        const userRef = firebase.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        // Replace in pending
        const updatedPending = userData.pendingServices.map(s => s === service ? newService : s);
        
        await userRef.update({
            pendingServices: updatedPending
        });
        
        // Update UI
        const serviceElement = document.getElementById(`service-${userId}-${service.replace(/\s+/g, '-')}`);
        if (serviceElement) {
            const serviceNameSpan = serviceElement.querySelector('.service-name');
            if (serviceNameSpan) {
                serviceNameSpan.textContent = newService;
            }
            serviceElement.id = `service-${userId}-${newService.replace(/\s+/g, '-')}`;
            
            // Update button onclick
            const approveBtn = serviceElement.querySelector('.approve-btn');
            const editBtn = serviceElement.querySelector('.edit-btn');
            if (approveBtn) {
                approveBtn.setAttribute('onclick', `approveService('${userId}', '${newService.replace(/'/g, "\\'")}')`);
            }
            if (editBtn) {
                editBtn.setAttribute('onclick', `editService('${userId}', '${newService.replace(/'/g, "\\'")}')`);
            }
        }
        
        showToast('Service updated');
    } catch (error) {
        console.error('Error editing service:', error);
        alert('Failed to edit service');
    }
};

// Helper function to send admin notifications
async function sendAdminNotification(userId, message) {
    const adminId = firebase.auth().currentUser.uid;
    
    try {
        // Check if chat already exists
        const chatsSnapshot = await firebase.firestore()
            .collection('chats')
            .where('participants', 'array-contains', adminId)
            .get();
        
        let existingChatId = null;
        chatsSnapshot.forEach(doc => {
            const chat = doc.data();
            if (chat.participants.includes(userId)) {
                existingChatId = doc.id;
            }
        });
        
        if (existingChatId) {
            // Send message to existing chat
            await firebase.firestore()
                .collection('chats').doc(existingChatId)
                .collection('messages')
                .add({
                    senderId: adminId,
                    text: message,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false
                });
                
            await firebase.firestore().collection('chats').doc(existingChatId).update({
                lastMessage: message,
                lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageSender: adminId,
                lastMessageRead: false
            });
        } else {
            // Create new chat
            const newChatRef = await firebase.firestore().collection('chats').add({
                participants: [adminId, userId],
                otherUserName: 'Admin',
                otherUserImage: 'https://via.placeholder.com/40',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: message,
                lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageSender: adminId,
                lastMessageRead: false
            });
            
            // Send message
            await newChatRef.collection('messages').add({
                senderId: adminId,
                text: message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
        }
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

// Helper function to view user profile from admin
window.viewUserProfile = function(userId) {
    switchTab('profile');
    loadProfileTab(userId);
};
    
