// app.js - Complete with all 10 cost-saving fixes

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
firebase.firestore().settings({
    experimentalForceLongPolling: true,
    useFetchStreams: false
});
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Initialize ImageKit
var imagekit = new ImageKit({
    publicKey: "public_t2gpKmHQ/9binh9kNSsQBq0zsys=",
    urlEndpoint: "https://ik.imagekit.io/GigsCourt"
});

// Initialize GeoFirestore
const firestore = firebase.firestore();
const GeoFirestore = window.GeoFirestore;
const geofirestore = new GeoFirestore(firestore);

// Setup push notifications with FCM
async function setupNotifications(userId) {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            
            const token = await messaging.getToken({
                vapidKey: "BJRlkPoQeveLqWzxp3CxzpkO4__sXqaCaA8loG9KCpN0z7rlh8aYr3d_tav7LB0Ra3LG50m0EUyVokh66p_9TO4",
                serviceWorkerRegistration: registration
            });
            
            if (token) {
    // Visual confirmation
    const toast = document.createElement('div');
    toast.textContent = '✅ Notifications enabled!';
    toast.style.cssText = 'position:fixed;bottom:100px;left:20px;right:20px;background:#4CAF50;color:white;padding:12px;text-align:center;border-radius:8px;z-index:9999;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    
    await firebase.firestore().collection('users').doc(userId).update({
        fcmToken: token
    });
    console.log('FCM token saved:', token);
} else {
    // Visual error
    const toast = document.createElement('div');
    toast.textContent = '❌ Could not get notification token';
    toast.style.cssText = 'position:fixed;bottom:100px;left:20px;right:20px;background:#FF0000;color:white;padding:12px;text-align:center;border-radius:8px;z-index:9999;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
        }
    } catch (error) {
        console.log('Notification setup failed:', error);
    }
}

// Global state
let currentUser = null;
let currentUserData = null;
let providers = [];
let lastDoc = null;
let loading = false;
let hasMore = true;
let userLocation = null;
let searchLastDoc = null;
let searchHasMore = true;
let searchLoading = false;
let searchCache = null;
let searchCacheTime = null;
const CACHE_DURATION = 30 * 60 * 1000; // FIX #9: Increased to 30 minutes
let pullToRefresh = {
    startY: 0,
    currentY: 0,
    refreshing: false,
    pulling: false
};

// Home pagination - FIX #2: Load More button instead of infinite scroll
let homeCurrentPage = 1;
let homeTotalLoaded = 0;
const HOME_PAGE_SIZE = 10;

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Auth state listener
firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;
    const app = document.getElementById('app');
    
    if (user) {
        if (user.emailVerified) {
            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    currentUserData = userDoc.data();
                    setupNotifications(user.uid);
                    loadMainApp();
                } else {
                    window.location.hash = 'complete-profile';
                    loadProfileCompletion();
                }
            } catch (error) {
                console.error('Error fetching user document:', error);
                alert('Error loading your profile. Please try again.');
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
            locationGeo: null,
            savedProfiles: {} // FIX #7: Store saved profiles as map on user document
        });
        
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
            
            <div id="load-more-container" style="text-align: center; margin: 20px;">
                <button id="load-more-btn" class="btn" style="display: none;" onclick="loadMoreProviders()">Load More</button>
            </div>
            
            <div id="loading-spinner" class="loading-spinner hidden">
                <div class="spinner"></div>
            </div>
            
            <div id="empty-state" class="empty-state hidden">
                <p>No providers found nearby</p>
            </div>
        </div>
    `;
    
    homeCurrentPage = 1;
    homeTotalLoaded = 0;
    providers = [];
    lastDoc = null;
    hasMore = true;
    
    loadProviders(true);
    setupPullToRefresh();

}

// Call it after home tab loads

// FIX #2: Load providers with explicit Load More button
async function loadProviders(reset = true) {
    if (loading) return;
    loading = true;
    
    if (reset) {
        providers = [];
        lastDoc = null;
        hasMore = true;
        homeTotalLoaded = 0;
        document.getElementById('providers-grid').innerHTML = '';
        document.getElementById('load-more-btn').style.display = 'none';
    }
    
    if (!hasMore) {
        loading = false;
        if (homeTotalLoaded > 0) {
            document.getElementById('load-more-btn').style.display = 'none';
        }
        return;
    }
    
    document.getElementById('loading-spinner')?.classList.remove('hidden');
    
    try {
        let userLat = 6.5244;
        let userLng = 3.3792;
        
        if (window.userLocation) {
            userLat = window.userLocation.lat;
            userLng = window.userLocation.lng;
        } else {
            const savedLocation = localStorage.getItem('userLocation');
            if (savedLocation) {
                const loc = JSON.parse(savedLocation);
                userLat = loc.lat;
                userLng = loc.lng;
            }
        }
        
        let query = firebase.firestore().collection('users')
            .where('emailVerified', '==', true)
            .where('locationGeo', '!=', null)
            .limit(HOME_PAGE_SIZE);
        
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            hasMore = false;
            if (providers.length === 0) {
                document.getElementById('empty-state').classList.remove('hidden');
            }
            document.getElementById('load-more-btn').style.display = 'none';
        } else {
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                let distance = 999;
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
            
            providers.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
            
            renderProviders();
            homeTotalLoaded += snapshot.docs.length;
            
            if (snapshot.docs.length === HOME_PAGE_SIZE) {
                document.getElementById('load-more-btn').style.display = 'block';
            } else {
                hasMore = false;
                document.getElementById('load-more-btn').style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('Error loading providers:', error);
    }
    
    document.getElementById('loading-spinner')?.classList.add('hidden');
    loading = false;
}

window.loadMoreProviders = function() {
    if (!loading && hasMore) {
        loadProviders(false);
    }
};

function renderProviders() {
    const grid = document.getElementById('providers-grid');
    if (!grid) return;
    
    providers.forEach(provider => {
        if (document.getElementById(`provider-${provider.id}`)) return;
        
        const card = document.createElement('div');
        card.id = `provider-${provider.id}`;
        card.className = 'provider-card';
        card.onclick = () => openQuickView(provider);
        
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
    
    providers = [];
    lastDoc = null;
    hasMore = true;
    homeTotalLoaded = 0;
    document.getElementById('providers-grid').innerHTML = '';
    await loadProviders(true);
    
    setTimeout(resetPullToRefresh, 500);
}

function resetPullToRefresh() {
    const indicator = document.getElementById('pull-to-refresh-indicator');
    indicator.style.transform = '';
    indicator.classList.remove('refreshing');
    indicator.querySelector('.ptr-text').textContent = 'Pull to refresh';
    indicator.querySelector('.ptr-spinner').style.transform = '';
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

window.viewProfile = (id) => {
    switchTab('profile');
    loadProfileTab(id);
};

window.messageUser = (id) => {
    switchTab('messages');
    setTimeout(() => {
        createNewChat(id);
    }, 500);
};

async function createNewChat(otherUserId) {
    const currentUserId = firebase.auth().currentUser.uid;
    
    try {
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
            const chatData = (await firebase.firestore().collection('chats').doc(existingChatId).get()).data();
            openChat(existingChatId, otherUserId, chatData);
        } else {
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
            
            if (!chat.otherUserName) {
                const userDoc = await firebase.firestore().collection('users').doc(otherUserId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    await doc.ref.update({
                        otherUserName: userData.businessName || 'User',
                        otherUserImage: userData.profileImage || 'https://via.placeholder.com/40'
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error fixing chats:', error);
    }
}

window.getDirections = (id) => alert('Directions coming soon');
window.showOnMap = (id) => alert('Map view coming soon');

// ========== JOB & REVIEW FUNCTIONS ==========
// FIX #6: Incremental rating update instead of reading all reviews

window.registerJob = async function(clientId) {
    const providerId = firebase.auth().currentUser.uid;
    const providerData = currentUserData;
    const JOB_COST = 3;
    
    if (!providerData.points || providerData.points < JOB_COST) {
        alert('Not enough points. You need 3 points to register a job.');
        return;
    }
    
    try {
        const jobRef = await firebase.firestore().collection('jobs').add({
            providerId: providerId,
            clientId: clientId,
            status: 'pending',
            pointsSpent: JOB_COST,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            completedAt: null
        });
        
        await firebase.firestore().collection('users').doc(providerId).update({
            points: firebase.firestore.FieldValue.increment(-JOB_COST)
        });
        
        alert('Job registered successfully! Waiting for client confirmation.');
        
    } catch (error) {
        console.error('Error registering job:', error);
        alert('Failed to register job');
    }
};

window.confirmJobCompletion = async function(jobId, providerId) {
    try {
        await firebase.firestore().collection('jobs').doc(jobId).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showReviewModal(providerId, jobId);
        
    } catch (error) {
        console.error('Error confirming job:', error);
        alert('Failed to confirm job');
    }
};

function showReviewModal(providerId, jobId) {
    const modal = document.createElement('div');
    modal.className = 'review-modal';
    let scrollableContainer = document.querySelector('.home-container, .profile-container, .search-container, .chat-messages');
    if (scrollableContainer) {
        scrollableContainer.style.overflow = 'hidden';
    }
    modal.innerHTML = `
        <div class="review-modal-content">
            <div class="review-modal-header">
                <h3>Rate this provider</h3>
              <button class="close-btn" onclick="(function(b){let c=b.closest('.review-modal'); if(c)c.remove(); let s=document.querySelector('.home-container, .profile-container, .search-container, .chat-messages'); if(s)s.style.overflow='';})(this)">✕</button>
            </div>
            <div class="review-modal-body">
                <p>How was your experience?</p>
                
                <div class="star-rating">
                    <span class="star" data-rating="1">★</span>
                    <span class="star" data-rating="2">★</span>
                    <span class="star" data-rating="3">★</span>
                    <span class="star" data-rating="4">★</span>
                    <span class="star" data-rating="5">★</span>
                </div>
                
                <textarea id="review-text" class="review-textarea" placeholder="Write your review (required)" rows="4"></textarea>
                
                <button class="btn submit-review-btn" onclick="submitReview('${providerId}', '${jobId}')">Submit Review</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const stars = modal.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.dataset.rating;
            
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.style.color = '#FFD700';
                } else {
                    s.style.color = '#999';
                }
            });
            
            modal.dataset.selectedRating = rating;
        });
    });
}

