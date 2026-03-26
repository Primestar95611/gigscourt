// messages.js - Chat and messaging functionality

// Global chat state
let conversationsListener = null;
let currentChatId = null;
let messagesListener = null;
let chatPreviousScreen = null;
let lastProfileViewedId = null;

function loadMessagesTab() {
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) {
        tabBar.style.display = 'flex';
    }
    
    const container = document.getElementById('tab-content');
    if (!container) return;
    
    container.innerHTML = `
<div class="messages-container">
    <div class="messages-header">
        <h1 class="messages-title">Messages</h1>
    </div>
    
    <div class="messages-scrollable">
        <div id="conversations-list" class="conversations-list"></div>
        <div id="conversations-loading" class="conversations-loading">
            <div class="spinner"></div>
        </div>
    </div>
</div>
`;
    
    loadConversations();
}

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

function renderConversationItem(chat, currentUserId) {
    const otherUserId = chat.participants.find(id => id !== currentUserId);
    const lastMessage = chat.lastMessage || '';
    const lastMessageTime = chat.lastMessageTimestamp ? formatMessageTime(chat.lastMessageTimestamp.toDate()) : '';
    const unread = chat.lastMessageSender !== currentUserId && !chat.lastMessageRead;
    
    let otherUserName = 'User';
    let otherUserImage = 'https://via.placeholder.com/40';
    
    if (chat.userNames && chat.userNames[otherUserId]) {
        otherUserName = chat.userNames[otherUserId];
    }
    if (chat.userImages && chat.userImages[otherUserId]) {
        otherUserImage = chat.userImages[otherUserId];
    }
    
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

function openChat(chatId, otherUserId, chatData, previousScreen = null) {
    currentChatId = chatId;
    chatPreviousScreen = previousScreen;
    
    let otherUserName = 'Loading...';
    let otherUserImage = 'https://via.placeholder.com/32';
    
    if (chatData.userNames && chatData.userNames[otherUserId]) {
        otherUserName = chatData.userNames[otherUserId];
    }
    if (chatData.userImages && chatData.userImages[otherUserId]) {
        otherUserImage = chatData.userImages[otherUserId];
    }
    
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) {
        tabBar.style.display = 'none';
    }
    
    const container = document.getElementById('tab-content');
    
    let backAction = 'loadMessagesTab()';
    if (previousScreen === 'profile') {
        backAction = 'goBackFromChat()';
    } else if (previousScreen === 'home' || previousScreen === 'search') {
        backAction = 'goBackFromChat()';
    }
    
    container.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <button class="chat-back-btn" onclick="${backAction}">←</button>
                <img src="${otherUserImage}" class="chat-header-image" onclick="viewProfileFromChat('${otherUserId}')" style="cursor:pointer;">
                <span class="chat-header-name" onclick="viewProfileFromChat('${otherUserId}')" style="cursor:pointer;">${otherUserName}</span>
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
        
        loadMessages(currentChatId);
        
        try {
            const chatData = (await chatRef.get()).data();
            const recipientId = chatData.participants.find(id => id !== currentUserId);
            const recipientDoc = await firebase.firestore().collection('users').doc(recipientId).get();
            const recipientToken = recipientDoc.data()?.fcmToken;
            
            if (recipientToken) {
                const workerUrl = 'https://gigscourtnotification.agboghidiaugust.workers.dev';
                await fetch(workerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientToken: recipientToken,
                        title: 'New Message',
                        body: text.substring(0, 100),
                        chatId: currentChatId
                    })
                });
                console.log('Notification sent to recipient');
            }
        } catch (notifyError) {
            console.log('Failed to send notification:', notifyError);
        }
        
        setTimeout(() => {
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
        
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
        
        try {
            const providerDoc = await firebase.firestore().collection('users').doc(providerId).get();
            const providerToken = providerDoc.data()?.fcmToken;
            const clientName = currentUserData?.businessName || 'A client';
            
            if (providerToken) {
                const workerUrl = 'https://gigscourtnotification.agboghidiaugust.workers.dev';
                await fetch(workerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientToken: providerToken,
                        title: 'Gig Completed',
                        body: `${clientName} confirmed your gig. Rate them!`,
                        chatId: ''
                    })
                });
                console.log('Gig confirmed notification sent');
            }
        } catch (notifyError) {
            console.log('Failed to send gig confirmation notification:', notifyError);
        }
        
        showReviewModal(providerId, gigId);
        
        document.querySelector('.gig-confirmation')?.remove();
        
    } catch (error) {
        console.error('Error confirming gig:', error);
        alert('Failed to confirm gig');
    }
};

window.messageUser = async function(otherUserId, fromScreen = 'messages') {
    const currentUserId = firebase.auth().currentUser.uid;
    lastProfileViewedId = otherUserId;
    
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
            openChat(existingChatId, otherUserId, chatData, fromScreen);
        } else {
            const otherUserDoc = await firebase.firestore().collection('users').doc(otherUserId).get();
            const otherUserData = otherUserDoc.data();
            const currentUserDoc = await firebase.firestore().collection('users').doc(currentUserId).get();
            const currentUserDataDoc = currentUserDoc.data();

            const newChatRef = await firebase.firestore().collection('chats').add({
                participants: [currentUserId, otherUserId],
                userNames: {
                    [currentUserId]: currentUserDataDoc.businessName || 'User',
                    [otherUserId]: otherUserData.businessName || 'User'
                },
                userImages: {
                    [currentUserId]: currentUserDataDoc.profileImage || 'https://via.placeholder.com/40',
                    [otherUserId]: otherUserData.profileImage || 'https://via.placeholder.com/40'
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: '',
                lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageSender: '',
                lastMessageRead: true
            });  
            
            openChat(newChatRef.id, otherUserId, {
                ...otherUserData,
                userNames: {
                    [currentUserId]: currentUserDataDoc.businessName,
                    [otherUserId]: otherUserData.businessName
                },
                userImages: {
                    [currentUserId]: currentUserDataDoc.profileImage,
                    [otherUserId]: otherUserData.profileImage
                }
            }, fromScreen);
        }
    } catch (error) {
        console.error('Error creating chat:', error);
        alert('Could not start chat. Please try again.');
    }
};

window.viewProfileFromChat = function(userId) {
    profilePreviousScreen = 'chat';
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) {
        tabBar.style.display = 'none';
    }
    loadProfileTab(userId, true);
};

window.goBackFromChat = function() {
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) {
        tabBar.style.display = 'flex';
    }
    
    if (chatPreviousScreen === 'profile' && lastProfileViewedId) {
        loadProfileTab(lastProfileViewedId, true);
    } else if (chatPreviousScreen === 'home') {
        switchTab('home');
    } else if (chatPreviousScreen === 'search') {
        switchTab('search');
    } else {
        loadMessagesTab();
    }
    
    chatPreviousScreen = null;
};
