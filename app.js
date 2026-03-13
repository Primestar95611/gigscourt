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
    <div class="sheet-buttons">
      <button class="sheet-btn-secondary" id="sheetViewProfileBtn">View Profile</button>
      <button class="sheet-btn-primary" id="sheetMessageBtn">Message</button>
    </div>
  `;
  
  quickViewSheet.classList.add('active');
  sheetOverlay.classList.add('active');
  
  document.getElementById('sheetMessageBtn')?.addEventListener('click', () => {
    closeQuickView();
    showStartChatModal(providerId, providerData.businessName, providerData.profileImage);
  });
  
  document.getElementById('sheetViewProfileBtn')?.addEventListener('click', () => {
  closeQuickView();
  
  // Save the provider we're viewing
  const viewedProvider = currentSheetProvider;
  
  // Switch to profile tab
  switchTab('profile');
  
  setTimeout(async () => {
    // Hide edit/profile buttons and camera
    editProfileBtn.style.display = 'none';
    addPortfolioBtn.style.display = 'none';
    uploadProfilePicBtn.style.display = 'none';
    
    // Show this provider's info
    profileBusinessName.textContent = viewedProvider.businessName || 'Business';
    profileUsername.textContent = viewedProvider.username ? '@' + viewedProvider.username : '@user';
    profileJobs.textContent = viewedProvider.jobsDone || 0;
    profileRating.textContent = viewedProvider.rating || 0;
    profileReviews.textContent = viewedProvider.reviewCount || 0;
    profileBio.textContent = viewedProvider.bio || 'No bio yet.';
    
    const profileImageUrl = getThumbnailUrl(viewedProvider.profileImage, 200);
    profileImage.src = profileImageUrl;
    
    // Contact info
    if (viewedProvider.phoneNumber) {
      profilePhone.textContent = viewedProvider.phoneNumber;
      profilePhoneContainer.style.display = 'flex';
    } else {
      profilePhoneContainer.style.display = 'none';
    }
    
    if (viewedProvider.address) {
      profileAddress.textContent = viewedProvider.address;
      profileAddressContainer.style.display = 'flex';
    } else {
      profileAddressContainer.style.display = 'none';
    }
    
    // Skills
    const skillsList = document.getElementById('profileSkillsList');
    if (skillsList && viewedProvider.skills) {
      skillsList.innerHTML = '';
      viewedProvider.skills.forEach(skill => {
        const skillTag = document.createElement('span');
        skillTag.style.cssText = 'background: #f0f3f8; padding: 6px 12px; border-radius: 20px; font-size: 13px; color: #1e1e2f;';
        skillTag.textContent = skill;
        skillsList.appendChild(skillTag);
      });
    }
    
    // Portfolio
    const portfolio = viewedProvider.portfolioImages || [
      'https://ik.imagekit.io/GigsCourt/sample1',
      'https://ik.imagekit.io/GigsCourt/sample2',
      'https://ik.imagekit.io/GigsCourt/sample3'
    ];
    
    const portfolioCount = document.getElementById('portfolioCount');
    if (portfolioCount) {
      portfolioCount.textContent = `(${portfolio.length})`;
    }
    
    portfolioGrid.innerHTML = '';
    portfolio.forEach((url, index) => {
      const item = document.createElement('div');
      item.className = 'portfolio-item';
      item.dataset.url = url;
      
      const img = document.createElement('img');
      img.src = getThumbnailUrl(url, 300);
      img.loading = 'lazy';
      img.classList.add('lazy-load');
      img.onload = () => img.classList.add('loaded');
      
      img.addEventListener('click', () => {
        openGallery(portfolio, index);
      });
      
      item.appendChild(img);
      portfolioGrid.appendChild(item);
    });
    
    
    // Add Message button next to Share
const shareBtn = document.querySelector('.profile-btn-secondary');
if (shareBtn) {
  const messageBtn = document.createElement('button');
  messageBtn.className = 'profile-btn profile-btn-primary';
  messageBtn.textContent = 'Message';
  messageBtn.id = 'messageFromProfileBtn';
  messageBtn.style.marginLeft = '10px';
  
  messageBtn.addEventListener('click', () => {
    showStartChatModal(viewedProvider.id, viewedProvider.businessName, viewedProvider.profileImage);
  });
  
  shareBtn.parentNode.insertBefore(messageBtn, shareBtn);
}

    // Add back button at the top
const profileHeader = document.querySelector('.profile-header');
const backBtn = document.createElement('div');
backBtn.innerHTML = '<button style="background:none; border:none; font-size:24px; padding:8px; margin-left:8px; cursor:pointer;">←</button>';
backBtn.style.position = 'sticky';
backBtn.style.top = '0';
backBtn.style.zIndex = '100';
backBtn.style.background = 'white';
backBtn.firstChild.addEventListener('click', () => {
  loadProfileData(); // Go back to your own profile
});
profileHeader.parentNode.insertBefore(backBtn, profileHeader);
    
  }, 100);
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
  
  if (profileBio) {
    profileBio.textContent = data.bio || 'No bio yet.';
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
  startChatModalTitle.textContent = `Start chat with ${userName}?`;
  startChatModalMessage.textContent = `Send a message to ${userName}`;
  startChatModal.classList.remove('hidden');
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
  
  backBtnContainer.firstChild.addEventListener('click', () => {
    // Go back to the previous tab (home, search, or profile)
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
  map = L.map('map').setView([7.0667, 6.2667], 12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap, © CartoDB',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);
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
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
  document.getElementById(tabId + 'Tab').classList.remove('hidden');
  document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-item[data-tab="${tabId}"]`).classList.add('active');
  saveCurrentTab(tabId);
  if (tabId === 'home') loadProviders(true);
  if (tabId === 'profile') loadProfileData();
  if (tabId === 'search') setTimeout(initMap, 100);
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
    
    if (isActive && tabId === lastTapTab && (now - lastTapTime) < 500) {
      if (tabId === 'home') loadProviders(true);
      if (tabId === 'search') {
        loadAllUsers().then(() => updateMapAndList());
      }
      if (tabId === 'messages') loadConversations();
    } else if (isActive) {
      tabElement.scrollTop = 0;
    } else {
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
    messagesTab.classList.remove('hidden');
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
  editAddress.value = data.address || '';
  
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
      <span style="margin-left: 8px; cursor: pointer; color: #dc2626; font-weight: bold;" onclick="removeSkill('${skill}')">×</span>
    `;
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