// FIX #6: Incremental rating update
window.submitReview = async function(providerId, jobId) {
    const modal = document.querySelector('.review-modal');
    const rating = modal.dataset.selectedRating;
    const reviewText = document.getElementById('review-text').value.trim();
    const clientId = firebase.auth().currentUser.uid;
    const clientData = currentUserData;
    
    if (!rating) {
        alert('Please select a rating');
        return;
    }
    
    if (!reviewText) {
        alert('Please write a review');
        return;
    }
    
    try {
        const existingReviewQuery = await firebase.firestore()
            .collection('reviews')
            .where('providerId', '==', providerId)
            .where('clientId', '==', clientId)
            .get();
        
        if (existingReviewQuery.empty) {
            await firebase.firestore().collection('reviews').add({
                providerId: providerId,
                clientId: clientId,
                clientBusinessName: clientData.businessName,
                clientProfileImage: clientData.profileImage || '',
                rating: parseInt(rating),
                reviewText: reviewText,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                jobsTogether: 1,
                lastJobId: jobId
            });
        } else {
            const reviewDoc = existingReviewQuery.docs[0];
            await reviewDoc.ref.update({
                rating: parseInt(rating),
                reviewText: reviewText,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                jobsTogether: firebase.firestore.FieldValue.increment(1),
                lastJobId: jobId
            });
        }
        
        // FIX #6: Incremental rating update without reading all reviews
        const providerRef = firebase.firestore().collection('users').doc(providerId);
        const providerDoc = await providerRef.get();
        const provider = providerDoc.data();
        
        let newRating;
        let newReviewCount;
        
        if (existingReviewQuery.empty) {
            // New review - incremental calculation
            const oldTotal = (provider.rating || 0) * (provider.reviewCount || 0);
            const newTotal = oldTotal + parseInt(rating);
            newReviewCount = (provider.reviewCount || 0) + 1;
            newRating = newTotal / newReviewCount;
        } else {
            // Updating existing review - need to adjust
            const oldReview = existingReviewQuery.docs[0].data();
            const oldRatingValue = oldReview.rating;
            const oldTotal = (provider.rating || 0) * (provider.reviewCount || 0);
            const newTotal = oldTotal - oldRatingValue + parseInt(rating);
            newRating = newTotal / (provider.reviewCount || 0);
            newReviewCount = provider.reviewCount;
        }
        
        await providerRef.update({
            rating: parseFloat(newRating.toFixed(1)),
            reviewCount: newReviewCount,
            jobsDone: firebase.firestore.FieldValue.increment(1),
            jobsThisMonth: firebase.firestore.FieldValue.increment(1)
        });
        
        modal.remove();
        let scrollableContainer = document.querySelector('.home-container, .profile-container, .search-container, .chat-messages');
        if (scrollableContainer) {
            scrollableContainer.style.overflow = '';
        }
        alert('Review submitted! Thank you.');
        
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Failed to submit review');
    }
};

