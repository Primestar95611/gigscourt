// home.js - Home tab with provider grid

// Global home state
let providers = [];
let lastDoc = null;
let loading = false;
let hasMore = true;
let homeCurrentPage = 1;
let homeTotalLoaded = 0;
const HOME_PAGE_SIZE = 10;
let observer = null;

// Load home tab
function loadHomeTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;
    
    container.innerHTML = `
<div class="home-container">
    <div class="home-header">
        <h1 class="logo">GigsCourt</h1>
        <div class="header-actions">
            <button id="enable-notify-btn" class="btn-small" style="background:#8B0000; color:white; border-radius:20px; padding:5px 12px; margin-right:8px;">🔔 Enable</button>
            <div class="notification-bell" onclick="openNotifications()">
                <span class="bell-icon">🔔</span>
                <span class="notification-badge" id="notification-count">0</span>
            </div>
        </div>
    </div>
    
    <div class="home-scrollable">
        <div id="pull-to-refresh-indicator" class="ptr-indicator">
            <span class="ptr-spinner"></span>
            <span class="ptr-text">Pull to refresh</span>
        </div>
        
        <div id="providers-grid" class="providers-grid">
            <!-- Providers will load here -->
        </div>
        
        <div id="load-more-trigger" style="height: 20px; margin: 20px; text-align: center;">
            <div id="load-more-spinner" class="loading-spinner hidden" style="padding: 10px;">
                <div class="spinner"></div>
            </div>
            <div id="load-more-end" class="hidden" style="color: var(--text-secondary); font-size: 12px;">You've seen all providers</div>
        </div>
        
        <div id="loading-spinner" class="loading-spinner hidden">
            <div class="spinner"></div>
        </div>
        
        <div id="empty-state" class="empty-state hidden">
            <p>No providers found nearby</p>
        </div>
    </div>
</div>
`;

    window.currentTab = 'home';
    
    homeCurrentPage = 1;
    homeTotalLoaded = 0;
    providers = [];
    lastDoc = null;
    hasMore = true;
    
    loadProviders(true);
    setupPullToRefresh();
    
    const enableBtn = document.getElementById('enable-notify-btn');
    if (enableBtn) {
        enableBtn.onclick = async function() {
            const userId = firebase.auth().currentUser?.uid;
            if (userId) {
                await setupNotifications(userId);
            } else {
                alert('Please log in first');
            }
        };
    }
    
    setTimeout(() => {
        setupInfiniteScroll();
    }, 500);
}

// Setup infinite scroll
function setupInfiniteScroll() {
    const trigger = document.getElementById('load-more-trigger');
    if (!trigger) return;
    
    if (observer) observer.disconnect();
    
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && hasMore && !loading) {
                loadProviders(false);
            }
        });
    }, { threshold: 0.1, rootMargin: '100px' });
    
    observer.observe(trigger);
}

// Cleanup infinite scroll
function cleanupInfiniteScroll() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}

// Load providers
async function loadProviders(reset = true) {
    if (loading) return;
    loading = true;
    
    if (reset) {
        providers = [];
        lastDoc = null;
        hasMore = true;
        homeTotalLoaded = 0;
        const grid = document.getElementById('providers-grid');
        if (grid) {
            grid.innerHTML = '';
            for (let i = 0; i < HOME_PAGE_SIZE; i++) {
                grid.innerHTML += `
                    <div class="skeleton-card">
                        <div class="skeleton-image"></div>
                        <div class="skeleton-text"></div>
                        <div class="skeleton-text-sm"></div>
                        <div class="skeleton-text-xs"></div>
                    </div>
                `;
            }
        }
    }
    
    if (!hasMore) {
        loading = false;
        return;
    }
    
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.classList.remove('hidden');

    if (!reset) {
        const moreSpinner = document.getElementById('load-more-spinner');
        if (moreSpinner) moreSpinner.classList.remove('hidden');
    }
    
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
            .where('locationGeo', '!=', null)
            .limit(HOME_PAGE_SIZE);
        
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            hasMore = false;
            if (providers.length === 0) {
                const emptyState = document.getElementById('empty-state');
                if (emptyState) emptyState.classList.remove('hidden');
            }
            const endMsg = document.getElementById('load-more-end');
            if (endMsg) endMsg.classList.remove('hidden');
            const moreSpinner = document.getElementById('load-more-spinner');
            if (moreSpinner) moreSpinner.classList.add('hidden');
            
        } else {
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            const newProviders = [];
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
                
                newProviders.push({
                    id: doc.id,
                    ...data,
                    distance: distance.toFixed(1)
                });
            });
            
            newProviders.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
            
            providers.push(...newProviders);
            
            renderProviders();
            homeTotalLoaded += snapshot.docs.length;
        }
        
        if (providers.length > 0) {
            const emptyState = document.getElementById('empty-state');
            if (emptyState) emptyState.classList.add('hidden');
        }
        
    } catch (error) {
        console.error('Error loading providers:', error);
        const grid = document.getElementById('providers-grid');
        if (grid && providers.length === 0) {
            grid.innerHTML = '<div class="error-state">Failed to load providers. Pull down to refresh.</div>';
        }
    }

    if (!reset) {
        const moreSpinner = document.getElementById('load-more-spinner');
        if (moreSpinner) moreSpinner.classList.add('hidden');
    }
    
    if (spinner) spinner.classList.add('hidden');
    loading = false;
}

