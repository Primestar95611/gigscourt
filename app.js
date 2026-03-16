import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, sendEmailVerification, signOut, deleteUser
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { 
  getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, query, orderBy, limit, startAfter, getDocs, GeoPoint,
  addDoc, onSnapshot, Timestamp, where, writeBatch, arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyD7dRYpXukVlyV6ipmCfbCXEJ4kp8t1Gmg",
  authDomain: "gigscourt.firebaseapp.com",
  projectId: "gigscourt",
  storageBucket: "gigscourt.firebasestorage.app",
  messagingSenderId: "1055157379736",
  appId: "1:1055157379736:web:215763c63606c2c5a966ed",
  measurementId: "G-BY1YBSYJHV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ImageKit config
const IK_PUBLIC_KEY = 'public_t2gpKmHQ/9binh9kNSsQBq0zsys=';
const IK_URL_ENDPOINT = 'https://ik.imagekit.io/GigsCourt';
const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\' viewBox=\'0 0 200 200\'%3E%3Ccircle cx=\'100\' cy=\'100\' r=\'100\' fill=\'%23e0e0e0\'/%3E%3Ccircle cx=\'100\' cy=\'70\' r=\'30\' fill=\'%23b0b0b0\'/%3E%3Ccircle cx=\'100\' cy=\'150\' r=\'40\' fill=\'%23b0b0b0\'/%3E%3C/svg%3E';

// Helper to add thumbnail parameters to any ImageKit URL
const getThumbnailUrl = (url, w = 400) => {
  if (!url) return DEFAULT_AVATAR;
  return url.includes('?') ? `${url}&tr=w-${w}` : `${url}?tr=w-${w}`;
};

// DOM elements
const authContainer = document.getElementById('authContainer');
const mainApp = document.getElementById('mainApp');
const emailSignupView = document.getElementById('emailSignupView');
const phoneSignupView = document.getElementById('phoneSignupView');
const loginView = document.getElementById('loginView');
const verifyView = document.getElementById('verifyView');
const authError = document.getElementById('authError');
const loginError = document.getElementById('loginError');
const adminTabBtn = document.getElementById('adminTabBtn');
const adminTab = document.getElementById('adminTab');
if (adminTab) {
 adminTab.innerHTML = '<div style="padding:20px"><h2>Pending Services</h2><div id="pendingList"></div></div>';
}
const homeGrid = document.getElementById('homeGrid');
const deleteModal = document.getElementById('deleteModal');
const providerListDrawer = document.getElementById('providerListDrawer');
const radiusSlider = document.getElementById('radiusSlider');
const radiusValue = document.getElementById('radiusValue');
const skillSearch = document.getElementById('skillSearch');
const conversationsList = document.getElementById('conversationsList');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const chatPartnerImg = document.getElementById('chatPartnerImg');
const chatPartnerName = document.getElementById('chatPartnerName');
const backToConversations = document.getElementById('backToConversations');
const chatView = document.getElementById('chatView');
const messagesTab = document.getElementById('messagesTab');
const startChatModal = document.getElementById('startChatModal');
const startChatModalTitle = document.getElementById('startChatModalTitle');
const startChatModalMessage = document.getElementById('startChatModalMessage');
const cancelStartChatBtn = document.getElementById('cancelStartChatBtn');
const confirmStartChatBtn = document.getElementById('confirmStartChatBtn');
const fileInput = document.getElementById('fileInput');
const quickViewSheet = document.getElementById('quickViewSheet');
const sheetOverlay = document.getElementById('sheetOverlay');
const sheetContent = document.getElementById('sheetContent');
const profileViewer = document.getElementById('profileViewer');
const profileViewerImg = document.getElementById('profileViewerImg');
const closeProfileViewer = document.getElementById('closeProfileViewer');
const deletePortfolioModal = document.getElementById('deletePortfolioModal');
const deletePortfolioOverlay = document.getElementById('deletePortfolioOverlay');
const cancelDeletePortfolio = document.getElementById('cancelDeletePortfolio');
const confirmDeletePortfolio = document.getElementById('confirmDeletePortfolio');
const profileStats = document.getElementById('profileStats');
const profileReviews = document.getElementById('profileReviews');
const portfolioCount = document.getElementById('portfolioCount');

// Profile elements
const profileImage = document.getElementById('profileImage');
const profileBusinessName = document.getElementById('profileBusinessName');
const profileUsername = document.getElementById('profileUsername');
const profileJobs = document.getElementById('profileJobs');
const profileRating = document.getElementById('profileRating');
const profileBio = document.getElementById('profileBio');
const profilePhone = document.getElementById('profilePhone');
const profilePhoneContainer = document.getElementById('profilePhoneContainer');
const profileAddress = document.getElementById('profileAddress');
const profileAddressContainer = document.getElementById('profileAddressContainer');
const editProfileBtn = document.getElementById('editProfileBtn');
const shareProfileBtn = document.getElementById('shareProfileBtn');
const portfolioGrid = document.getElementById('portfolioGrid');
const uploadProfilePicBtn = document.getElementById('uploadProfilePicBtn');
const addPortfolioBtn = document.getElementById('addPortfolioBtn');
const uploadProgress = document.getElementById('uploadProgress');
const uploadError = document.getElementById('uploadError');

// State
let selectedEmailSkills = new Set();
let lastVisible = null;
let loadingMore = false;
let currentUser = null;
let map = null;
let mapMarkers = [];
let allUsers = [];
let aktuellesSuchwort = '';
let aktuellerRadius = 25;
let touchOnMap = false;
let currentHighlightedMarker = null;
let currentChatId = null;
let currentChatPartner = null;
let unsubscribeMessages = null;
let unsubscribeConversations = null;
let pendingChatUserId = null;
let pendingChatUserName = null;
let pendingChatUserImage = null;
let userCache = new Map();
let refreshIndicator = null;
let pullStartY = 0;
let isPulling = false;
let isTouchingMap = false;
let isUploading = false;
let currentUploadType = null;
let currentSheetProvider = null;
let longPressTimer = null;
let selectedImageIndex = null;
let selectedImageUrl = null;
let isPullingProfile = false;
let profilePullStartY = 0;
let portfolioStartIndex = 0;
const portfolioBatchSize = 9;

// ==================== SAVES FUNCTIONS ====================

// Toggle save on a profile
async function toggleSave(providerId) {
  if (!currentUser) {
    alert('Please log in to save profiles');
    return false;
  }
  
  const saveId = `${currentUser.uid}_${providerId}`;
  const saveRef = doc(db, 'saves', saveId);
  const saveDoc = await getDoc(saveRef);
  
  try {
    if (saveDoc.exists()) {
      // Remove save
      await deleteDoc(saveRef);
      return false; // Return false = not saved
    } else {
      // Add save
      await setDoc(saveRef, {
        saverId: currentUser.uid,
        savedUserId: providerId,
        timestamp: Timestamp.now()
      });
      
      // Create notification for the provider
      await createSaveNotification(providerId);
      return true; // Return true = saved
    }
  } catch (error) {
    console.error('Error toggling save:', error);
    return false;
  }
}

// Create notification when someone saves your profile
async function createSaveNotification(savedUserId) {
  if (!currentUser) return;
  
  try {
    const notificationRef = collection(db, 'notifications');
    await addDoc(notificationRef, {
      userId: savedUserId,           // The person who was saved
      fromUserId: currentUser.uid,   // The person who did the saving
      type: 'save',
      timestamp: Timestamp.now(),
      read: false
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// Check if current user has saved a specific profile
async function checkIfSaved(providerId) {
  if (!currentUser) return false;
  
  const saveId = `${currentUser.uid}_${providerId}`;
  const saveRef = doc(db, 'saves', saveId);
  const saveDoc = await getDoc(saveRef);
  
  return saveDoc.exists();
}

// Get save count for a profile
async function getSaveCount(userId) {
  const savesQuery = query(
    collection(db, 'saves'),
    where('savedUserId', '==', userId)
  );
  
  const snapshot = await getDocs(savesQuery);
  return snapshot.size;
}

// Get user's saved profiles list
async function getUserSaves() {
  if (!currentUser) return [];
  
  const savesQuery = query(
    collection(db, 'saves'),
    where('saverId', '==', currentUser.uid),
    orderBy('timestamp', 'desc')
  );
  
  const snapshot = await getDocs(savesQuery);
  const savedUserIds = [];
  
  snapshot.forEach(doc => {
    savedUserIds.push(doc.data().savedUserId);
  });
  
  // Get the actual user data for these IDs
  if (savedUserIds.length > 0) {
    const users = await getUsersBatch(savedUserIds);
    return users;
  }
  
  return [];
}

// Get count of profiles current user has saved
async function getUserSavesCount() {
  if (!currentUser) return 0;
  
  const savesQuery = query(
    collection(db, 'saves'),
    where('saverId', '==', currentUser.uid)
  );
  
  const snapshot = await getDocs(savesQuery);
  return snapshot.size;
}

// ==================== IMAGE COMPRESSION ====================
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxSize = 1600;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// ==================== QUICK-VIEW SHEET ====================
function openQuickView(providerId, providerData) {
  currentSheetProvider = { id: providerId, ...providerData };
  
  const portfolioImages = providerData.portfolioImages || [
    'https://ik.imagekit.io/GigsCourt/sample1',
    'https://ik.imagekit.io/GigsCourt/sample2',
    'https://ik.imagekit.io/GigsCourt/sample3'
  ];
  
  const bioPreview = providerData.bio ? providerData.bio.substring(0, 100) + '…' : 'No bio yet.';
  
  sheetContent.innerHTML = `
    <div class="sheet-profile-row">
      <img class="sheet-profile-img" src="${getThumbnailUrl(providerData.profileImage, 200)}">
      <div>
        <h3 style="margin-bottom: 4px;">${providerData.businessName || 'Business'}</h3>
        <div style="color: #4b5563;">⭐ ${providerData.rating || 0} (${providerData.reviewCount || 0}) · 1.2 km</div>
      </div>
    </div>
    <div style="margin: 12px 0; color: #2c3e50;">${(providerData.skills || []).join(' · ')}</div>
    <div style="color: #6b7280; margin-bottom: 16px;">${bioPreview}</div>
    <div class="sheet-portfolio-grid">
      ${portfolioImages.slice(0, 3).map(url => `<img src="${getThumbnailUrl(url, 300)}">`).join('')}
    </div>
    <div class="sheet-buttons" style="display: flex; flex-direction: column; gap: 8px;">
  <div style="display: flex; gap: 10px;">
    <button class="sheet-btn-secondary" id="sheetViewProfileBtn" style="flex: 1;">View Profile</button>
    <button class="sheet-btn-primary" id="sheetMessageBtn" style="flex: 1;">Message</button>
  </div>
  <button class="sheet-btn-secondary" id="sheetDirectionsBtn" style="width: 100%;">🗺️ Directions</button>
</div>
  `;
  
  quickViewSheet.classList.add('active');
  sheetOverlay.classList.add('active');
  
  document.getElementById('sheetMessageBtn')?.addEventListener('click', () => {
  // Save the current tab before opening chat
  const currentTab = document.querySelector('.tab-pane:not(.hidden)').id.replace('Tab', '');
  localStorage.setItem('chatReturnTab', currentTab);
  
  closeQuickView();
  showStartChatModal(providerId, providerData.businessName, providerData.profileImage);
});

  // Directions button functionality
document.getElementById('sheetDirectionsBtn')?.addEventListener('click', () => {
  closeQuickView();
  
  // Switch to search tab to show map
  switchTab('search');
  
  // Get user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const providerLat = providerData.location?.latitude;
      const providerLng = providerData.location?.longitude;
      alert('Provider coordinates: ' + providerLat + ', ' + providerLng);
      alert('Provider name: ' + providerData.businessName);
      
      if (providerLat && providerLng) {
        // Draw route between user and provider
        drawRoute(userLat, userLng, providerLat, providerLng);
      } else {
        alert('Provider location not available');
      }
    }, function(error) {
      alert('Could not get your location. Please enable location services.');
    });
  } else {
    alert('Geolocation is not supported by your browser');
  }
});
  
  document.getElementById('sheetViewProfileBtn')?.addEventListener('click', () => {
  closeQuickView();
  
  // Save the provider we're viewing
  const viewedProvider = currentSheetProvider;
  
  // Get the profile viewer elements
  const profileViewerModal = document.getElementById('profileViewerModal');
  const profileViewerContent = document.getElementById('profileViewerContent');
  
  // Hide main app and show profile viewer
  mainApp.classList.add('hidden');
  profileViewerModal.classList.remove('hidden');
  
  // Create profile HTML
  const portfolioImages = viewedProvider.portfolioImages || [
    'https://ik.imagekit.io/GigsCourt/sample1',
    'https://ik.imagekit.io/GigsCourt/sample2',
    'https://ik.imagekit.io/GigsCourt/sample3'
  ];
  
  const skillsHTML = viewedProvider.skills ? viewedProvider.skills.map(skill => 
    `<span style="background: #f0f3f8; padding: 6px 12px; border-radius: 20px; font-size: 13px; color: #1e1e2f; margin-right: 8px; margin-bottom: 8px; display: inline-block;">${skill}</span>`
  ).join('') : '';
  
  profileViewerContent.innerHTML = `
  <div style="padding: 20px;">
    <!-- Profile Header -->
    <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px;">
      <img src="${getThumbnailUrl(viewedProvider.profileImage, 200)}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
      <div style="display: flex; gap: 24px;">
        <div style="text-align: center;">
          <div style="font-weight: 700; font-size: 18px;">${viewedProvider.jobsDone || 0}</div>
          <div style="font-size: 13px; color: #8e94a7;">jobs</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: 700; font-size: 18px;">${viewedProvider.rating || 0}</div>
          <div style="font-size: 13px; color: #8e94a7;">★</div>
        </div>
        <!-- Only show Saves count (people who saved this profile) - NOT clickable -->
        <div style="text-align: center;">
          <div style="font-weight: 700; font-size: 18px;" id="profileSavesCount">0</div>
          <div style="font-size: 13px; color: #8e94a7;">saves</div>
        </div>
      </div>
    </div>
      
      <!-- Business Name -->
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 2px;">${viewedProvider.businessName || 'Business'}</h2>
      <p style="font-size: 14px; color: #8e94a7; margin-bottom: 12px;">${viewedProvider.username ? '@' + viewedProvider.username : '@user'}</p>
      
      <!-- Bio -->
      <p style="font-size: 14px; line-height: 1.5; margin-bottom: 16px;">${viewedProvider.bio || 'No bio yet.'}</p>
      
      <!-- Skills -->
      ${skillsHTML ? `<div style="margin-bottom: 16px;">${skillsHTML}</div>` : ''}
      
      <!-- Contact -->
${viewedProvider.phoneNumber ? `
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
    <span style="font-size: 16px;">📞</span>
    <span>${viewedProvider.phoneNumber}</span>
  </div>
` : ''}

${viewedProvider.locationDescription ? `
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; cursor: pointer;" id="profileViewerLocation" data-lat="${viewedProvider.location?.latitude}" data-lng="${viewedProvider.location?.longitude}">
    <span style="font-size: 16px;">📍</span>
    <span>${viewedProvider.locationDescription}</span>
  </div>
` : viewedProvider.address ? `
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
    <span style="font-size: 16px;">📍</span>
    <span>${viewedProvider.address}</span>
  </div>
` : ''}
      
      <!-- Action Buttons -->
<div style="display: flex; gap: 10px; margin-bottom: 20px;">
  ${viewedProvider.id !== currentUser?.uid ? `
    <button id="modalMessageBtn" style="flex: 1; background: #666666; color: white; border: none; border-radius: 8px; padding: 10px; font-weight: 600; cursor: pointer;">Message</button>
    <button id="modalSaveBtn" style="flex: 1; background: transparent; border: 1px solid #dbdbdb; border-radius: 8px; padding: 10px; font-weight: 600; cursor: pointer;">Save</button>
  ` : ''}
  <button id="modalShareBtn" style="flex: 1; background: transparent; border: 1px solid #dbdbdb; border-radius: 8px; padding: 10px; font-weight: 600; cursor: pointer;">Share</button>
</div>
      
      <!-- Portfolio Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h4 style="font-size: 16px;">Portfolio <span style="font-size: 14px; color: #6b7280;">(${portfolioImages.length})</span></h4>
      </div>
      
      <!-- Portfolio Grid -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
        ${portfolioImages.map((url, index) => `
          <img src="${getThumbnailUrl(url, 300)}" style="width: 100%; aspect-ratio: 1; border-radius: 18px; object-fit: cover; cursor: pointer;" onclick="openGallery(${JSON.stringify(portfolioImages)}, ${index})">
        `).join('')}
      </div>
    </div>
  `;

    // Load saves count for this profile (people who saved them)
getSaveCount(viewedProvider.id).then(count => {
  const savesCountEl = document.getElementById('profileSavesCount');
  if (savesCountEl) {
    savesCountEl.textContent = count;
  }
});
  
  // Add message button functionality
  const modalMessageBtn = document.getElementById('modalMessageBtn');
  if (modalMessageBtn) {
    modalMessageBtn.addEventListener('click', () => {
      profileViewerModal.classList.add('hidden');
      mainApp.classList.remove('hidden');
      showStartChatModal(viewedProvider.id, viewedProvider.businessName, viewedProvider.profileImage);
    });
  }

    // Add save button functionality
const modalSaveBtn = document.getElementById('modalSaveBtn');
if (modalSaveBtn) {
  // Check initial save status
  checkIfSaved(viewedProvider.id).then(isSaved => {
    if (isSaved) {
      modalSaveBtn.textContent = 'Saved';
      modalSaveBtn.style.background = '#666666';
      modalSaveBtn.style.color = 'white';
      modalSaveBtn.style.border = 'none';
    }
  });
  
  modalSaveBtn.addEventListener('click', async () => {
    const isNowSaved = await toggleSave(viewedProvider.id);
    
    if (isNowSaved) {
      modalSaveBtn.textContent = 'Saved';
      modalSaveBtn.style.background = '#666666';
      modalSaveBtn.style.color = 'white';
      modalSaveBtn.style.border = 'none';
    } else {
      modalSaveBtn.textContent = 'Save';
      modalSaveBtn.style.background = 'transparent';
      modalSaveBtn.style.color = '#1e1e2f';
      modalSaveBtn.style.border = '1px solid #dbdbdb';
    }
    
    // Update the save count in the profile header
    updateProfileSaveCount(viewedProvider.id);
  });
}

    // Make location clickable in profile viewer
const locationDiv = document.getElementById('profileViewerLocation');
if (locationDiv) {
  const lat = locationDiv.dataset.lat;
  const lng = locationDiv.dataset.lng;
  if (lat && lng) {
    locationDiv.addEventListener('click', () => {
      window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`, '_blank');
    });
  }
}
    
  // Add share button functionality
  document.getElementById('modalShareBtn').addEventListener('click', () => {
    alert('Share feature coming soon!');
  });
});
}

function closeQuickView() {
  quickViewSheet.classList.remove('active');
  sheetOverlay.classList.remove('active');
}

// ==================== PULL TO REFRESH - INSTAGRAM STYLE ====================
function createRefreshIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'refresh-indicator';
  indicator.innerHTML = `
    <div class="spinner-small"></div>
    <span>Pull to refresh</span>
  `;
  document.body.appendChild(indicator);
  return indicator;
}

function initPullToRefresh() {
  const tabContent = document.querySelector('.tab-content');
  
  tabContent.addEventListener('touchstart', (e) => {
    const mapElement = document.getElementById('map');
    if (mapElement && mapElement.contains(e.target)) {
      isTouchingMap = true;
      return;
    }
    isTouchingMap = false;
    
    const activeTab = document.querySelector('.tab-pane:not(.hidden)').id;
    if (activeTab === 'searchTab') {
      isPulling = false;
      return;
    }
    
    // Only allow pull-to-refresh if touch starts in top 60px of screen
const touchY = e.touches[0].clientY;
if (tabContent.scrollTop === 0 && touchY < 60) {
  pullStartY = touchY;
  isPulling = true;
}
  }, { passive: true });

  tabContent.addEventListener('touchmove', (e) => {
    const activeTab = document.querySelector('.tab-pane:not(.hidden)').id;
    if (activeTab === 'searchTab') {
      isPulling = false;
      return;
    }
    
    if (isTouchingMap) return;
    if (!isPulling || tabContent.scrollTop > 0) return;
    
    const currentY = e.touches[0].clientY;
    let diff = currentY - pullStartY;
    
    if (diff > 0) {
      e.preventDefault();
      
      let resistance = 1;
      if (diff > 30) resistance = 0.7;
      if (diff > 60) resistance = 0.4;
      if (diff > 90) resistance = 0.25;
      
      const pullDistance = Math.min(diff * resistance, 100);
      
      if (!refreshIndicator) {
        refreshIndicator = createRefreshIndicator();
      }
      
      refreshIndicator.style.transform = `translateY(${pullDistance + 60}px)`;
      
      if (diff > 90) {
        refreshIndicator.querySelector('span').textContent = 'Release to refresh';
      } else {
        refreshIndicator.querySelector('span').textContent = 'Pull to refresh';
      }
    }
  }, { passive: false });

  tabContent.addEventListener('touchend', async (e) => {
    const activeTab = document.querySelector('.tab-pane:not(.hidden)').id;
    if (activeTab === 'searchTab') {
      isPulling = false;
      return;
    }
    
    if (isTouchingMap) {
      isTouchingMap = false;
      return;
    }
    
    if (!isPulling || !refreshIndicator) return;
    
    const endY = e.changedTouches[0].clientY;
    const diff = endY - pullStartY;
    
    if (diff > 100 && tabContent.scrollTop === 0) {
      refreshIndicator.querySelector('span').textContent = 'Refreshing...';
      
      if (activeTab === 'homeTab') {
        await loadProviders(true);
      } else if (activeTab === 'messagesTab') {
        await loadConversations();
      } else if (activeTab === 'profileTab' && currentUser) {
        await loadProfileData();
      }
      
      refreshIndicator.style.transform = 'translateY(60px)';
      setTimeout(() => {
        refreshIndicator.style.transform = 'translateY(-60px)';
        setTimeout(() => {
          if (refreshIndicator) {
            refreshIndicator.remove();
            refreshIndicator = null;
          }
        }, 200);
      }, 500);
    } else {
      if (refreshIndicator) {
        refreshIndicator.style.transform = 'translateY(-60px)';
        setTimeout(() => {
          if (refreshIndicator) {
            refreshIndicator.remove();
            refreshIndicator = null;
          }
        }, 200);
      }
    }
    
    isPulling = false;
  }, { passive: true });
}

// ==================== PROFILE TAB PULL TO REFRESH ====================
function initProfilePullToRefresh() {
  const profileTab = document.getElementById('profileTab');
  
  profileTab.addEventListener('touchstart', (e) => {
    const touchY = e.touches[0].clientY;
if (profileTab.scrollTop === 0 && touchY < 60) {
  profilePullStartY = touchY;
  isPullingProfile = true;
}
  }, { passive: true });

  profileTab.addEventListener('touchmove', (e) => {
    if (!isPullingProfile || profileTab.scrollTop > 0) return;
    
    const currentY = e.touches[0].clientY;
    let diff = currentY - profilePullStartY;
    
    if (diff > 0) {
      e.preventDefault();
      
      let resistance = 1;
      if (diff > 30) resistance = 0.7;
      if (diff > 60) resistance = 0.4;
      if (diff > 90) resistance = 0.25;
      
      const pullDistance = Math.min(diff * resistance, 100);
      
      if (!refreshIndicator) {
        refreshIndicator = createRefreshIndicator();
      }
      
      refreshIndicator.style.transform = `translateY(${pullDistance + 60}px)`;
      
      if (diff > 90) {
        refreshIndicator.querySelector('span').textContent = 'Release to refresh';
      } else {
        refreshIndicator.querySelector('span').textContent = 'Pull to refresh';
      }
    }
  }, { passive: false });

  profileTab.addEventListener('touchend', async (e) => {
    if (!isPullingProfile || !refreshIndicator) return;
    
    const endY = e.changedTouches[0].clientY;
    const diff = endY - profilePullStartY;
    
    if (diff > 100 && profileTab.scrollTop === 0) {
      refreshIndicator.querySelector('span').textContent = 'Refreshing...';
      
      if (currentUser) {
        await loadProfileData();
      }
      
      refreshIndicator.style.transform = 'translateY(60px)';
      setTimeout(() => {
        refreshIndicator.style.transform = 'translateY(-60px)';
        setTimeout(() => {
          if (refreshIndicator) {
            refreshIndicator.remove();
            refreshIndicator = null;
          }
        }, 200);
      }, 500);
    } else {
      if (refreshIndicator) {
        refreshIndicator.style.transform = 'translateY(-60px)';
        setTimeout(() => {
          if (refreshIndicator) {
            refreshIndicator.remove();
            refreshIndicator = null;
          }
        }, 200);
      }
    }
    
    isPullingProfile = false;
  }, { passive: true });
}

// ==================== IMAGEKIT UPLOAD ====================
async function uploadToImageKit(file, type) {
  if (isUploading) {
    alert('Upload already in progress');
    return null;
  }

  if (!currentUser) {
    alert('You must be logged in to upload');
    return null;
  }

  isUploading = true;
  currentUploadType = type;
  uploadProgress.classList.remove('hidden');
  if (uploadError) uploadError.classList.add('hidden');

  try {
    const compressedFile = await compressImage(file);
    
    const authResponse = await fetch('/api/imagekit-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName: file.name })
    });
    
    if (!authResponse.ok) {
      throw new Error('Failed to get upload authentication');
    }
    const authData = await authResponse.json();
    
    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('publicKey', IK_PUBLIC_KEY);
    formData.append('signature', authData.signature);
    formData.append('token', authData.token);
    formData.append('expire', authData.expire);
    formData.append('fileName', file.name);
    formData.append('folder', type === 'profile' ? 'profiles' : 'portfolios');
    formData.append('useUniqueFileName', 'true');

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Full ImageKit error response:', errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    return result.url;

  } catch (error) {
    console.error('Upload error:', error);
    if (uploadError) {
      uploadError.textContent = 'Upload failed: ' + error.message;
      uploadError.classList.remove('hidden');
    }
    return null;
  } finally {
    uploadProgress.classList.add('hidden');
    isUploading = false;
  }
}

// ==================== PROFILE PICTURE ZOOM ====================
if (profileImage) {
  profileImage.addEventListener('click', () => {
    profileViewerImg.src = profileImage.src;
    profileViewer.classList.add('active');
  });
}

if (closeProfileViewer) {
  closeProfileViewer.addEventListener('click', () => {
    profileViewer.classList.remove('active');
  });
}

profileViewer?.addEventListener('click', (e) => {
  if (e.target === profileViewer) {
    profileViewer.classList.remove('active');
  }
});

// ==================== LONG PRESS DELETE ====================
function setupLongPress() {
  const images = document.querySelectorAll('.portfolio-item');
  images.forEach((item, index) => {
    item.addEventListener('touchstart', (e) => {
      longPressTimer = setTimeout(() => {
        const url = item.dataset.url;
        selectedImageIndex = index;
        selectedImageUrl = url;
        deletePortfolioModal.classList.add('active');
        deletePortfolioOverlay.classList.add('active');
        item.classList.add('long-press');
      }, 500);
    });

    item.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
      item.classList.remove('long-press');
    });

    item.addEventListener('touchmove', () => {
      clearTimeout(longPressTimer);
      item.classList.remove('long-press');
    });
    
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-overlay')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    });
  });
}

cancelDeletePortfolio?.addEventListener('click', () => {
  deletePortfolioModal.classList.remove('active');
  deletePortfolioOverlay.classList.remove('active');
});

deletePortfolioOverlay?.addEventListener('click', () => {
  deletePortfolioModal.classList.remove('active');
  deletePortfolioOverlay.classList.remove('active');
});

confirmDeletePortfolio?.addEventListener('click', async () => {
  if (!currentUser || !selectedImageUrl) return;
  
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      portfolioImages: arrayRemove(selectedImageUrl)
    });
    await loadProfileData();
  } catch (err) {
    console.error('Error deleting image:', err);
    alert('Failed to delete image');
  } finally {
    deletePortfolioModal.classList.remove('active');
    deletePortfolioOverlay.classList.remove('active');
  }
});

// ==================== LOAD PROFILE DATA ====================
async function loadProfileData() {
  if (!auth.currentUser) return;
  const userRef = doc(db, 'users', auth.currentUser.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    const newUser = {
      businessName: auth.currentUser.email?.split('@')[0] || 'User',
      email: auth.currentUser.email || '',
      username: auth.currentUser.email?.split('@')[0] || 'user',
      phoneNumber: '',
      address: '',
      skills: [],
      profileImage: DEFAULT_AVATAR,
      rating: 0,
      reviewCount: 0,
      jobsDone: 0,
      location: new GeoPoint(7.0667, 6.2667),
      createdAt: Date.now(),
      portfolioImages: [
        'https://ik.imagekit.io/GigsCourt/sample1',
        'https://ik.imagekit.io/GigsCourt/sample2',
        'https://ik.imagekit.io/GigsCourt/sample3'
      ],
      bio: '',
      signupMethod: 'email',
      emailVerified: true,
      phoneVerified: false,
      businessNameLastChanged: null,
      usernameLastChanged: null
    };
    await setDoc(userRef, newUser);
    userDoc.data = () => newUser;
  }
  
  const data = userDoc.data();
  
  if (profileBusinessName) {
    profileBusinessName.textContent = data.businessName || '';
  }
  
  if (profileUsername) {
    profileUsername.textContent = data.username ? '@' + data.username : '@user';
  }
  
  if (profileJobs) profileJobs.textContent = data.jobsDone || 0;
  if (profileRating) profileRating.textContent = data.rating || 0;
  if (profileReviews) profileReviews.textContent = data.reviewCount || 0;

  // Load counts for your own profile
Promise.all([
  // Count of profiles YOU saved (outgoing)
  getUserSavesCount(),
  // Count of people who saved YOU (incoming)
  getSaveCount(auth.currentUser.uid)
]).then(([savedCount, savesCount]) => {
  // Update "saved" stat (profiles you saved)
  const savedCountEl = document.getElementById('savedCount');
  if (savedCountEl) {
    savedCountEl.textContent = savedCount;
  }
  
  // Update "saves" stat (people who saved you)
  const savesCountEl = document.getElementById('savesCount');
  if (savesCountEl) {
    savesCountEl.textContent = savesCount;
  }
});

// Make "saved" stat clickable (shows profiles you saved)
const savedStat = document.getElementById('savedStat');
if (savedStat) {
  savedStat.addEventListener('click', () => {
    showSavedProfiles(); // This will show profiles YOU saved
  });
}

// Make "saves" stat clickable (shows people who saved you)
const savesStat = document.getElementById('savesStat');
if (savesStat) {
  savesStat.addEventListener('click', () => {
    showSavesProfiles(); // We'll create this function next
  });
}
  
  if (profileBio) {
    profileBio.textContent = data.bio || 'No bio yet.';
  }

  if (profileBio) {
  profileBio.textContent = data.bio || 'No bio yet.';
}

// Load location description
if (data.locationDescription) {
  const addressContainer = document.getElementById('profileAddressContainer');
  const addressEl = document.getElementById('profileAddress');
  if (addressContainer && addressEl) {
    addressEl.textContent = data.locationDescription;
    addressContainer.style.display = 'flex';
  }
}
  
  const profileImageUrl = getThumbnailUrl(data.profileImage, 200);
  if (profileImage) profileImage.src = profileImageUrl;
  
  if (profilePhone && profilePhoneContainer) {
    if (data.phoneNumber) {
      profilePhone.textContent = data.phoneNumber;
      profilePhoneContainer.style.display = 'flex';
    } else {
      profilePhoneContainer.style.display = 'none';
    }
  }
  
  if (profileAddress && profileAddressContainer) {
    if (data.address) {
      profileAddress.textContent = data.address;
      profileAddressContainer.style.display = 'flex';
    } else {
      profileAddressContainer.style.display = 'none';
    }
    // Make location clickable
const addressContainer = document.getElementById('profileAddressContainer');
const addressEl = document.getElementById('profileAddress');
if (addressContainer && addressEl && viewedProvider.location) {
  addressContainer.style.cursor = 'pointer';
  addressContainer.addEventListener('click', () => {
    // Open map at this location
    window.open(`https://www.openstreetmap.org/?mlat=${viewedProvider.location.latitude}&mlon=${viewedProvider.location.longitude}#map=17/${viewedProvider.location.latitude}/${viewedProvider.location.longitude}`, '_blank');
  });
}
  }

  // Display skills on profile page (non-editable)
const profileSkillsContainer = document.getElementById('profileSkillsContainer');
if (!profileSkillsContainer) {
  // Create skills container if it doesn't exist
  const skillsSection = document.createElement('div');
  skillsSection.className = 'profile-skills';
  skillsSection.id = 'profileSkillsContainer';
  skillsSection.innerHTML = `
    <div style="padding: 0 16px 16px;">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #666;">Services</div>
      <div id="profileSkillsList" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
    </div>
  `;
  
  // Insert after bio or contact section
  const bioSection = document.querySelector('.profile-bio');
  if (bioSection) {
    bioSection.insertAdjacentElement('afterend', skillsSection);
  } else {
    document.querySelector('.profile-name-section').insertAdjacentElement('afterend', skillsSection);
  }
}

// Populate skills
const skillsList = document.getElementById('profileSkillsList');
if (skillsList && data.skills) {
  skillsList.innerHTML = '';
  data.skills.forEach(skill => {
    const skillTag = document.createElement('span');
    skillTag.style.cssText = 'background: #f0f3f8; padding: 6px 12px; border-radius: 20px; font-size: 13px; color: #1e1e2f;';
    skillTag.textContent = skill;
    skillsList.appendChild(skillTag);
  });
}
  
  const portfolio = data.portfolioImages || [
    'https://ik.imagekit.io/GigsCourt/sample1',
    'https://ik.imagekit.io/GigsCourt/sample2',
    'https://ik.imagekit.io/GigsCourt/sample3'
  ];
  
  const portfolioCount = document.getElementById('portfolioCount');
  if (portfolioCount) {
    portfolioCount.textContent = `(${portfolio.length})`;
  }
  
  if (portfolioGrid) {
    portfolioGrid.innerHTML = '';
    portfolioStartIndex = 0;
    
    function loadMorePortfolio() {
      const nextBatch = portfolio.slice(portfolioStartIndex, portfolioStartIndex + portfolioBatchSize);
      nextBatch.forEach((url, index) => {
        const actualIndex = portfolioStartIndex + index;
        const item = document.createElement('div');
        item.className = 'portfolio-item';
        item.dataset.url = url;
        item.dataset.index = actualIndex;
        
        const img = document.createElement('img');
        img.src = getThumbnailUrl(url, 300);
        img.loading = 'lazy';
        img.classList.add('lazy-load');
        
        img.onload = () => img.classList.add('loaded');
        
        img.addEventListener('click', () => {
          openGallery(portfolio, actualIndex);
        });
        
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-overlay';
        deleteBtn.innerHTML = '×';
        
        item.appendChild(img);
        item.appendChild(deleteBtn);
        portfolioGrid.appendChild(item);
      });
      portfolioStartIndex += nextBatch.length;
    }
    
    loadMorePortfolio();
    
    portfolioGrid.addEventListener('scroll', () => {
      if (portfolioGrid.scrollTop + portfolioGrid.clientHeight >= portfolioGrid.scrollHeight - 100) {
        if (portfolioStartIndex < portfolio.length) {
          loadMorePortfolio();
        }
      }
    });
  }

  setupLongPress();
}

// ==================== PHOTOSWIPE GALLERY - INSTAGRAM STYLE ====================
function openGallery(images, startIndex = 0) {
  // Make sure images is an array
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch (e) {
      console.error('Invalid images array');
      return;
    }
  }
  
  if (!Array.isArray(images)) {
    console.error('Images is not an array');
    return;
  }
  
  if (typeof PhotoSwipeLightbox === 'undefined' || typeof PhotoSwipe === 'undefined') {
    alert('Gallery viewer not ready');
    return;
  }
  
  try {
    const dataSource = images.map(url => ({
      src: getThumbnailUrl(url, 1600),
      width: 1600,
      height: 1600,
      alt: 'Portfolio image',
      thumb: getThumbnailUrl(url, 300)
    }));
    
    const lightbox = new PhotoSwipeLightbox({
      dataSource: dataSource,
      index: startIndex,
      pswpModule: PhotoSwipe,
      bgOpacity: 0.95,
      loop: true,
      preload: [1, 2],
      closeOnVerticalDrag: true,
      wheelToZoom: false,
      pinchToClose: true,
      tapToClose: true,
      tapToToggleControls: true,
      
      // Instagram style settings
      arrowKeys: true,
      closeOnScroll: false,
      imageClickAction: 'zoom',
      toggleControlsOnTap: true,
      
      // Better mobile experience
      showHideAnimationType: 'fade',
      zoom: true,
      doubleTapAction: 'zoom'
    });
    
    lightbox.init();
    lightbox.loadAndOpen(startIndex);
  } catch (err) {
    console.error('Gallery error:', err);
    alert('Could not open gallery');
  }
}


// ==================== LOAD PROVIDERS ====================
async function loadProviders(reset = false) {
  if (reset) { lastVisible = null; homeGrid.innerHTML = ''; }
  if (loadingMore) return;
  loadingMore = true;
  try {
    let q = query(collection(db, 'users'), orderBy('rating', 'desc'), limit(6));
    if (lastVisible) q = query(q, startAfter(lastVisible));
    const snap = await getDocs(q);
    if (!snap.empty) {
      lastVisible = snap.docs[snap.docs.length - 1];
      snap.forEach(doc => {
        const d = doc.data();
        addProviderCard(doc.id, d, 'home');
      });
    }
  } finally { loadingMore = false; }
}

// ==================== ADD PROVIDER CARD ====================
function addProviderCard(id, d, source) {
  const card = document.createElement('div');
  card.className = 'provider-card';
  
  const distance = calculateDistance(d.location);
  const profileImageUrl = getThumbnailUrl(d.profileImage, 400);
  
  card.innerHTML = `
    <img class="card-img" src="${profileImageUrl}" loading="lazy">
    <div class="business-name">${d.businessName}</div>
    <div class="rating-row"><span class="star">⭐</span> ${d.rating} (${d.reviewCount})</div>
    <div class="distance" data-id="${id}" data-lat="${d.location?.latitude}" data-lng="${d.location?.longitude}" data-source="${source}">${distance} km</div>
    <div class="skills">${d.skills.slice(0, 2).join(', ')}${d.skills.length > 2 ? '…' : ''}</div>
  `;
  
  card.addEventListener('click', (e) => {
    if (!e.target.classList.contains('distance')) {
      openQuickView(id, d);
    }
  });
  
  homeGrid.appendChild(card);
}

// ==================== CALCULATE DISTANCE ====================
function calculateDistance(location) {
  if (!location) return (Math.random() * 3 + 0.5).toFixed(1);
  const distance = Math.sqrt(
    Math.pow((location.latitude - 7.0667) * 111, 2) + 
    Math.pow((location.longitude - 6.2667) * 111, 2)
  );
  return distance.toFixed(1);
}

// ==================== HIGHLIGHT PROVIDER ON MAP ====================
async function highlightProviderOnMap(lat, lng, providerId) {
  if (document.getElementById('searchTab').classList.contains('hidden')) {
    switchTab('search');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  map.setView([lat, lng], 15);
  
  if (currentHighlightedMarker) {
    const prevElement = currentHighlightedMarker.getElement();
    if (prevElement) {
      prevElement.classList.remove('highlighted-pin', 'pulse-marker');
    }
  }
  
  mapMarkers.forEach(marker => {
    const markerLatLng = marker.getLatLng();
    if (Math.abs(markerLatLng.lat - lat) < 0.0001 && Math.abs(markerLatLng.lng - lng) < 0.0001) {
      const markerElement = marker.getElement();
      if (markerElement) {
        markerElement.classList.add('highlighted-pin', 'pulse-marker');
        currentHighlightedMarker = marker;
      }
      marker.openPopup();
    }
  });
}

// ==================== LOAD ALL USERS ====================
async function loadAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  allUsers = [];
  snap.forEach(doc => {
    allUsers.push({ id: doc.id, ...doc.data() });
    userCache.set(doc.id, doc.data());
  });
  return allUsers;
}

// ==================== FILTER USERS ====================
function filterUsers() {
  return allUsers.filter(user => {
    if (!user.location) return false;
    
    if (aktuellesSuchwort) {
      const suchwortLower = aktuellesSuchwort.toLowerCase();
      const skillMatch = user.skills?.some(skill => 
        skill.toLowerCase().includes(suchwortLower)
      );
      if (!skillMatch) return false;
    }
    
    const distance = Math.sqrt(
      Math.pow((user.location.latitude - 7.0667) * 111, 2) + 
      Math.pow((user.location.longitude - 6.2667) * 111, 2)
    );
    if (distance > aktuellerRadius) return false;
    
    return true;
  });
}

// ==================== UPDATE MAP ====================
async function updateMapAndList() {
  const filtered = filterUsers();
  
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];

  filtered.forEach(user => {
    const rating = user.rating || 0;
    
    const iconHtml = `
      <div class="marker-container">
        <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" class="marker-pin">
        <div class="rating-badge">${rating}</div>
      </div>
    `;
    
    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-marker',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -41]
    });

    const marker = L.marker([user.location.latitude, user.location.longitude], { icon: customIcon }).addTo(map);
    
    const popupContent = document.createElement('div');
    popupContent.innerHTML = `
      <b>${user.businessName}</b><br>
      ⭐ ${user.rating} (${user.reviewCount})<br>
      <button class="quick-view-btn" data-id="${user.id}" style="background:#0066ff;color:white;border:none;border-radius:20px;padding:8px 16px;margin-top:8px;width:100%;">View</button>
    `;
    
    marker.bindPopup(popupContent);
    
    marker.on('popupopen', () => {
      const viewBtn = document.querySelector('.quick-view-btn');
      if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          openQuickView(id, user);
          map.closePopup();
        });
      }
    });
    
    mapMarkers.push(marker);
  });

  if (filtered.length === 0) {
    providerListDrawer.innerHTML = `
      <div class="pull-handle"></div>
      <div class="empty-state">
        No providers found matching "${aktuellesSuchwort || 'all services'}" within ${aktuellerRadius}km
      </div>
    `;
  } else {
    providerListDrawer.innerHTML = '<div class="pull-handle"></div>';
    filtered.forEach(user => {
      const distance = Math.sqrt(
        Math.pow((user.location.latitude - 7.0667) * 111, 2) + 
        Math.pow((user.location.longitude - 6.2667) * 111, 2)
      ).toFixed(1);
      
      const profileImageUrl = getThumbnailUrl(user.profileImage, 100);
      
      const item = document.createElement('div');
      item.className = 'provider-list-item';
      item.innerHTML = `
        <img src="${profileImageUrl}">
        <div>
          <strong>${user.businessName}</strong><br>
          <span style="color: #6b7280;">⭐ ${user.rating} (${user.reviewCount}) · <span class="distance" data-id="${user.id}" data-lat="${user.location.latitude}" data-lng="${user.location.longitude}" data-source="search">${distance}km</span></span>
        </div>
      `;
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('distance')) {
          openQuickView(user.id, user);
        }
      });
      providerListDrawer.appendChild(item);
    });
  }
}