window.showRegisterJobModal = async function() {
    const providerId = firebase.auth().currentUser.uid;
    
    try {
        const chatsSnapshot = await firebase.firestore()
            .collection('chats')
            .where('participants', 'array-contains', providerId)
            .orderBy('lastMessageTimestamp', 'desc')
            .limit(20)
            .get();
        
        let clientsHtml = '';
        
        chatsSnapshot.forEach(doc => {
            const chat = doc.data();
            const otherUserId = chat.participants.find(id => id !== providerId);
            const otherUserName = chat.otherUserName || 'User';
            const otherUserImage = chat.otherUserImage || 'https://via.placeholder.com/40';
            
            clientsHtml += `
                <div class="client-item" onclick="selectClient('${otherUserId}', '${otherUserName}')">
                    <img src="${otherUserImage}" class="client-item-image">
                    <div class="client-item-name">${otherUserName}</div>
                </div>
            `;
        });
        
        const modal = document.createElement('div');
        modal.className = 'register-job-modal';
        modal.innerHTML = `
            <div class="register-job-modal-content">
                <div class="register-job-modal-header">
                    <h3>Register New Job</h3>
                    <button class="close-btn" onclick="this.closest('.register-job-modal').remove()">✕</button>
                </div>
                <div class="register-job-modal-body">
                    <p>Select a client to register a job with:</p>
                    <p class="points-info">This will cost 3 points (You have ${currentUserData?.points || 0} points)</p>
                    <div class="clients-list">
                        ${clientsHtml || '<div class="no-clients">No recent chats. Start a conversation first.</div>'}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error loading chats:', error);
        alert('Failed to load clients');
    }
};

window.selectClient = async function(clientId, clientName) {
    if (!confirm(`Register gig with ${clientName} for 3 points?`)) return;
    
    const providerId = firebase.auth().currentUser.uid;
    const providerData = currentUserData;
    
    try {
        const gigRef = await firebase.firestore().collection('jobs').add({
            providerId: providerId,
            providerName: providerData.businessName,
            clientId: clientId,
            status: 'pending',
            pointsSpent: 3,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            completedAt: null,
            notifiedClient: false
        });
        
        await firebase.firestore().collection('users').doc(providerId).update({
            points: firebase.firestore.FieldValue.increment(-3)
        });
        
        document.querySelector('.register-job-modal').remove();
        alert('Gig registered! Waiting for client confirmation.');
        
    } catch (error) {
        console.error('Error registering gig:', error);
        alert('Failed to register gig');
    }
};

// ========== REVIEWS DISPLAY ==========
window.showProviderReviews = async function(providerId) {
    try {
        const providerDoc = await firebase.firestore().collection('users').doc(providerId).get();
        const provider = providerDoc.data();
        
        const reviewsSnapshot = await firebase.firestore()
            .collection('reviews')
            .where('providerId', '==', providerId)
            .orderBy('updatedAt', 'desc')
            .get();
        
        const modal = document.createElement('div');
        modal.className = 'reviews-modal';
        let scrollableContainer = document.querySelector('.home-container, .profile-container, .search-container, .chat-messages');
        if (scrollableContainer) {
            scrollableContainer.style.overflow = 'hidden';
        }
        
        let reviewsHtml = '';
        
        if (reviewsSnapshot.empty) {
            reviewsHtml = '<div class="no-reviews">No reviews yet</div>';
        } else {
            reviewsSnapshot.forEach(doc => {
                const review = doc.data();
                const date = review.updatedAt?.toDate().toLocaleDateString() || 'Unknown';
                
                let starsHtml = '';
                for (let i = 1; i <= 5; i++) {
                    starsHtml += i <= review.rating ? '★' : '☆';
                }
                
                reviewsHtml += `
                    <div class="review-item">
                        <div class="review-header">
                            <img src="${review.clientProfileImage || 'https://via.placeholder.com/40'}" class="review-profile-img">
                            <div class="review-business-name">${review.clientBusinessName || 'Anonymous'}</div>
                            <div class="review-stars">${starsHtml}</div>
                        </div>
                        <div class="review-text">"${review.reviewText}"</div>
                        <div class="review-meta">${review.jobsTogether} completed gigs together • Updated ${date}</div>
                    </div>
                    <div class="review-divider"></div>
                `;
            });
        }
        
        modal.innerHTML = `
            <div class="reviews-modal-content">
                <div class="reviews-modal-header">
                    <h2>${provider.businessName || 'Provider'}</h2>
                    <button class="close-btn" onclick="(function(b){b.closest('.reviews-modal').remove(); document.body.style.overflow = '';})(this)">✕</button>
                </div>
                <div class="reviews-summary">
                    <div class="rating-big">${provider.rating || '0.0'}</div>
                    <div class="stars-big">${generateStarString(provider.rating || 0)}</div>
                    <div class="review-count-big">${provider.reviewCount || 0} reviews</div>
                </div>
                <div class="reviews-list">
                    ${reviewsHtml}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                let scrollableContainer = document.querySelector('.home-container, .profile-container, .search-container, .chat-messages');
                if (scrollableContainer) {
                    scrollableContainer.style.overflow = '';
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        alert('Failed to load reviews');
    }
};

function generateStarString(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += i <= rating ? '★' : '☆';
    }
    return stars;
}

window.getDirectionsToProvider = async function(providerId) {
    try {
        const providerDoc = await firebase.firestore().collection('users').doc(providerId).get();
        const provider = providerDoc.data();
        
        if (!provider.locationGeo) {
            alert('Provider has not set their location');
            return;
        }
        
        window.directionsTarget = {
            id: providerId,
            location: {
                lat: provider.locationGeo.latitude,
                lng: provider.locationGeo.longitude
            },
            name: provider.businessName
        };
        
        switchTab('search');
        
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkMapReady = setInterval(() => {
            attempts++;
            
            if (map && userLocation) {
                clearInterval(checkMapReady);
                showDirectionsToTarget();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkMapReady);
                alert('Map is taking too long to load. Please try again.');
            }
        }, 500);
        
    } catch (error) {
        alert('ERROR: ' + error.message);
    }
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
    
    if (routingControl) {
        map.removeControl(routingControl);
    }
    
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(userLocation.lat, userLocation.lng),
            L.latLng(target.location.lat, target.location.lng)
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: true,
        lineOptions: {
            styles: [{ color: '#0000FF', opacity: 0.8, weight: 5 }]
        },
        createMarker: function() { return null; }
    }).addTo(map);
    
    setTimeout(() => {
        map.fitBounds([
            [userLocation.lat, userLocation.lng],
            [target.location.lat, target.location.lng]
        ], { padding: [50, 50] });
    }, 500);
    
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
    
    loadHomeTab();
}

