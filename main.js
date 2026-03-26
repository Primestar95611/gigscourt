// main.js - App initialization, tab switching, and global state

// Global variables shared across modules
let currentUser = null;
let currentUserData = null;
let userLocation = null;
let providers = [];
let lastDoc = null;
let loading = false;
let hasMore = true;
let homeCurrentPage = 1;
let homeTotalLoaded = 0;
let map = null;
let userMarker = null;
let providerMarkers = [];
let routingControl = null;
let searchProviders = [];
let radiusCircle = null;
let currentRadius = 10;
let searchLastDoc = null;
let searchHasMore = true;
let searchLoading = false;
let searchCache = null;
let searchCacheTime = null;
let conversationsListener = null;
let currentChatId = null;
let messagesListener = null;
let chatPreviousScreen = null;
let lastProfileViewedId = null;
let profilePreviousScreen = null;
let observer = null;
let adminCurrentTab = 'dashboard';

// Main app loader
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

// Tab switching
window.switchTab = (tab) => {
    if (window.conversationsInterval) {
        clearInterval(window.conversationsInterval);
        window.conversationsInterval = null;
    }
    if (window.messagesInterval) {
        clearInterval(window.messagesInterval);
        window.messagesInterval = null;
    }

    if (window.currentTab === 'home') {
        cleanupInfiniteScroll();
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

// Edit profile functions
window.openEditProfile = function() {
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) {
        tabBar.style.display = 'none';
    }
    
    const container = document.getElementById('tab-content');
    
    container.innerHTML = `
        <div class="edit-profile-container">
            <div class="edit-profile-header">
                <button class="back-btn" onclick="loadProfileTab(null, false)">←</button>
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

        sessionStorage.removeItem(`profile_${firebase.auth().currentUser.uid}`);
        
        loadProfileTab(null, false);
    } catch (error) {
        alert('Error saving profile: ' + error.message);
    }
};

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

// Location picker functions
let locationMap = null;
let locationMarker = null;
let selectedLocation = null;

window.openLocationPicker = function() {
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) {
        tabBar.style.display = 'none';
    }
    
    const container = document.getElementById('tab-content');
    
    container.innerHTML = `
        <div class="location-picker-container">
            <div class="location-picker-header">
                <button class="back-btn" onclick="loadProfileTab(null, false)">←</button>
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

function initializeLocationMap() {
    const mapContainer = document.getElementById('location-map');
    if (!mapContainer) return;
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setupLocationMap(lat, lng);
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
        setupLocationMap(lat, lng);
    }
    
    function setupLocationMap(lat, lng) {
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
            loadProfileTab(null, false);
        });
    }).catch(error => {
        console.error('Error saving location:', error);
        alert('Failed to save location');
    });
}

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

// Register job modal
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

// Reviews display
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

// Review modal
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
        
        const providerRef = firebase.firestore().collection('users').doc(providerId);
        const providerDoc = await providerRef.get();
        const provider = providerDoc.data();
        
        let newRating;
        let newReviewCount;
        
        if (existingReviewQuery.empty) {
            const oldTotal = (provider.rating || 0) * (provider.reviewCount || 0);
            const newTotal = oldTotal + parseInt(rating);
            newReviewCount = (provider.reviewCount || 0) + 1;
            newRating = newTotal / newReviewCount;
        } else {
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
        
        try {
            const providerToken = providerDoc.data()?.fcmToken;
            const clientName = clientData.businessName || 'A client';
            
            if (providerToken) {
                const workerUrl = 'https://gigscourtnotification.agboghidiaugust.workers.dev';
                await fetch(workerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientToken: providerToken,
                        title: 'New Review',
                        body: `${clientName} left you a ${rating}★ review`,
                        chatId: ''
                    })
                });
            }
        } catch (notifyError) {
            console.log('Failed to send review notification:', notifyError);
        }
        
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
        
        try {
            const clientDoc = await firebase.firestore().collection('users').doc(clientId).get();
            const clientToken = clientDoc.data()?.fcmToken;
            
            if (clientToken) {
                const workerUrl = 'https://gigscourtnotification.agboghidiaugust.workers.dev';
                await fetch(workerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientToken: clientToken,
                        title: 'New Gig Request',
                        body: `${providerData.businessName} wants to work with you`,
                        chatId: ''
                    })
                });
            }
        } catch (notifyError) {
            console.log('Failed to send gig notification:', notifyError);
        }
        
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

// Cleanup intervals on tab change
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

console.log('GigsCourt app initialized');