// ==================== SHOW START CHAT MODAL ====================
function showStartChatModal(userId, userName, userImage) {
  pendingChatUserId = userId;
  pendingChatUserName = userName;
  pendingChatUserImage = userImage;
  // Skip the modal and go straight to chat
  startChat();
}

// ==================== START CHAT ====================
async function startChat() {
  if (!pendingChatUserId) return;
  
  startChatModal.classList.add('hidden');
  
  if (!currentUser) return;
  
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', currentUser.uid)
  );
  
  const snapshot = await getDocs(q);
  let existingChat = null;
  
  snapshot.forEach(doc => {
    const chat = doc.data();
    if (chat.participants.includes(pendingChatUserId)) {
      existingChat = { id: doc.id, ...chat };
    }
  });
  
  if (existingChat) {
    currentChatId = existingChat.id;
  } else {
    const newChatRef = await addDoc(collection(db, 'chats'), {
      participants: [currentUser.uid, pendingChatUserId],
      createdAt: Timestamp.now(),
      lastMessage: '',
      lastMessageTimestamp: Timestamp.now(),
      lastMessageSender: ''
    });
    currentChatId = newChatRef.id;
  }
  
  currentChatPartner = { 
    id: pendingChatUserId, 
    name: pendingChatUserName, 
    image: pendingChatUserImage 
  };
  
  switchTab('messages');
  setTimeout(openChat, 100);
}