// ========== PROFILE TAB ==========
async function loadProfileTab(profileUserId = null) {
    const container = document.getElementById('tab-content');
    if (!container) return;
    
    const targetUserId = profileUserId || firebase.auth().currentUser.uid;
    const isOwnProfile = targetUserId === firebase.auth().currentUser.uid;
    
    try {
        const profileDoc = await firebase.firestore().collection('users').doc(targetUserId).get();
        if (!profileDoc.exists) {
            container.innerHTML = '<div class="error-state">Profile not found</div>';
            return;
        }
        
        const profile = profileDoc.data();
        profile.id = targetUserId;
        
        // FIX #7: Use savedProfiles map instead of separate query
        let savedCount = 0;
        let savesCount = 0;
        
        if (isOwnProfile) {
            savedCount = Object.keys(profile.savedProfiles || {}).length;
            
            const savesSnapshot = await firebase.firestore()
                .collection('users')
                .where(`savedProfiles.${targetUserId}`, '==', true)
                .get();
            savesCount = savesSnapshot.size;
        } else {
            const currentUserDoc = await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).get();
            savesCount = Object.keys(currentUserDoc.data()?.savedProfiles || {}).length;
            
            const savesSnapshot = await firebase.firestore()
                .collection('users')
                .where(`savedProfiles.${targetUserId}`, '==', true)
                .get();
            savedCount = savesSnapshot.size;
        }
        
        container.innerHTML = renderProfile(profile, savedCount, savesCount, isOwnProfile);
        
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
                        <span class="stat-label">Gigs</span>
                    </div>
                    <div class="stat-item clickable" onclick="showProviderReviews('${profile.id}')">
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

        ${isOwnProfile ? `
            <div class="profile-actions-header">
                <button class="register-job-btn" onclick="showRegisterJobModal()">Register Gig (3 pts)</button>
            </div>
        ` : ''}
        
        <div class="profile-meta">
            Joined ${profile.createdAt ? new Date(profile.createdAt.toDate()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'} • 
            ${profile.jobsThisMonth || 0} gigs this month
        </div>
        
        <div class="profile-bio">
            ${profile.bio || 'No bio yet.'}
        </div>
        
        ${profile.phoneNumber ? `
            <div class="profile-contact">
                <span class="contact-icon">📞</span>
                <span class="contact-text">${profile.phoneNumber}</span>
            </div>
        ` : ''}
        
        ${profile.locationGeo ? `
            <div class="profile-contact ${!isOwnProfile ? 'clickable-location' : ''}" 
                 ${!isOwnProfile ? `onclick="getDirectionsToProvider('${profile.id}')"` : ''}>
                <span class="contact-icon">📍</span>
                <span class="contact-text">${profile.locationDescription || `${profile.locationGeo.latitude}, ${profile.locationGeo.longitude}`}</span>
            </div>
        ` : ''}
        
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

// FIX #7: Use savedProfiles map
window.toggleSaveProfile = async function(profileId) {
    const currentUserId = firebase.auth().currentUser.uid;
    if (currentUserId === profileId) {
        alert('You cannot save your own profile');
        return;
    }
    
    const saveBtn = document.getElementById(`save-btn-${profileId}`);
    const isSaved = saveBtn.textContent === 'Saved';
    
    try {
        const userRef = firebase.firestore().collection('users').doc(currentUserId);
        const userDoc = await userRef.get();
        const currentSaved = userDoc.data()?.savedProfiles || {};
        
        if (isSaved) {
            // Unsave
            delete currentSaved[profileId];
            await userRef.update({
                savedProfiles: currentSaved
            });
            saveBtn.textContent = 'Save';
            saveBtn.classList.remove('saved');
        } else {
            // Save
            currentSaved[profileId] = true;
            await userRef.update({
                savedProfiles: currentSaved
            });
            saveBtn.textContent = 'Saved';
            saveBtn.classList.add('saved');
        }
        
        // Refresh profile stats
        loadProfileTab(profileId);
        
    } catch (error) {
        console.error('Error toggling save:', error);
        alert('Failed to save/unsave profile');
    }
};

// FIX #7: Check saved status from user document
async function checkIfSaved(profileId) {
    const currentUserId = firebase.auth().currentUser.uid;
    if (currentUserId === profileId) return;
    
    const btn = document.getElementById(`save-btn-${profileId}`);
    if (!btn) return;
    
    try {
        const userDoc = await firebase.firestore().collection('users').doc(currentUserId).get();
        const savedProfiles = userDoc.data()?.savedProfiles || {};
        
        if (savedProfiles[profileId]) {
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

// FIX #7: Saved modal using map
window.openSavedModal = async function() {
    const currentUserId = firebase.auth().currentUser.uid;
    
    try {
        const userDoc = await firebase.firestore().collection('users').doc(currentUserId).get();
        const savedProfiles = userDoc.data()?.savedProfiles || {};
        const savedUserIds = Object.keys(savedProfiles);
        
        if (savedUserIds.length === 0) {
            alert('You haven\'t saved any profiles yet');
            return;
        }
        
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
        document.body.appendChild(modalContent);
        
    } catch (error) {
        console.error('Error opening saved modal:', error);
        alert('Failed to load saved profiles');
    }
};

window.openSavesModal = async function() {
    const currentUserId = firebase.auth().currentUser.uid;
    
    try {
        const savesSnapshot = await firebase.firestore()
            .collection('users')
            .where(`savedProfiles.${currentUserId}`, '==', true)
            .get();
        
        if (savesSnapshot.empty) {
            alert('No one has saved your profile yet');
            return;
        }
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-container';
        
        let html = `
            <div class="modal-header">
                <h2>People who saved you</h2>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-list">
        `;
        
        for (const doc of savesSnapshot.docs) {
            const userData = doc.data();
            html += `
                <div class="modal-item" onclick="viewProfileFromModal('${doc.id}')">
                    <img src="${userData.profileImage ? userData.profileImage + '?tr=w-50,h-50' : 'https://via.placeholder.com/50'}" class="modal-item-image">
                    <div class="modal-item-info">
                        <div class="modal-item-name">${userData.businessName || 'Business Name'}</div>
                        <div class="modal-item-rating">⭐ ${userData.rating || '0.0'}</div>
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        modalContent.innerHTML = html;
        document.body.appendChild(modalContent);
        
    } catch (error) {
        console.error('Error opening saves modal:', error);
        alert('Failed to load saves');
    }
};

window.unsaveProfile = async function(event, savedUserId) {
    event.stopPropagation();
    
    const currentUserId = firebase.auth().currentUser.uid;
    
    try {
        const userRef = firebase.firestore().collection('users').doc(currentUserId);
        const userDoc = await userRef.get();
        const savedProfiles = userDoc.data()?.savedProfiles || {};
        
        delete savedProfiles[savedUserId];
        await userRef.update({ savedProfiles: savedProfiles });
        
        closeModal();
        window.openSavedModal();
        
        if (document.querySelector('.profile-container')) {
            loadProfileTab(currentUserId);
        }
        
    } catch (error) {
        console.error('Error unsaving:', error);
        alert('Failed to unsave profile');
    }
};

window.closeModal = function() {
    const modal = document.querySelector('.modal-container');
    if (modal) modal.remove();
};

window.viewProfileFromModal = function(userId) {
    closeModal();
    switchTab('profile');
    loadProfileTab(userId);
};

async function getSavedCount(userId) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        return Object.keys(userDoc.data()?.savedProfiles || {}).length;
    } catch (error) {
        console.error('Error getting saved count:', error);
        return 0;
    }
}

async function getSavesCount(userId) {
    try {
        const snapshot = await firebase.firestore()
            .collection('users')
            .where(`savedProfiles.${userId}`, '==', true)
            .get();
        return snapshot.size;
    } catch (error) {
        console.error('Error getting saves count:', error);
        return 0;
    }
}

function setupOwnProfileListeners(profile) {
    // Placeholder
}

function setupOtherProfileListeners(profile) {
    checkIfSaved(profile.id);
}

// ========== IMAGE UPLOAD FUNCTIONS ==========
window.openImageUpload = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = uploadProfileImage;
    input.click();
};

async function uploadProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    alert('Uploading image...');
    
    try {
        const compressedFile = await compressImage(file);
        
        const authResponse = await fetch('https://gigscourt.vercel.app/api/imagekit-auth');
        const authData = await authResponse.json();
        
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onload = function() {
            const base64 = reader.result.split(',')[1];
            
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
                
                firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
                    profileImage: result.url
                }).then(() => {
                    alert('Profile picture updated!');
                    
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
            const authResponse = await fetch('https://gigscourt.vercel.app/api/imagekit-auth');
            const authData = await authResponse.json();
            
            const compressedFile = await compressImage(file);
            const base64 = await readFileAsBase64(compressedFile);
            
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
            
        await updateFirestoreWithPortfolio(uploadedUrls);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload images: ' + error.message);
    }
}

async function updateFirestoreWithPortfolio(uploadedUrls) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).get();
        const userData = userDoc.data();
        const existingImages = userData.portfolioImages || [];
        
        await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
            portfolioImages: [...existingImages, ...uploadedUrls]
        });
        
        alert(`${uploadedUrls.length} images uploaded successfully!`);
        loadProfileTab();
    } catch (error) {
        console.error('Firestore error:', error);
        alert('Failed to save image URLs');
    }
}

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
                }, file.type, 0.8);
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
        
        const updatedImages = (userData.portfolioImages || []).filter(url => url !== imageUrl);
        
        await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
            portfolioImages: updatedImages
        });
        
        alert('Image deleted');
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
                <div class="edit-picture-section">
                    <div class="edit-picture">
                        <img src="${currentUserData?.profileImage ? currentUserData.profileImage + '?tr=w-80,h-80' : 'https://via.placeholder.com/80'}" alt="Profile">
                        <div class="change-picture-btn" onclick="openImageUpload()">Change</div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Business Name</label>
                    <input type="text" id="edit-business-name" value="${currentUserData?.businessName || ''}">
                    <small class="cooldown-hint">Can change every 14 days</small>
                </div>
                
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="edit-username" value="${currentUserData?.username || ''}">
                    <small class="cooldown-hint">Can change every 14 days</small>
                </div>
                
                <div class="form-group">
                    <label>Bio</label>
                    <textarea id="edit-bio" rows="3">${currentUserData?.bio || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" id="edit-phone" value="${currentUserData?.phoneNumber || ''}">
                </div>
                
                <div class="form-group">
                    <label>Location</label>
                    <button class="location-picker-btn" onclick="openLocationPicker()">
                        📍 ${currentUserData?.locationDescription || (currentUserData?.locationGeo ? `${currentUserData.locationGeo.latitude}, ${currentUserData.locationGeo.longitude}` : 'Set your location')}
                    </button>
                </div>
                
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
                
                <div class="account-actions">
                    <button class="btn btn-outline" onclick="logout()">Log Out</button>
                    <button class="btn btn-outline delete-account" onclick="deleteAccount()">Delete Account</button>
                </div>
            </div>
        </div>
    `;
};

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
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setupMap(lat, lng);
            },
            (error) => {
                console.log('Geolocation error:', error);
                useFallbackLocation();
            },
            { timeout: 5000 }
        );
    } else {
        useFallbackLocation();
    }
    
    function useFallbackLocation() {
        let lat = 6.5244;
        let lng = 3.3792;
        
        if (currentUserData?.locationGeo) {
            lat = currentUserData.locationGeo.latitude;
            lng = currentUserData.locationGeo.longitude;
        }
        setupMap(lat, lng);
    }
    
    function setupMap(lat, lng) {
        locationMap = L.map('location-map', {
            center: [lat, lng],
            zoom: 15,
            zoomControl: true,
            attributionControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(locationMap);
        
        selectedLocation = { lat, lng };
        
        locationMap.on('moveend', function() {
            const center = locationMap.getCenter();
            selectedLocation = { lat: center.lat, lng: center.lng };
            updateAddressFromCoords(center.lat, center.lng);
        });
        
        updateAddressFromCoords(lat, lng);
    }
}
         
async function updateAddressFromCoords(lat, lng) {
    const addressInput = document.getElementById('location-address');
    if (!addressInput) return;
    
    selectedLocation = { lat, lng };
    addressInput.value = 'Getting address...';
    
    try {
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
    
    const geopoint = new firebase.firestore.GeoPoint(selectedLocation.lat, selectedLocation.lng);
    
    firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
        locationGeo: geopoint,
        locationDescription: description
    }).then(() => {
        alert('Location saved!');
        firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).get().then(doc => {
            currentUserData = doc.data();
            openEditProfile();
        });
    }).catch(error => {
        console.error('Error saving location:', error);
        alert('Failed to save location');
    });
};

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
                
                locationMap.setView([lat, lng], 15);
                updateAddressFromCoords(lat, lng);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }, 500);
}

document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'location-search-input') {
        searchLocation(e.target.value);
    }
});