function renderProviders() {
    const grid = document.getElementById('providers-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    providers.forEach(provider => {
        const card = document.createElement('div');
        card.id = `provider-${provider.id}`;
        card.className = 'provider-card';
        card.onclick = () => openQuickView(provider);
        
        const services = provider.services || [];
        const displayServices = services.slice(0, 2).join(' • ');
        const hasMoreServices = services.length > 2 ? '...' : '';
        
        const profileImage = provider.profileImage 
            ? `${provider.profileImage}?tr=w-300,h-300,fo-auto,format-webp` 
            : 'https://via.placeholder.com/300';
        
        card.innerHTML = `
            <div class="provider-image">
                <img src="${profileImage}" alt="${escapeHtml(provider.businessName)}" loading="lazy">
            </div>
            <div class="provider-info">
                <h3 class="provider-name">${escapeHtml(provider.businessName)}</h3>
                <div class="provider-rating">
                    <span class="stars">⭐ ${provider.rating || '0.0'}</span>
                    <span class="review-count">(${provider.reviewCount || 0})</span>
                </div>
                <div class="provider-services">${escapeHtml(displayServices)}${hasMoreServices}</div>
                <div class="provider-distance" onclick="event.stopPropagation(); showOnMap('${provider.id}')">
                    📍 ${provider.distance} km away
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Pull to refresh
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
    if (indicator) {
        indicator.classList.add('refreshing');
        const textEl = indicator.querySelector('.ptr-text');
        if (textEl) textEl.textContent = 'Refreshing...';
    }
    
    providers = [];
    lastDoc = null;
    hasMore = true;
    homeTotalLoaded = 0;
    homeCurrentPage = 1;
    
    const grid = document.getElementById('providers-grid');
    if (grid) grid.innerHTML = '';
    
    await loadProviders(true);
    
    setTimeout(() => {
        if (indicator) {
            indicator.style.transform = '';
            indicator.classList.remove('refreshing');
            const textEl = indicator.querySelector('.ptr-text');
            if (textEl) textEl.textContent = 'Pull to refresh';
            const spinnerEl = indicator.querySelector('.ptr-spinner');
            if (spinnerEl) spinnerEl.style.transform = '';
        }
    }, 500);
}

function resetPullToRefresh() {
    const indicator = document.getElementById('pull-to-refresh-indicator');
    if (indicator) {
        indicator.style.transform = '';
        indicator.classList.remove('refreshing');
        const textEl = indicator.querySelector('.ptr-text');
        if (textEl) textEl.textContent = 'Pull to refresh';
        const spinnerEl = indicator.querySelector('.ptr-spinner');
        if (spinnerEl) spinnerEl.style.transform = '';
    }
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
                <img src="${provider.profileImage ? provider.profileImage + '?tr=w-100,h-100,format-webp' : 'https://via.placeholder.com/100'}" class="quick-view-image">
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
                <button class="btn" onclick="viewProfile('${provider.id}', '${window.currentTab || 'home'}')">View Profile</button>
                <button class="btn" onclick="messageUser('${provider.id}', '${window.currentTab || 'home'}')">Message</button>
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

window.showOnMap = (id) => alert('Map view coming soon');