// ==================== GET USER DATA BATCH ====================
async function getUsersBatch(userIds) {
  const users = [];
  const uncached = [];
  const validUserIds = userIds.filter(id => id != null);
  validUserIds.forEach(id => {
    if (userCache.has(id)) {
      users.push({ id, ...userCache.get(id) });
    } else {
      uncached.push(id);
    }
  });
  
  if (uncached.length > 0) {
    const q = query(collection(db, 'users'), where('__name__', 'in', uncached.slice(0, 10)));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      userCache.set(doc.id, doc.data());
      users.push({ id: doc.id, ...doc.data() });
    });
  }
  
  return users;
}

// ==================== MESSAGING FUNCTIONS ====================
async function loadConversations() {
  if (!currentUser) return;

  // Add back button at the top of messages tab
const messagesTab = document.getElementById('messagesTab');
const existingBackBtn = document.getElementById('messagesBackBtn');
if (!existingBackBtn) {
  const backBtnContainer = document.createElement('div');
  backBtnContainer.id = 'messagesBackBtn';
  backBtnContainer.style.cssText = `
    position: sticky;
    top: 0;
    background: white;
    padding: 12px 16px;
    border-bottom: 1px solid #efefef;
    z-index: 100;
    display: flex;
    align-items: center;
  `;
  backBtnContainer.innerHTML = `
    <button style="background:none; border:none; font-size:24px; padding:8px; margin-right:8px; cursor:pointer;">←</button>
    <span style="font-size:18px; font-weight:600;">Messages</span>
  `;
  
  const backButton = backBtnContainer.querySelector('button');
backButton.addEventListener('click', () => {
  const lastTab = localStorage.getItem('lastNonMessagesTab') || 'home';
  switchTab(lastTab);
});
  
  messagesTab.insertBefore(backBtnContainer, messagesTab.firstChild);
}
  
  conversationsList.innerHTML = '<div class="empty-state">Loading...</div>';
  
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', currentUser.uid),
    orderBy('lastMessageTimestamp', 'desc'),
    limit(20)
  );
  
  if (unsubscribeConversations) {
    unsubscribeConversations();
  }
  
  unsubscribeConversations = onSnapshot(q, async (snapshot) => {
    if (snapshot.empty) {
      conversationsList.innerHTML = '<div class="empty-state">No conversations yet</div>';
      return;
    }
    
    const chats = [];
    const userIds = [];
    
    snapshot.forEach(doc => {
      const chat = doc.data();
      const otherUserId = chat.participants.find(id => id !== currentUser.uid);
      userIds.push(otherUserId);
      chats.push({ id: doc.id, ...chat, otherUserId });
    });
    
    const users = await getUsersBatch(userIds);
    const userMap = new Map(users.map(u => [u.id, u]));
    
    let html = '';
    
    chats.forEach(chat => {
      const userData = userMap.get(chat.otherUserId);
      if (!userData) return;
      
      const profileImageUrl = getThumbnailUrl(userData.profileImage, 100);
      
      const time = chat.lastMessageTimestamp?.toDate() || new Date();
      const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const lastMessage = chat.lastMessage || 'No messages yet';
      const tick = chat.lastMessageSender === currentUser.uid ? '<span class="blue-tick">✓✓</span>' : '';
      
      html += `
        <div class="conversation-item" data-chat-id="${chat.id}" data-user-id="${chat.otherUserId}" data-user-name="${userData.businessName}" data-user-image="${userData.profileImage}">
          <img src="${profileImageUrl}" class="conversation-img" loading="lazy">
          <div class="conversation-details">
            <div class="conversation-name">${userData.businessName}</div>
            <div class="last-message">
              ${tick} ${lastMessage}
            </div>
          </div>
          <div class="timestamp">${timeStr}</div>
        </div>
      `;
    });
    
    conversationsList.innerHTML = html;
    
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        currentChatId = item.dataset.chatId;
        currentChatPartner = {
          id: item.dataset.userId,
          name: item.dataset.userName,
          image: item.dataset.userImage
        };
        openChat();
      });
    });
  });
}