window.removeService = function(service) {
    const services = currentUserData?.services || [];
    const updatedServices = services.filter(s => s !== service);
    
    firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
        services: updatedServices
    }).then(() => {
        window.openEditProfile();
    });
};

window.addService = function() {
    const newService = document.getElementById('new-service').value.trim();
    if (!newService) return;
    
    const services = currentUserData?.services || [];
    const pendingServices = currentUserData?.pendingServices || [];
    
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
    const targetId = profileId || firebase.auth().currentUser.uid;
    
    const profileDoc = await firebase.firestore().collection('users').doc(targetId).get();
    if (!profileDoc.exists) return;
    
    const profile = profileDoc.data();
    const businessName = profile.businessName || 'GigsCourt Profile';
    const bio = profile.bio ? profile.bio.substring(0, 100) : 'Check out my profile on GigsCourt';
    const profileUrl = `${window.location.origin}/user/${targetId}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: businessName,
                text: bio,
                url: profileUrl
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                copyProfileLink(profileUrl);
            }
        }
    } else {
        copyProfileLink(profileUrl);
    }
};

async function copyProfileLink(url) {
    try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied!');
    } catch (err) {
        alert('Could not copy link. Please copy manually: ' + url);
    }
}

function showToast(message) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

window.startChat = (id) => alert('Chat coming soon');

// ========== GLIGHTBOX GALLERY ==========
window.openPhotoSwipe = function(index) {
    const portfolioItems = document.querySelectorAll('.portfolio-item img');
    const images = [];
    
    portfolioItems.forEach((img, i) => {
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
    
    const lightbox = GLightbox({
        elements: images,
        startAt: index,
        loop: true,
        touchNavigation: true,
        autoplayVideos: false,
        closeButton: true,
        closeOnOutsideClick: true,
        zoomable: true,
        draggable: true,
        slideEffect: 'fade',
        openEffect: 'fade',
        closeEffect: 'fade',
        onOpen: function() {
            document.body.style.overflow = 'hidden';
        },
        onClose: function() {
            document.body.style.overflow = '';
        }
    });
    
    lightbox.open();
};

// ========== SEARCH TAB ==========
let map = null;
let userMarker = null;
let providerMarkers = [];
let routingControl = null;
let searchProviders = [];
let radiusCircle = null;
let currentRadius = 10;

function loadSearchTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="search-container">
            <div id="search-map" class="search-map"></div>
            
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
            
            <div class="provider-drawer">
                <div class="drawer-handle"></div>
                <div id="provider-list" class="provider-list"></div>
                <div id="drawer-loading" class="drawer-loading hidden">
                    <div class="spinner-small"></div>
                </div>
            </div>
        </div>
    `;
    
    getUserLocation();
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
                localStorage.setItem('userLocation', JSON.stringify(userLocation));
                initializeMap();
                loadNearbyProviders(true);
            },
            (error) => {
                console.error('Geolocation error:', error);
                const savedLocation = localStorage.getItem('userLocation');
                if (savedLocation) {
                    userLocation = JSON.parse(savedLocation);
                } else {
                    userLocation = { lat: 6.5244, lng: 3.3792 };
                }
                initializeMap();
                loadNearbyProviders(true);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        const savedLocation = localStorage.getItem('userLocation');
        if (savedLocation) {
            userLocation = JSON.parse(savedLocation);
        } else {
            userLocation = { lat: 6.5244, lng: 3.3792 };
        }
        initializeMap();
        loadNearbyProviders(true);
    }
}

