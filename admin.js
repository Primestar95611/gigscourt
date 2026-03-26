// admin.js - Admin dashboard and management

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

async function loadAdminDashboard() {
    const container = document.getElementById('admin-content');
    if (!container) return;
    
    container.innerHTML = '<div class="admin-loading"><div class="spinner"></div></div>';
    
    try {
        let statsDoc = await firebase.firestore().collection('stats').doc('dashboard').get();
        
        if (!statsDoc.exists) {
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
            
            await firebase.firestore().collection('stats').doc('dashboard').set({
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
        
        try {
            const userToken = userData?.fcmToken;
            
            if (userToken) {
                const workerUrl = 'https://gigscourtnotification.agboghidiaugust.workers.dev';
                await fetch(workerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientToken: userToken,
                        title: 'Service Approved',
                        body: `Your service "${service}" has been approved!`,
                        chatId: ''
                    })
                });
            }
        } catch (notifyError) {
            console.log('Failed to send service approval notification:', notifyError);
        }
        
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