function openChat() {
  const profileImageUrl = getThumbnailUrl(currentChatPartner.image, 100);
  chatPartnerImg.src = profileImageUrl;
  chatPartnerName.textContent = currentChatPartner.name;
  
  messagesTab.classList.add('hidden');
  mainApp.classList.add('hidden');
  chatView.classList.remove('hidden');
  
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }
  
  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', currentChatId),
    orderBy('timestamp', 'asc')
  );
  
  messagesContainer.innerHTML = '<div class="empty-state">Loading messages...</div>';
  
  unsubscribeMessages = onSnapshot(q, async (snapshot) => {
    if (snapshot.empty) {
      messagesContainer.innerHTML = '<div class="empty-state">No messages yet. Say hello!</div>';
      return;
    }
    
    const batch = writeBatch(db);
    let hasUnread = false;
    
    snapshot.forEach(doc => {
      const msg = doc.data();
      if (msg.senderId !== currentUser.uid && !msg.read) {
        batch.update(doc.ref, { read: true });
        hasUnread = true;
      }
    });
    
    if (hasUnread) {
      await batch.commit();
    }
    
    let html = '';
    snapshot.forEach(doc => {
      const msg = doc.data();
      const time = msg.timestamp?.toDate() || new Date();
      const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const tickClass = msg.read ? 'tick-red' : 'tick-white';
      
      html += `
        <div class="message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}">
          <div>${msg.text}</div>
          <div class="message-time">
            ${timeStr}
            ${msg.senderId === currentUser.uid ? `<span class="${tickClass}">✓✓</span>` : ''}
          </div>
        </div>
      `;
    });
    
    messagesContainer.innerHTML = html;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

// ==================== SEND MESSAGE ====================
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChatId || !currentUser) return;
  
  messageInput.value = '';
  
  try {
    await addDoc(collection(db, 'messages'), {
      chatId: currentChatId,
      senderId: currentUser.uid,
      text: text,
      timestamp: Timestamp.now(),
      read: false
    });
    
    await updateDoc(doc(db, 'chats', currentChatId), {
      lastMessage: text,
      lastMessageTimestamp: Timestamp.now(),
      lastMessageSender: currentUser.uid
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message');
    messageInput.value = text;
  }
}

// ==================== INIT MAP ====================
async function initMap() {
  if (map) return;
  
  // Create map with smoother zoom and better controls
  map = L.map('map', {
  zoomControl: false,
  fadeAnimation: true,
  zoomAnimation: true,
  markerZoomAnimation: true,
  rotate: true,           // Enable rotation
  bearing: 0,             // Initial bearing (0 = north)
  trackResize: true,
  rotateControl: true,    // Show rotation control
  touchRotate: true,      // Enable touch rotation (two-finger rotate)
  shiftKeyRotate: true    // Enable shift+click drag rotation
}).setView([7.0667, 6.2667], 12);
  
  // Add standard OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 20
}).addTo(map);
  
  // Add custom zoom control (modern position)
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);
  
  // Add scale bar
  L.control.scale({
    imperial: false,
    metric: true,
    position: 'bottomleft'
  }).addTo(map);

  // Get user's current location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        // Set map view to user's location with zoom level 14
        map.setView([userLat, userLng], 14);
        
        // Add a pulsing blue dot for user location
        L.circleMarker([userLat, userLng], {
          color: '#4287f5',
          fillColor: '#4287f5',
          fillOpacity: 0.8,
          radius: 8,
          weight: 2,
          opacity: 1
        }).addTo(map).bindPopup('You are here');
        
        console.log('Map centered to your location');
      },
      function(error) {
        console.log('Could not get location. Using default view.');
        // Keep default view if location access denied
      }
    );
  } else {
    console.log('Geolocation not supported');
  }
  
  await loadAllUsers();
  await updateMapAndList();
}