function initializeMap() {
    setTimeout(() => {
        const mapContainer = document.getElementById('search-map');
        if (!mapContainer) return;
        
        if (map) {
            map.remove();
            map = null;
        }
        
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
        
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="user-dot"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
        
        updateRadiusCircle();
        
        map.on('moveend', onMapMoved);
        
    }, 300);
}

function updateRadiusCircle() {
    if (!map || !userLocation) return;
    
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
    }
    
    radiusCircle = L.circle([userLocation.lat, userLocation.lng], {
        radius: currentRadius * 1000,
        color: '#000000',
        weight: 1,
        fillColor: '#000000',
        fillOpacity: 0.1,
        lineCap: 'round'
    }).addTo(map);
    
    map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] });
}

async function loadNearbyProviders(reset = true) {
    if (!userLocation) return;
    if (searchLoading) return;
    
    const listContainer = document.getElementById('provider-list');
    const loadingEl = document.getElementById('drawer-loading');
    
    if (reset) {
        searchProviders = [];
        searchLastDoc = null;
        searchHasMore = true;
        document.getElementById('provider-list').innerHTML = '';
    }
    
    if (!searchHasMore) {
        if (loadingEl) loadingEl.classList.add('hidden');
        return;
    }
    
    searchLoading = true;
    if (loadingEl) loadingEl.classList.remove('hidden');
    
    try {
        if (reset && searchCache && searchCacheTime) {
            const now = new Date().getTime();
            if (now - searchCacheTime < CACHE_DURATION) {
                console.log('Using cached providers');
                searchProviders = [...searchCache];
                renderProviderList();
                updateMapMarkers();
                searchLoading = false;
                if (loadingEl) loadingEl.classList.add('hidden');
                return;
            }
        }
        
        let query = firebase.firestore().collection('users')
            .where('emailVerified', '==', true)
            .where('locationGeo', '!=', null)
            .limit(20);
        
        if (searchLastDoc) {
            query = query.startAfter(searchLastDoc);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            searchHasMore = false;
        } else {
            searchLastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                
                const distance = calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    data.locationGeo.latitude,
                    data.locationGeo.longitude
                );
                
                if (distance <= currentRadius) {
                    const providerLocation = {
                        lat: data.locationGeo.latitude,
                        lng: data.locationGeo.longitude
                    };
                    
                    searchProviders.push({
                        id: doc.id,
                        ...data,
                        distance: distance.toFixed(1),
                        location: providerLocation
                    });
                }
            });
            
            searchProviders.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
            
            if (reset) {
                searchCache = [...searchProviders];
                searchCacheTime = new Date().getTime();
            }
            
            renderProviderList();
            updateMapMarkers();
        }
        
    } catch (error) {
        console.error('Error loading providers:', error);
    }
    
    searchLoading = false;
    if (loadingEl) loadingEl.classList.add('hidden');
}

function updateMapMarkers() {
    providerMarkers.forEach(marker => map.removeLayer(marker));
    providerMarkers = [];
    
    searchProviders.forEach(provider => {
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
        
        const lat = provider.location?.lat || userLocation.lat;
        const lng = provider.location?.lng || userLocation.lng;
        
        const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
        
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
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterProviders(searchTerm);
        });
    }
    
    const radiusSlider = document.getElementById('radius-slider');
    const radiusValue = document.getElementById('radius-value');
    
    if (radiusSlider && radiusValue) {
        // FIX #3: Only load on release (change event), not on input
        radiusSlider.addEventListener('input', (e) => {
            currentRadius = parseInt(e.target.value);
            radiusValue.textContent = `${currentRadius} km`;
        });
        
        radiusSlider.addEventListener('change', () => {
            updateRadiusCircle();
            loadNearbyProviders(true);
        });
    }
    
    const providerDrawer = document.querySelector('.provider-drawer');
    if (providerDrawer) {
        providerDrawer.addEventListener('scroll', () => {
            if (providerDrawer.scrollTop + providerDrawer.clientHeight >= providerDrawer.scrollHeight - 100) {
                if (!searchLoading && searchHasMore) {
                    loadNearbyProviders(false);
                }
            }
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

window.getDirections = function(providerId) {
    const provider = searchProviders.find(p => p.id === providerId);
    if (!provider || !userLocation) return;
    
    switchTab('search');
    
    setTimeout(() => {
        if (!map) return;
        
        if (routingControl) {
            map.removeControl(routingControl);
        }
        
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(userLocation.lat, userLocation.lng),
                L.latLng(provider.location?.lat || userLocation.lat, provider.location?.lng || userLocation.lng)
            ],
            routeWhileDragging: false,
            showAlternatives: false,
            fitSelectedRoutes: true,
            lineOptions: {
                styles: [{ color: '#000000', opacity: 0.8, weight: 4 }]
            },
            createMarker: function() { return null; }
        }).addTo(map);
        
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
    // Placeholder
}

// ========== MESSAGES TAB ==========
let conversationsListener = null;
let currentChatId = null;
let messagesListener = null;
let conversationsInterval = null;
let messagesInterval = null;

// FIX #1: Manual refresh for conversations
function loadConversations() {
    const userId = firebase.auth().currentUser.uid;
    const conversationsList = document.getElementById('conversations-list');
    const loadingEl = document.getElementById('conversations-loading');
    
    if (conversationsListener) {
        conversationsListener();
        conversationsListener = null;
    }
    
    if (window.conversationsInterval) {
        clearInterval(window.conversationsInterval);
    }
    
    async function fetchConversations() {
        try {
            const snapshot = await firebase.firestore()
                .collection('chats')
                .where('participants', 'array-contains', userId)
                .orderBy('lastMessageTimestamp', 'desc')
                .get();
            
            if (loadingEl) loadingEl.style.display = 'none';
            
            if (snapshot.empty) {
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
            
            let html = '';
            snapshot.forEach(doc => {
                const chat = doc.data();
                chat.id = doc.id;
                html += renderConversationItem(chat, userId);
            });
            
            conversationsList.innerHTML = html;
            
            snapshot.forEach(doc => {
                const chatId = doc.id;
                const otherUserId = doc.data().participants.find(id => id !== userId);
                document.getElementById(`chat-${chatId}`)?.addEventListener('click', () => {
                    openChat(chatId, otherUserId, doc.data());
                });
            });
        } catch (error) {
            console.error('Error loading conversations:', error);
            if (loadingEl) loadingEl.style.display = 'none';
            conversationsList.innerHTML = `
                <div class="empty-state-messages">
                    <div class="empty-icon">⚠️</div>
                    <h3>Error Loading Messages</h3>
                    <p>Pull down to try again</p>
                </div>
            `;
        }
    }
    
    fetchConversations();
    
    window.conversationsInterval = setInterval(() => {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.textContent.includes('Messages')) {
            fetchConversations();
        }
    }, 60000);
}

// FIX #1: Manual refresh for messages
function loadMessages(chatId) {
    const messagesContainer = document.getElementById('chat-messages');
    const currentUserId = firebase.auth().currentUser.uid;
    
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }
    
    if (window.messagesInterval) {
        clearInterval(window.messagesInterval);
    }
    
    async function fetchMessages() {
        try {
            const snapshot = await firebase.firestore()
                .collection('chats').doc(chatId)
                .collection('messages')
                .orderBy('timestamp', 'asc')
                .get();
            
            if (snapshot.empty) {
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
                
                const msgDate = msg.timestamp?.toDate().toLocaleDateString();
                if (msgDate !== lastDate) {
                    html += `<div class="chat-date-separator">${msg.timestamp?.toDate().toLocaleDateString()}</div>`;
                    lastDate = msgDate;
                }
                
                html += renderMessage(msg, currentUserId);
                
                if (msg.senderId !== currentUserId && !msg.read) {
                    markMessageAsRead(chatId, msg.id);
                }
            });
            
            messagesContainer.innerHTML = html;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    
    fetchMessages();
    
    window.messagesInterval = setInterval(() => {
        if (document.getElementById('chat-messages')) {
            fetchMessages();
        } else {
            clearInterval(window.messagesInterval);
        }
    }, 30000);
}

function renderConversationItem(chat, currentUserId) {
    const otherUserId = chat.participants.find(id => id !== currentUserId);
    const lastMessage = chat.lastMessage || '';
    const lastMessageTime = chat.lastMessageTimestamp ? formatMessageTime(chat.lastMessageTimestamp.toDate()) : '';
    const unread = chat.lastMessageSender !== currentUserId && !chat.lastMessageRead;
    
    let otherUserName = chat.otherUserName || 'Loading...';
    let otherUserImage = chat.otherUserImage || 'https://via.placeholder.com/40';
    
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
    
    let otherUserName = 'Loading...';
    if (chatData.businessName) {
        otherUserName = chatData.businessName;
    } else {
        firebase.firestore().collection('users').doc(otherUserId).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                otherUserName = userData.businessName || 'User';
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
            
            <div id="chat-messages" class="chat-messages"></div>
            
            <div class="chat-input-container">
                <input type="text" id="chat-input" class="chat-input" placeholder="Type a message...">
                <button class="chat-send-btn" onclick="sendMessage()">Send</button>
            </div>
        </div>
    `;
    
    loadMessages(chatId);
    
    setTimeout(() => {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            checkPendingGigs(otherUserId, chatMessages);
        }
    }, 500);
}

async function checkPendingGigs(otherUserId, chatContainer) {
    const currentUserId = firebase.auth().currentUser.uid;
    
    try {
        const pendingGigsSnapshot = await firebase.firestore()
            .collection('jobs')
            .where('providerId', '==', otherUserId)
            .where('clientId', '==', currentUserId)
            .where('status', '==', 'pending')
            .where('notifiedClient', '==', false)
            .limit(1)
            .get();
        
        if (!pendingGigsSnapshot.empty) {
            const gig = pendingGigsSnapshot.docs[0].data();
            const gigId = pendingGigsSnapshot.docs[0].id;
            
            const confirmDiv = document.createElement('div');
            confirmDiv.className = 'gig-confirmation';
            confirmDiv.innerHTML = `
                <div class="gig-message">
                    <strong>${gig.providerName || 'Provider'}</strong> registered a gig with you.
                </div>
                <button class="btn confirm-gig-btn" onclick="confirmGig('${gigId}', '${otherUserId}')">Confirm Gig</button>
            `;
            
            chatContainer.appendChild(confirmDiv);
            
            await pendingGigsSnapshot.docs[0].ref.update({
                notifiedClient: true
            });
        }
    } catch (error) {
        console.error('Error checking pending gigs:', error);
    }
}

window.confirmGig = async function(gigId, providerId) {
    try {
        await firebase.firestore().collection('jobs').doc(gigId).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showReviewModal(providerId, gigId);
        
        document.querySelector('.gig-confirmation')?.remove();
        
    } catch (error) {
        console.error('Error confirming gig:', error);
        alert('Failed to confirm gig');
    }
};

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
        await messagesRef.add({
            senderId: currentUserId,
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
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

function loadMessagesTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="messages-container">
            <div class="messages-header">
                <h1 class="messages-title">Messages</h1>
            </div>
            
            <div id="conversations-list" class="conversations-list"></div>
            
            <div id="conversations-loading" class="conversations-loading">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    loadConversations();
    fixChatUserNames();
}

// Clean up intervals on tab change
window.addEventListener('tabChange', () => {
    if (window.conversationsInterval) {
        clearInterval(window.conversationsInterval);
        window.conversationsInterval = null;
    }
    if (window.messagesInterval) {
        clearInterval(window.messagesInterval);
        window.messagesInterval = null;
    }
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
    // Clear intervals when leaving tabs
    if (window.conversationsInterval) {
        clearInterval(window.conversationsInterval);
        window.conversationsInterval = null;
    }
    if (window.messagesInterval) {
        clearInterval(window.messagesInterval);
        window.messagesInterval = null;
    }
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(tab) || 
            (tab === 'home' && btn.textContent.includes('Home')) ||
            (tab === 'search' && btn.textContent.includes('Search')) ||
            (tab === 'messages' && btn.textContent.includes('Messages')) ||
            (tab === 'profile' && btn.textContent.includes('Profile')) ||
            (tab === 'admin' && btn.textContent.includes('Admin'))) {
            btn.classList.add('active');
        }
    });
    
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
        default:
            loadHomeTab();
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
            locationGeo: null,
            points: 15,
            jobsThisMonth: 0,
            savedProfiles: {}
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

window.logout = function() {
    searchCache = null;
    searchCacheTime = null;
    searchProviders = [];
    searchLastDoc = null;
    searchHasMore = true;
    firebase.auth().signOut();
};

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
            
            <div id="admin-content" class="admin-content"></div>
        </div>
    `;
    
    switchAdminTab(adminCurrentTab);
}

window.switchAdminTab = function(tab) {
    adminCurrentTab = tab;
    
    document.querySelectorAll('.admin-subtab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(tab === 'dashboard' ? '📊' : 
                                      tab === 'users' ? '👥' : '⏳')) {
            btn.classList.add('active');
        }
    });
    
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

// FIX #4: Aggregated stats for admin dashboard
async function loadAdminDashboard() {
    const container = document.getElementById('admin-content');
    if (!container) return;
    
    container.innerHTML = '<div class="admin-loading"><div class="spinner"></div></div>';
    
    try {
        let statsDoc = await firebase.firestore().collection('stats').doc('dashboard').get();
        
        if (!statsDoc.exists) {
            // Calculate stats once and store
            const usersSnapshot = await firebase.firestore().collection('users').get();
            const totalUsers = usersSnapshot.size;
            
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentUsers = usersSnapshot.docs.filter(doc => {
                const createdAt = doc.data().createdAt?.toDate();
                return createdAt && createdAt > oneWeekAgo;
            }).length;
            
            const pendingServices = usersSnapshot.docs.filter(doc => {
                return doc.data().pendingServices?.length > 0;
            }).length;
            
            let totalImages = 0;
            usersSnapshot.docs.forEach(doc => {
                totalImages += doc.data().portfolioImages?.length || 0;
            });
            
            const recentSignups = usersSnapshot.docs
                .filter(doc => doc.data().createdAt)
                .sort((a, b) => {
                    return (b.data().createdAt?.toDate() || 0) - (a.data().createdAt?.toDate() || 0);
                })
                .slice(0, 5)
                .map(doc => ({ id: doc.id, data: doc.data() }));
            
            statsDoc = await firebase.firestore().collection('stats').doc('dashboard').set({
                totalUsers,
                recentUsers,
                pendingServices,
                totalImages,
                recentSignups: recentSignups.map(s => ({
                    id: s.id,
                    businessName: s.data.businessName,
                    profileImage: s.data.profileImage,
                    createdAt: s.data.createdAt
                })),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            statsDoc = await firebase.firestore().collection('stats').doc('dashboard').get();
        }
        
        const stats = statsDoc.data();
        
        container.innerHTML = `
            <div class="admin-dashboard">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalUsers || 0}</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.recentUsers || 0}</div>
                        <div class="stat-label">Joined This Week</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.pendingServices || 0}</div>
                        <div class="stat-label">Pending Approvals</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalImages || 0}</div>
                        <div class="stat-label">Portfolio Images</div>
                    </div>
                </div>
                
                <div class="recent-section">
                    <h3 class="section-title">Recent Sign-ups</h3>
                    <div class="recent-list">
                        ${(stats.recentSignups || []).map(item => {
                            const date = item.createdAt?.toDate().toLocaleDateString() || 'Unknown';
                            return `
                                <div class="recent-item" onclick="viewUserProfile('${item.id}')">
                                    <img src="${item.profileImage ? item.profileImage + '?tr=w-40,h-40' : 'https://via.placeholder.com/40'}" class="recent-image">
                                    <div class="recent-info">
                                        <div class="recent-name">${item.businessName || 'Unnamed'}</div>
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

window.approveService = async function(userId, service) {
    try {
        const userRef = firebase.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const updatedPending = userData.pendingServices.filter(s => s !== service);
        const updatedServices = [...(userData.services || []), service];
        
        await userRef.update({
            pendingServices: updatedPending,
            services: updatedServices
        });
        
        await sendAdminNotification(userId, `Your service "${service}" has been approved!`);
        
        const serviceElement = document.getElementById(`service-${userId}-${service.replace(/\s+/g, '-')}`);
        if (serviceElement) {
            serviceElement.remove();
        }
        
        const approvalItem = document.getElementById(`approval-${userId}`);
        if (approvalItem && !approvalItem.querySelector('.pending-service-item')) {
            approvalItem.remove();
        }
        
        const approvalsContainer = document.querySelector('.admin-approvals');
        if (approvalsContainer && !approvalsContainer.querySelector('.approval-item')) {
            document.getElementById('admin-content').innerHTML = '<div class="empty-approvals">No pending approvals</div>';
        }
        
        showToast('Service approved!');
        
        // Update stats document
        const statsDoc = await firebase.firestore().collection('stats').doc('dashboard').get();
        if (statsDoc.exists) {
            await statsDoc.ref.update({
                pendingServices: firebase.firestore.FieldValue.increment(-1)
            });
        }
        
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
        
        const updatedPending = userData.pendingServices.map(s => s === service ? newService : s);
        
        await userRef.update({
            pendingServices: updatedPending
        });
        
        const serviceElement = document.getElementById(`service-${userId}-${service.replace(/\s+/g, '-')}`);
        if (serviceElement) {
            const serviceNameSpan = serviceElement.querySelector('.service-name');
            if (serviceNameSpan) {
                serviceNameSpan.textContent = newService;
            }
            serviceElement.id = `service-${userId}-${newService.replace(/\s+/g, '-')}`;
            
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

async function sendAdminNotification(userId, message) {
    const adminId = firebase.auth().currentUser.uid;
    
    try {
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

window.viewUserProfile = function(userId) {
    switchTab('profile');
    loadProfileTab(userId);
};