// ==================== FILE INPUT HANDLER ====================
fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  if (currentUploadType === 'portfolio') {
    for (const file of files) {
      const url = await uploadToImageKit(file, 'portfolio');
      if (url) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          portfolioImages: arrayUnion(url)
        });
      }
    }
    await loadProfileData();
  } 
  else if (currentUploadType === 'profile' && files[0]) {
    const url = await uploadToImageKit(files[0], 'profile');
    if (url) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        profileImage: url
      });
      profileImage.src = getThumbnailUrl(url, 200);
    }
  }

  fileInput.value = '';
});

// ==================== PROFILE PICTURE UPLOAD ====================
if (uploadProfilePicBtn) {
  uploadProfilePicBtn.addEventListener('click', () => {
    if (!currentUser) {
      alert('Please log in first');
      return;
    }
    currentUploadType = 'profile';
    fileInput.removeAttribute('multiple');
    fileInput.click();
  });
}

// ==================== PORTFOLIO IMAGE UPLOAD ====================
if (addPortfolioBtn) {
  addPortfolioBtn.addEventListener('click', () => {
    if (!currentUser) {
      alert('Please log in first');
      return;
    }
    currentUploadType = 'portfolio';
    fileInput.setAttribute('multiple', 'multiple');
    fileInput.click();
  });
}

// ==================== TAB FUNCTIONS ====================
function saveCurrentTab(tabId) {
  localStorage.setItem('currentTab', tabId);
}

function getSavedTab() {
  return localStorage.getItem('currentTab') || 'home';
}

function switchTab(tabId) {
  // Save the previous tab before switching to messages
if (tabId !== 'messages') {
  localStorage.setItem('lastNonMessagesTab', tabId);
}
  
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
  document.getElementById(tabId + 'Tab').classList.remove('hidden');
  document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-item[data-tab="${tabId}"]`).classList.add('active');
  saveCurrentTab(tabId); 
  if (tabId === 'profile') loadProfileData();
  if (tabId === 'search') {
  destroySearchMap();
  setTimeout(initMap, 300);
}
  if (tabId === 'messages') {
    loadConversations();
  } if (tabId === 'admin') {
    loadPendingSkills();
  }
}

let lastTapTime = 0;
let lastTapTab = '';

document.querySelectorAll('.tab-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const tabId = btn.dataset.tab;
    const now = Date.now();
    
    // Check if tab element exists
    const tabElement = document.getElementById(tabId + 'Tab');
    if (!tabElement) return;
    
    const isActive = !tabElement.classList.contains('hidden');
    
    if (isActive) {
      // If already on this tab
      if (tabId === 'home') {
        // Single tap on Home tab refreshes
        loadProviders(true);
      } else if (tabId === 'search') {
        // Single tap on Search tab refreshes map
        loadAllUsers().then(() => updateMapAndList());
      } else {
        // For other tabs, just scroll to top
        tabElement.scrollTop = 0;
      }
    } else {
      // Switching to a different tab
      switchTab(tabId);
    }
    
    lastTapTime = now;
    lastTapTab = tabId;
  });
});

// ==================== EDGE SWIPE ====================
let touchStartX = 0, touchStartY = 0;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  
  const mapElement = document.getElementById('map');
  if (mapElement && mapElement.contains(e.target)) {
    touchOnMap = true;
  } else {
    touchOnMap = false;
  }
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (touchOnMap) return;
  
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const width = window.innerWidth;
  
  if (Math.abs(dx) > 50 && Math.abs(dy) < 70 && (touchStartX < width * 0.15 || touchStartX > width * 0.85)) {
    const tabs = ['home', 'search', 'messages', 'profile', 'admin'];
    
    // Find current tab safely
    let current = null;
    for (let t of tabs) {
      const tabElement = document.getElementById(t + 'Tab');
      if (tabElement && !tabElement.classList.contains('hidden')) {
        current = t;
        break;
      }
    }
    
    if (!current) return;
    
    const idx = tabs.indexOf(current);
    if (dx > 0 && idx > 0) {
      switchTab(tabs[idx - 1]);
    } else if (dx < 0 && idx < tabs.length - 1) {
      switchTab(tabs[idx + 1]);
    }
  }
}, { passive: true });

// ==================== DISTANCE CLICK HANDLER ====================
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('distance')) {
    const lat = parseFloat(e.target.dataset.lat);
    const lng = parseFloat(e.target.dataset.lng);
    const id = e.target.dataset.id;
    
    if (lat && lng) {
      highlightProviderOnMap(lat, lng, id);
    }
  }
});

// ==================== CLOSE QUICK-VIEW ====================
sheetOverlay.addEventListener('click', closeQuickView);

// ==================== AUTH UI ====================
document.getElementById('toggleEmailSignup').addEventListener('click', () => {
  document.getElementById('toggleEmailSignup').classList.add('active');
  document.getElementById('togglePhoneSignup').classList.remove('active');
  emailSignupView.classList.remove('hidden');
  phoneSignupView.classList.add('hidden');
});

document.getElementById('togglePhoneSignup').addEventListener('click', () => {
  document.getElementById('togglePhoneSignup').classList.add('active');
  document.getElementById('toggleEmailSignup').classList.remove('active');
  phoneSignupView.classList.remove('hidden');
  emailSignupView.classList.add('hidden');
});

document.getElementById('gotoLoginFromSignup').addEventListener('click', () => {
  emailSignupView.classList.add('hidden');
  phoneSignupView.classList.add('hidden');
  loginView.classList.remove('hidden');
});

document.getElementById('gotoLoginFromPhone').addEventListener('click', () => {
  emailSignupView.classList.add('hidden');
  phoneSignupView.classList.add('hidden');
  loginView.classList.remove('hidden');
});

document.getElementById('gotoSignupFromLogin').addEventListener('click', () => {
  loginView.classList.add('hidden');
  emailSignupView.classList.remove('hidden');
  phoneSignupView.classList.add('hidden');
});

// ==================== SKILLS ====================
document.querySelectorAll('#emailSkillsContainer .skill-tag').forEach(tag => {
  tag.addEventListener('click', () => {
    const skill = tag.dataset.skill;
    if (selectedEmailSkills.has(skill)) {
      selectedEmailSkills.delete(skill);
      tag.classList.remove('selected');
    } else {
      selectedEmailSkills.add(skill);
      tag.classList.add('selected');
    }
  });
});

// ==================== EMAIL SIGNUP ====================
document.getElementById('signupWithEmailBtn').addEventListener('click', async () => {
  const businessName = document.getElementById('emailBusinessName').value;
  const email = document.getElementById('emailAddress').value;
  const password = document.getElementById('emailPassword').value;
  const selectedSkills = Array.from(selectedEmailSkills);
  
  // Get custom skills from the new input
  const customSkillInput = document.getElementById('customSkillInput').value;
  let customSkills = [];
  
  if (customSkillInput.trim() !== '') {
    // Split by commas and trim each skill
    customSkills = customSkillInput.split(',').map(skill => skill.trim()).filter(skill => skill !== '');
  }

  // Combine selected and custom skills
  const allSkills = [...selectedSkills, ...customSkills];

  if (!businessName || !email || !password || allSkills.length === 0) {
    authError.textContent = 'Business name, email, password and at least one service are required';
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    // Prepare skills array with pending status for custom skills
    const skillsWithStatus = selectedSkills.map(skill => ({ name: skill, approved: true }));
    
    // Add custom skills as pending
    customSkills.forEach(skill => {
      skillsWithStatus.push({ name: skill, approved: false });
    });

    await setDoc(doc(db, 'users', cred.user.uid), {
      businessName,
      email,
      phoneNumber: '',
      skills: allSkills, // Keep simple array for backward compatibility
      skillsWithStatus, // New array with approval status
      pendingSkills: customSkills, // Store pending skills separately for admin
      profileImage: DEFAULT_AVATAR,
      rating: 0,
      reviewCount: 0,
      jobsDone: 0,
      location: new GeoPoint(7.0667, 6.2667),
      createdAt: Date.now(),
      portfolioImages: [
        'https://ik.imagekit.io/GigsCourt/sample1',
        'https://ik.imagekit.io/GigsCourt/sample2',
        'https://ik.imagekit.io/GigsCourt/sample3'
      ],
      bio: '',
      signupMethod: 'email',
      emailVerified: false,
      phoneVerified: false
    });

    // Show pending message if they added custom skills
   if (customSkills.length > 0) {
      alert(`Your custom services (${customSkills.join(', ')}) have been submitted for approval. You'll be notified when they're approved.`);
    }

    await sendEmailVerification(cred.user);
    emailSignupView.classList.add('hidden');
    phoneSignupView.classList.add('hidden');
    verifyView.classList.remove('hidden');
  } catch (err) {
    authError.textContent = err.message;
  }
});

// ==================== LOGIN ====================
document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginError.textContent = err.message;
  }
});

// ==================== VERIFICATION ====================
document.getElementById('checkVerificationBtn').addEventListener('click', async () => {
  if (auth.currentUser) {
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      verifyView.classList.add('hidden');
      authContainer.classList.add('hidden');
      mainApp.classList.remove('hidden');
      switchTab(getSavedTab());
    } else {
      alert('Email not verified yet');
    }
  }
});

document.getElementById('resendVerifyBtn').addEventListener('click', async () => {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
    alert('Verification email resent!');
  }
});

// ==================== LOGOUT ====================
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
  });
}

// ==================== DELETE ACCOUNT ====================
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener('click', () => {
    deleteModal.classList.remove('hidden');
  });
}

// ==================== DELETE MODAL ====================
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
  });
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid));
      await deleteUser(auth.currentUser);
      deleteModal.classList.add('hidden');
    } catch (err) {
      alert('Error deleting account');
    }
  });
}

// ==================== SAVE BIO ====================
const saveBioBtn = document.getElementById('saveBioBtn');
if (saveBioBtn) {
  saveBioBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return;
    const bioTextarea = document.getElementById('bioTextarea');
    if (bioTextarea) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { bio: bioTextarea.value });
      alert('Bio saved');
    }
  });
}

// ==================== REVIEW ====================
const submitReviewBtn = document.getElementById('submitReviewBtn');
if (submitReviewBtn) {
  submitReviewBtn.addEventListener('click', () => {
    alert('Review submitted (demo)');
  });
}

// ==================== SEARCH CONTROLS ====================
if (radiusSlider) {
  let sliderTimeout;
  radiusSlider.addEventListener('input', (e) => {
    aktuellerRadius = parseInt(e.target.value);
    radiusValue.textContent = aktuellerRadius;
    
    clearTimeout(sliderTimeout);
    sliderTimeout = setTimeout(async () => {
      if (map) await updateMapAndList();
    }, 150);
  });
}

if (skillSearch) {
  skillSearch.addEventListener('input', async (e) => {
    aktuellesSuchwort = e.target.value;
    if (map) await updateMapAndList();
  });
}

// ==================== CHAT CONTROLS ====================
if (sendMessageBtn) {
  sendMessageBtn.addEventListener('click', sendMessage);
}

if (messageInput) {
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });
}

if (backToConversations) {
  backToConversations.addEventListener('click', () => {
    chatView.classList.add('hidden');
    mainApp.classList.remove('hidden');
    
    // Check if we came from a specific tab via quick view
    const returnTab = localStorage.getItem('chatReturnTab');
    if (returnTab) {
      // Clear it so it doesn't affect future chats
      localStorage.removeItem('chatReturnTab');
      // Switch to that tab
      switchTab(returnTab);
    } else {
      // Default to messages tab if no saved tab
      messagesTab.classList.remove('hidden');
    }
    
    if (unsubscribeMessages) {
      unsubscribeMessages();
    }
  });
}

// ==================== KEYBOARD DISMISS ====================
document.addEventListener('touchstart', (e) => {
  if (chatView.classList.contains('hidden')) return;
  
  const isInput = e.target === messageInput;
  const isSendButton = e.target === sendMessageBtn;
  
  if (!isInput && !isSendButton) {
    messageInput.blur();
  }
}, { passive: true });

// ==================== START CHAT MODAL CONTROLS ====================
if (cancelStartChatBtn) {
  cancelStartChatBtn.addEventListener('click', () => {
    startChatModal.classList.add('hidden');
    pendingChatUserId = null;
  });
}

if (confirmStartChatBtn) {
  confirmStartChatBtn.addEventListener('click', startChat);
}

// ==================== INFINITE SCROLL ====================
const sentinel = document.getElementById('sentinel');
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !loadingMore) loadProviders();
}, { threshold: 0.1 });
observer.observe(sentinel);

// ==================== ADMIN FUNCTIONS ====================
async function loadPendingSkills() {
  if (!currentUser || currentUser.email !== 'agboghidiaugust@gmail.com') return;
  
  const adminTab = document.getElementById('adminTab');
adminTab.innerHTML = '<div style="padding:20px"><h2>Pending Services</h2><div id="pendingList"></div></div>';
  
  const usersSnap = await getDocs(collection(db, 'users'));
  let html = '';
  
  usersSnap.forEach(doc => {
    const data = doc.data();
    if (data.pendingSkills && data.pendingSkills.length > 0) {
      html += `<div style="background:#f0f0f0;margin:10px;padding:10px;border-radius:10px">`;
      html += `<h3>${data.businessName}</h3>`;
      data.pendingSkills.forEach(skill => {
        html += `
          <div style="margin:5px 0">
            <span style="background:#ffd700;padding:5px">${skill}</span>
            <button onclick="approveSkill('${doc.id}','${skill}')" style="background:green;color:white;margin:5px">✓ Approve</button>
            <button onclick="editSkill('${doc.id}','${skill}')" style="background:blue;color:white;margin:5px">✎ Edit</button>
          </div>
        `;
      });
      html += `</div>`;
    }
  });
  
  document.getElementById('pendingList').innerHTML = html || '<p>No pending services</p>';
}

window.approveSkill = async (userId, skill) => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const data = userDoc.data();
  
  await updateDoc(userRef, {
    pendingSkills: data.pendingSkills.filter(s => s !== skill),
    skills: [...(data.skills || []), skill]
  });
  
  // ===== SEND NOTIFICATION DM =====
  try {
    // Check if there's already a chat with this user
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', currentUser.uid));
    const chatsSnap = await getDocs(q);
    
    let chatId = null;
    chatsSnap.forEach(doc => {
      const chat = doc.data();
      if (chat.participants.includes(userId)) {
        chatId = doc.id;
      }
    });
    
    // If no chat exists, create one
    if (!chatId) {
      const newChat = await addDoc(chatsRef, {
        participants: [currentUser.uid, userId],
        createdAt: Timestamp.now(),
        lastMessage: `Your service "${skill}" was approved!`,
        lastMessageTimestamp: Timestamp.now(),
        lastMessageSender: currentUser.uid
      });
      chatId = newChat.id;
    }
    
    // Send the approval message
    await addDoc(collection(db, 'messages'), {
      chatId: chatId,
      senderId: currentUser.uid,
      text: `✅ Your service "${skill}" has been approved and is now live on your profile!`,
      timestamp: Timestamp.now(),
      read: false
    });
    
    // Update chat's last message
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: `✅ Your service "${skill}" was approved`,
      lastMessageTimestamp: Timestamp.now(),
      lastMessageSender: currentUser.uid
    });
    
  } catch (error) {
    console.error('Error sending notification:', error);
  }
  // ===== END NOTIFICATION =====
  
  alert(`Service "${skill}" approved and user notified!`);
  loadPendingSkills();
};

window.editSkill = async (userId, oldSkill) => {
  const newSkill = prompt('Edit service:', oldSkill);
  if (!newSkill) return;
  
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const data = userDoc.data();
  
  await updateDoc(userRef, {
    pendingSkills: data.pendingSkills.map(s => s === oldSkill ? newSkill : s)
  });
  
  // ===== SEND NOTIFICATION DM =====
  try {
    // Check if there's already a chat with this user
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', currentUser.uid));
    const chatsSnap = await getDocs(q);
    
    let chatId = null;
    chatsSnap.forEach(doc => {
      const chat = doc.data();
      if (chat.participants.includes(userId)) {
        chatId = doc.id;
      }
    });
    
    // If no chat exists, create one
    if (!chatId) {
      const newChat = await addDoc(chatsRef, {
        participants: [currentUser.uid, userId],
        createdAt: Timestamp.now(),
        lastMessage: `Your service suggestion was updated`,
        lastMessageTimestamp: Timestamp.now(),
        lastMessageSender: currentUser.uid
      });
      chatId = newChat.id;
    }
    
    // Send the update message
    await addDoc(collection(db, 'messages'), {
      chatId: chatId,
      senderId: currentUser.uid,
      text: `✏️ Your service "${oldSkill}" has been updated to "${newSkill}" and is pending approval.`,
      timestamp: Timestamp.now(),
      read: false
    });
    
    // Update chat's last message
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: `✏️ Your service was updated to "${newSkill}"`,
      lastMessageTimestamp: Timestamp.now(),
      lastMessageSender: currentUser.uid
    });
    
  } catch (error) {
    console.error('Error sending notification:', error);
  }
  // ===== END NOTIFICATION =====
  
  alert(`Service updated to "${newSkill}" and user notified!`);
  loadPendingSkills();
};

// ==================== AUTH STATE ====================
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user && user.emailVerified) {
    if (user.email === 'agboghidiaugust@gmail.com') {
      adminTabBtn.style.display = 'flex';
    } else {
      adminTabBtn.style.display = 'none';
    }
    
    authContainer.classList.add('hidden');
    mainApp.classList.remove('hidden');
    switchTab(getSavedTab());
    await loadProfileData();
    listenForNotifications();
    setTimeout(initPullToRefresh, 500);
    setTimeout(initProfilePullToRefresh, 1000);
  } else if (user && !user.emailVerified) {
    authContainer.classList.remove('hidden');
    mainApp.classList.add('hidden');
    emailSignupView.classList.add('hidden');
    phoneSignupView.classList.add('hidden');
    loginView.classList.add('hidden');
    verifyView.classList.remove('hidden');
  } else {
    authContainer.classList.remove('hidden');
    mainApp.classList.add('hidden');
    emailSignupView.classList.remove('hidden');
    phoneSignupView.classList.add('hidden');
    loginView.classList.add('hidden');
    verifyView.classList.add('hidden');
  }
});

// ==================== EDIT PROFILE SCREEN ====================
const editProfileScreen = document.getElementById('editProfileScreen');
const backFromEditBtn = document.getElementById('backFromEditBtn');
const saveEditProfileBtn = document.getElementById('saveEditProfileBtn');
const editProfileImage = document.getElementById('editProfileImage');
const editBusinessName = document.getElementById('editBusinessName');
const editUsername = document.getElementById('editUsername');
const editBio = document.getElementById('editBio');
const editPhone = document.getElementById('editPhone');
const editAddress = document.getElementById('editAddress');
const editSkillsContainer = document.getElementById('editSkillsContainer');
const newSkillInput = document.getElementById('newSkillInput');
const addSkillBtn = document.getElementById('addSkillBtn');
const businessNameTimer = document.getElementById('businessNameTimer');
const usernameTimer = document.getElementById('usernameTimer');
const editLogoutBtn = document.getElementById('editLogoutBtn');
const editDeleteAccountBtn = document.getElementById('editDeleteAccountBtn');

if (editProfileBtn) {
  editProfileBtn.addEventListener('click', () => {
    loadEditProfileData();
    profileTab.classList.add('hidden');
    editProfileScreen.classList.remove('hidden');
  });
}

if (backFromEditBtn) {
  backFromEditBtn.addEventListener('click', () => {
    editProfileScreen.classList.add('hidden');
    profileTab.classList.remove('hidden');
  });
}

async function loadEditProfileData() {
  if (!currentUser) return;
  const userRef = doc(db, 'users', currentUser.uid);
  const userDoc = await getDoc(userRef);
  const data = userDoc.data();
  
  editProfileImage.src = getThumbnailUrl(data.profileImage, 200);
  editBusinessName.value = data.businessName || '';
  editUsername.value = data.username || '';
  editBio.value = data.bio || '';
  editPhone.value = data.phoneNumber || '';
  
  // Load existing location data
if (data.location) {
  selectedLat = data.location.latitude;
  selectedLng = data.location.longitude;
  
  if (data.locationDescription) {
    document.getElementById('locationDisplay').style.display = 'block';
    document.getElementById('locationDescription').textContent = data.locationDescription;
    document.getElementById('setLocationBtn').style.display = 'none';
  }
}
  
  renderSkills(data.skills || []);
  checkNameTimers(data);
}

function renderSkills(skills) {
  editSkillsContainer.innerHTML = '';
  skills.forEach(skill => {
    const skillTag = document.createElement('span');
    skillTag.style.cssText = 'display: inline-flex; align-items: center; background: #f0f3f8; padding: 8px 12px; border-radius: 40px; font-size: 14px;';
    skillTag.innerHTML = `
  ${skill}
  <span style="margin-left:8px;cursor:pointer;color:#dc2626;font-weight:600;">×</span>
`;

skillTag.querySelector('span').onclick = () => {
  skillTag.remove();
};

editSkillsContainer.appendChild(skillTag);
});
}

window.removeSkill = async function(skill) {
  if (!currentUser) return;
  const userRef = doc(db, 'users', currentUser.uid);
  const userDoc = await getDoc(userRef);
  const data = userDoc.data();
  
  const updatedSkills = (data.skills || []).filter(s => s !== skill);
  await updateDoc(userRef, { skills: updatedSkills });
  renderSkills(updatedSkills);
};

if (addSkillBtn) {
  addSkillBtn.addEventListener('click', async () => {
    const newSkill = newSkillInput.value.trim();
    if (!newSkill || !currentUser) return;
    
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    const data = userDoc.data();
    
    const updatedSkills = [...(data.skills || []), newSkill];
    await updateDoc(userRef, { skills: updatedSkills });
    renderSkills(updatedSkills);
    newSkillInput.value = '';
  });
}

function checkNameTimers(data) {
  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  
  if (data.businessNameLastChanged) {
    const daysLeft = Math.ceil((data.businessNameLastChanged + fourteenDays - now) / (24 * 60 * 60 * 1000));
    if (daysLeft > 0) {
      businessNameTimer.textContent = `Can change again in ${daysLeft} days`;
      editBusinessName.disabled = true;
    } else {
      businessNameTimer.textContent = '';
      editBusinessName.disabled = false;
    }
  }
  
  if (data.usernameLastChanged) {
    const daysLeft = Math.ceil((data.usernameLastChanged + fourteenDays - now) / (24 * 60 * 60 * 1000));
    if (daysLeft > 0) {
      usernameTimer.textContent = `Can change again in ${daysLeft} days`;
      editUsername.disabled = true;
    } else {
      usernameTimer.textContent = '';
      editUsername.disabled = false;
    }
  }
}

if (saveEditProfileBtn) {
  saveEditProfileBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    const data = userDoc.data();
    
    const updates = {};
    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    
    if (editBusinessName.value !== data.businessName) {
      if (!data.businessNameLastChanged || (now - data.businessNameLastChanged) > fourteenDays) {
        updates.businessName = editBusinessName.value;
        updates.businessNameLastChanged = now;
      } else {
        alert('Business name can only be changed every 14 days');
      }
    }
    
    if (editUsername.value !== data.username) {
      if (!data.usernameLastChanged || (now - data.usernameLastChanged) > fourteenDays) {
        updates.username = editUsername.value;
        updates.usernameLastChanged = now;
      } else {
        alert('Username can only be changed every 14 days');
      }
    }
    
    updates.bio = editBio.value;
    updates.phoneNumber = editPhone.value;
    updates.address = editAddress.value;
    
    await updateDoc(userRef, updates);
    await loadProfileData();
    
    editProfileScreen.classList.add('hidden');
    profileTab.classList.remove('hidden');
    alert('Profile updated!');
  });
}

if (editLogoutBtn) {
  editLogoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.reload();
  });
}

if (editDeleteAccountBtn) {
  editDeleteAccountBtn.addEventListener('click', () => {
    deleteModal.classList.remove('hidden');
  });
}

// ==================== DRAW ROUTE ON MAP ====================
function drawRoute(userLat, userLng, providerLat, providerLng) {
  alert('Trying to draw route');
  
  // Function to try drawing route
  function tryDrawRoute() {
    if (!map) {
      setTimeout(tryDrawRoute, 500);
      return;
    }
    
    try {
      // Clear any existing routes
      if (window.currentRoute) {
        map.removeControl(window.currentRoute);
      }
      
      // Remove existing toggle button
      const oldToggleBtn = document.getElementById('toggleDirectionsBtn');
      if (oldToggleBtn) oldToggleBtn.remove();
      
      // Create routing control
      window.currentRoute = L.Routing.control({
        waypoints: [
          L.latLng(userLat, userLng),
          L.latLng(providerLat, providerLng)
        ],
        addWaypoints: false,
        draggableWaypoints: false,
        lineOptions: {
          styles: [{ color: '#4287f5', weight: 5, opacity: 0.7 }]
        },
        createMarker: function() { return null; }, // Hide markers
        showAlternatives: false,
        fitSelectedRoutes: false
      }).addTo(map);
      
      // Hide panel by default
      setTimeout(function() {
        const container = document.querySelector('.leaflet-routing-container');
        if (container) {
          container.style.display = 'none';
        }
      }, 100);
      
      // Add toggle button at top right corner
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'toggleDirectionsBtn';
      toggleBtn.innerHTML = 'Show'; // Button starts with "Show" because panel is hidden
      toggleBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 10000;
        background: #4287f5;
        border: none;
        border-radius: 16px;
        padding: 6px 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      `;
      
      // Track panel visibility (starts hidden)
      let panelVisible = false;
      
      toggleBtn.onclick = function() {
        const container = document.querySelector('.leaflet-routing-container');
        if (container) {
          if (panelVisible) {
            container.style.display = 'none';
            toggleBtn.innerHTML = 'Show';
          } else {
            container.style.display = 'block';
            toggleBtn.innerHTML = 'Hide';
          }
          panelVisible = !panelVisible;
        }
      };
      
      document.getElementById('map').appendChild(toggleBtn);
      
    } catch (error) {
      alert('Error drawing route: ' + error.message);
    }
  }
  
  // Start trying to draw the route
  setTimeout(tryDrawRoute, 1000);
}

let unreadNotifications = 0;
let notifications = [];
let savesList = [];
let notificationListener = null;

// ==================== NOTIFICATION FUNCTIONS ====================

// Listen for notifications for current user
function listenForNotifications() {
  if (!currentUser) return;
  
  // Remove existing listener
  if (notificationListener) {
    notificationListener();
  }
  
  const notificationsQuery = query(
    collection(db, 'notifications'),
    where('userId', '==', currentUser.uid),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  
  notificationListener = onSnapshot(notificationsQuery, (snapshot) => {
    notifications = [];
    unreadNotifications = 0;
    
    snapshot.forEach(doc => {
      const notification = { id: doc.id, ...doc.data() };
      notifications.push(notification);
      if (!notification.read) {
        unreadNotifications++;
      }
    });
    
    updateNotificationBadge();
  });
}

// Update the notification badge on the bell icon
function updateNotificationBadge() {
  const badge = document.getElementById('notificationCount');
  if (!badge) return;
  
  if (unreadNotifications > 0) {
    badge.textContent = unreadNotifications > 99 ? '99+' : unreadNotifications;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// Mark all notifications as read
async function markAllNotificationsRead() {
  if (!currentUser || notifications.length === 0) return;
  
  const batch = writeBatch(db);
  let hasUnread = false;
  
  notifications.forEach(notification => {
    if (!notification.read) {
      const notifRef = doc(db, 'notifications', notification.id);
      batch.update(notifRef, { read: true });
      hasUnread = true;
    }
  });
  
  if (hasUnread) {
    await batch.commit();
    // The onSnapshot will automatically update the UI
  }
}

// Format notification time
function formatNotificationTime(timestamp) {
  if (!timestamp) return 'Just now';
  
  const now = new Date();
  const notifDate = timestamp.toDate();
  const diffMs = now - notifDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

// Show notifications panel
function toggleNotificationPanel() {
  const panel = document.getElementById('notificationPanel');
  if (!panel) return;
  
  panel.classList.toggle('active');
  
  if (panel.classList.contains('active')) {
    renderNotifications();
  }
}

// Render notifications in the panel
async function renderNotifications() {
  const list = document.getElementById('notificationList');
  if (!list) return;
  
  if (notifications.length === 0) {
    list.innerHTML = '<div class="notification-empty">No notifications yet</div>';
    return;
  }
  
  // Group saves by timestamp to create "X people saved your profile" messages
  const groupedNotifications = {};
  
  notifications.forEach(notif => {
    if (notif.type === 'save') {
      // Group saves that happened around the same time (within 1 hour)
      const date = notif.timestamp.toDate();
      const hourKey = `${date.toDateString()}_${date.getHours()}`;
      
      if (!groupedNotifications[hourKey]) {
        groupedNotifications[hourKey] = {
          type: 'save',
          timestamp: notif.timestamp,
          users: [],
          read: notif.read,
          ids: []
        };
      }
      
      groupedNotifications[hourKey].users.push(notif.fromUserId);
      groupedNotifications[hourKey].ids.push(notif.id);
      // If any in group is unread, mark group as unread
      if (!notif.read) {
        groupedNotifications[hourKey].read = false;
      }
    }
  });
  
  let html = '';
  
  // Convert grouped notifications to array and sort by timestamp
  const groupedArray = Object.values(groupedNotifications).sort((a, b) => 
    b.timestamp.toDate() - a.timestamp.toDate()
  );
  
  for (const group of groupedArray) {
    // Get user data for the first user in group (to show profile pic)
    const users = await getUsersBatch(group.users.slice(0, 1));
    const user = users[0] || { businessName: 'Someone', profileImage: DEFAULT_AVATAR };
    
    const timeStr = formatNotificationTime(group.timestamp);
    const count = group.users.length;
    
    html += `
      <div class="notification-item ${group.read ? '' : 'unread'}" data-notification-ids='${JSON.stringify(group.ids)}'>
        <img src="${getThumbnailUrl(user.profileImage, 100)}" loading="lazy">
        <div class="notification-content">
          <div class="notification-text">
            ${count === 1 ? 'Someone just saved your profile' : `${count} people saved your profile`}
          </div>
          <div class="notification-time">${timeStr}</div>
        </div>
      </div>
    `;
  }
  
  list.innerHTML = html;
  
  // Add click handlers for notification items
  document.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', async () => {
      // Mark these notifications as read
      const ids = JSON.parse(item.dataset.notificationIds);
      const batch = writeBatch(db);
      
      ids.forEach(id => {
        const notifRef = doc(db, 'notifications', id);
        batch.update(notifRef, { read: true });
      });
      
      await batch.commit();
      
      // Close panel and show saves list (we'll implement this next)
      toggleNotificationPanel();
      showSavedByList(ids);
    });
  });
}

// Show list of who saved your profile (to be implemented)
async function showSavedByList(notificationIds) {
  // We'll implement this in the next step
  alert('Show saved by list - coming soon');
}

// ==================== NOTIFICATION EVENT LISTENERS ====================

// Set up notification listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const bellIcon = document.getElementById('notificationBell');
  const markAllBtn = document.getElementById('markAllReadBtn');
  
  if (bellIcon) {
    bellIcon.addEventListener('click', toggleNotificationPanel);
  }
  
  if (markAllBtn) {
    markAllBtn.addEventListener('click', markAllNotificationsRead);
  }
});

// Also set them up when auth state changes (user logs in)
// Add this to your onAuthStateChanged function
// Find the onAuthStateChanged function (around line 1600-1650) and add this line:
// listenForNotifications();

// We'll modify the onAuthStateChanged in the next step

// Update save count in profile header
async function updateProfileSaveCount(userId) {
  const count = await getSaveCount(userId);
  const saveCountElement = document.getElementById('profileSaveCount');
  if (saveCountElement) {
    saveCountElement.textContent = count;
  }
}

// ==================== SAVED LIST FUNCTIONS ====================

// Show saved profiles modal (profiles YOU saved)
async function showSavedProfiles() {
  // Reset modal title to "Saved Profiles"
  const modalTitle = document.querySelector('#savedProfilesModal h3');
  if (modalTitle) {
    modalTitle.textContent = 'Saved Profiles';
  }
  
  if (!currentUser) {
    alert('Please log in to see your saved profiles');
    return;
  }
  
  const modal = document.getElementById('savedProfilesModal');
  const list = document.getElementById('savedProfilesList');
  
  if (!modal || !list) return;
  
  // Show loading state
  list.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Loading...</div>';
  modal.classList.remove('hidden');
  
  // Get saved profiles (profiles YOU saved)
  const savedUsers = await getUserSaves();
  
  if (savedUsers.length === 0) {
    list.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No saved profiles yet</div>';
    return;
  }
  
  let html = '';
  
  savedUsers.forEach(user => {
    html += `
      <div class="saved-profile-item" data-user-id="${user.id}">
        <img src="${getThumbnailUrl(user.profileImage, 100)}" loading="lazy">
        <div class="saved-profile-info">
          <div class="saved-profile-name">${user.businessName || 'Business'}</div>
          <div class="saved-profile-rating">
            <span class="star">★</span> ${user.rating || 0} (${user.reviewCount || 0})
          </div>
        </div>
        <button class="unsave-btn" data-user-id="${user.id}">Unsave</button>
      </div>
    `;
  });
  
  list.innerHTML = html;
  
  // Add click handlers for profile items
  document.querySelectorAll('.saved-profile-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't trigger if clicking the unsave button
      if (e.target.classList.contains('unsave-btn')) return;
      
      const userId = item.dataset.userId;
      const user = savedUsers.find(u => u.id === userId);
      if (user) {
        modal.classList.add('hidden');
        // Open profile viewer for this user
        openQuickView(user.id, user);
      }
    });
  });
  
  // Add click handlers for unsave buttons
  document.querySelectorAll('.unsave-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const userId = btn.dataset.userId;
      
      // Toggle save (which will remove it)
      await toggleSave(userId);
      
      // Refresh the list
      showSavedProfiles();
      
      // Also update the save count in any open profile
      updateProfileSaveCount(userId);
    });
  });
}

// Show people who saved your profile
async function showSavesProfiles() {
  if (!currentUser) {
    alert('Please log in to see who saved you');
    return;
  }
  
  const modal = document.getElementById('savedProfilesModal');
  const list = document.getElementById('savedProfilesList');
  
  if (!modal || !list) return;
  
  // Change the modal title to show it's for "Saves"
  const modalTitle = document.querySelector('#savedProfilesModal h3');
  if (modalTitle) {
    modalTitle.textContent = 'People Who Saved You';
  }
  
  // Show loading state
  list.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Loading...</div>';
  modal.classList.remove('hidden');
  
  // Query for all saves where current user is the one being saved
  const savesQuery = query(
    collection(db, 'saves'),
    where('savedUserId', '==', currentUser.uid),
    orderBy('timestamp', 'desc')
  );
  
  const snapshot = await getDocs(savesQuery);
  
  if (snapshot.empty) {
    list.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No one has saved you yet</div>';
    return;
  }
  
  // Get all the user IDs who saved you
  const saverIds = [];
  snapshot.forEach(doc => {
    saverIds.push(doc.data().saverId);
  });
  
  // Get the actual user data for these IDs
  const savers = await getUsersBatch(saverIds);
  
  let html = '';
  
  savers.forEach(user => {
    html += `
      <div class="saved-profile-item" data-user-id="${user.id}">
        <img src="${getThumbnailUrl(user.profileImage, 100)}" loading="lazy">
        <div class="saved-profile-info">
          <div class="saved-profile-name">${user.businessName || 'Business'}</div>
          <div class="saved-profile-rating">
            <span class="star">★</span> ${user.rating || 0} (${user.reviewCount || 0})
          </div>
        </div>
        <!-- No Unsave button here because you can't control who saves you -->
      </div>
    `;
  });
  
  list.innerHTML = html;
}

  // Close saved modal
document.getElementById('closeSavedModal')?.addEventListener('click', () => {
  document.getElementById('savedProfilesModal')?.classList.add('hidden');
});

// Click outside to close
document.getElementById('savedProfilesModal')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// ==================== LOCATION PICKER ====================

let locationPickerMap = null;
let locationPickerMarker = null;
let selectedLat = null;
let selectedLng = null;
let searchCache = new Map(); // Cache for search results

// ==================== MAP CLEANUP FUNCTIONS ====================

// Destroy search map
function destroySearchMap() {
  if (map) {
    map.remove();
    map = null;
    mapMarkers = [];
    console.log('Search map destroyed');
  }
}

// Destroy location picker map
function destroyLocationPickerMap() {
  if (locationPickerMap) {
    locationPickerMap.remove();
    locationPickerMap = null;
    console.log('Location picker map destroyed');
  }
}

// Open location picker
function openLocationPicker() {
  const modal = document.getElementById('locationPickerModal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  
  // Destroy old map first, then create new one after modal opens
  destroyLocationPickerMap();
  
  setTimeout(() => {
    initLocationPickerMap();
  }, 300);
}

// Initialize location picker map
function initLocationPickerMap() {
  console.log('Starting initLocationPickerMap');
  
  // Check if map container exists
  const mapContainer = document.getElementById('locationPickerMap');
  if (!mapContainer) {
    console.log('Map container not found!');
    return;
  }
  console.log('Map container found');
  
  try {
    // Create map
    locationPickerMap = L.map('locationPickerMap').setView([7.0667, 6.2667], 13);
    console.log('Map created');
    
    // Add standard OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 20
}).addTo(locationPickerMap);
    
    // Force map to resize multiple times
    setTimeout(() => {
      if (locationPickerMap) {
        locationPickerMap.invalidateSize();
        console.log('Map resized 1');
      }
    }, 500);
    
    setTimeout(() => {
      if (locationPickerMap) {
        locationPickerMap.invalidateSize();
        console.log('Map resized 2');
      }
    }, 1000);
    
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          locationPickerMap.setView([userLat, userLng], 15);
          
          // Add blue dot for user location
          L.circleMarker([userLat, userLng], {
            color: '#4287f5',
            fillColor: '#4287f5',
            fillOpacity: 0.8,
            radius: 6
          }).addTo(locationPickerMap).bindPopup('You are here');
        },
        function(error) {
          console.log('Could not get location');
        }
      );
    }
    
    // Update pin when map moves
    locationPickerMap.on('moveend', updatePinPosition);
    
  } catch (error) {
    console.log('Error creating map:', error);
  }
  // Force recalculate when dragging starts
  locationPickerMap.on('dragstart', function() {
    setTimeout(() => {
      if (locationPickerMap) {
        locationPickerMap.invalidateSize();
        console.log('Map resized on drag');
      }
    }, 50);
  });
}

// Search for locations with caching
let searchTimeout = null;
const searchInput = document.getElementById('locationSearch');
const suggestionsDiv = document.getElementById('searchSuggestions');

if (searchInput) {
  searchInput.addEventListener('input', function(e) {
    const query = e.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);
    
    // Hide suggestions if query is too short
    if (query.length < 3) {
      suggestionsDiv.style.display = 'none';
      return;
    }
    
    // Set timeout to avoid too many requests
    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 500);
  });
}

async function performSearch(query) {
  // Check cache first
  if (searchCache.has(query)) {
    displaySuggestions(searchCache.get(query));
    return;
  }
  
  try {
    // Nominatim API (free, 1 request/second limit)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ng&limit=5`,
      {
        headers: {
          'User-Agent': 'GigsCourt/1.0' // Required by Nominatim
        }
      }
    );
    
    const results = await response.json();
    
    // Save to cache
    searchCache.set(query, results);
    
    // Display results
    displaySuggestions(results);
    
  } catch (error) {
    console.error('Search error:', error);
  }
}

function displaySuggestions(results) {
  if (!suggestionsDiv) return;
  
  if (results.length === 0) {
    suggestionsDiv.style.display = 'none';
    return;
  }
  
  let html = '';
  results.forEach(result => {
    html += `
      <div class="suggestion-item" data-lat="${result.lat}" data-lng="${result.lon}" data-display="${result.display_name}">
        ${result.display_name}
      </div>
    `;
  });
  
  suggestionsDiv.innerHTML = html;
  suggestionsDiv.style.display = 'block';
  
  // Add click handlers
  document.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', function() {
      const lat = parseFloat(this.dataset.lat);
      const lng = parseFloat(this.dataset.lng);
      const displayName = this.dataset.display;
      
      // Move map to selected location
      if (locationPickerMap) {
        locationPickerMap.setView([lat, lng], 17);
      }
      
      // Hide suggestions
      suggestionsDiv.style.display = 'none';
      
      // Clear search input
      searchInput.value = displayName;
    });
  });
}

// Click outside to close suggestions
document.addEventListener('click', function(e) {
  if (suggestionsDiv && !suggestionsDiv.contains(e.target) && e.target !== searchInput) {
    suggestionsDiv.style.display = 'none';
  }
});

// Get pin position (center of map) and get address
function updatePinPosition() {
  if (!locationPickerMap) return;
  
  const center = locationPickerMap.getCenter();
  selectedLat = center.lat;
  selectedLng = center.lng;
  
  // Get address from coordinates using Nominatim API
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedLat}&lon=${selectedLng}`)
    .then(response => response.json())
    .then(data => {
      if (data.display_name) {
        // Update the search input with the address
        const searchInput = document.getElementById('locationSearch');
        if (searchInput) {
          searchInput.value = data.display_name;
        }
      }
    })
    .catch(error => console.log('Could not get address:', error));
}


// Confirm location button
document.getElementById('confirmLocationBtn')?.addEventListener('click', function() {
  const description = document.getElementById('locationDescriptionInput').value.trim();
  
  if (!selectedLat || !selectedLng) {
    alert('Please drag the map to your location');
    return;
  }
  
  if (!description) {
    alert('Please describe your location');
    return;
  }
  
  // Save to user profile (we'll implement this next)
  saveUserLocation(selectedLat, selectedLng, description);
  
  // Close modal
  document.getElementById('locationPickerModal').classList.add('hidden');
  
  // Update display in Edit Profile
  document.getElementById('locationDisplay').style.display = 'block';
  document.getElementById('locationDescription').textContent = description;
  document.getElementById('setLocationBtn').style.display = 'none';
});

// Change location button
document.getElementById('changeLocationBtn')?.addEventListener('click', function() {
  document.getElementById('locationDisplay').style.display = 'none';
  document.getElementById('setLocationBtn').style.display = 'block';
  openLocationPicker();
});

// Save location to database
async function saveUserLocation(lat, lng, description) {
  if (!currentUser) return;
  
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      location: new GeoPoint(lat, lng),
      locationDescription: description
    });
    console.log('Location saved');
  } catch (error) {
    console.error('Error saving location:', error);
    alert('Failed to save location');
  }
}

// Close location picker
document.getElementById('closeLocationPicker')?.addEventListener('click', () => {
  document.getElementById('locationPickerModal').classList.add('hidden');
});

// Set Location button in Edit Profile
document.getElementById('setLocationBtn')?.addEventListener('click', openLocationPicker);

  // Close profile viewer modal
document.getElementById('closeProfileViewerModal').addEventListener('click', () => {
  document.getElementById('profileViewerModal').classList.add('hidden');
  mainApp.classList.remove('hidden');
});

// Make sure logout button exists before adding listener
setTimeout(() => {
  const existingLogoutBtn = document.getElementById('logoutBtn');
  if (existingLogoutBtn) {
    existingLogoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.reload();
    });
  }
}, 1000);
