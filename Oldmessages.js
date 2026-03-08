// Messaging System
let _activeChatId = null;
let _activeChatPartner = null;
let _chatUnsubscribe = null;
let _knownChats = {};

function buildChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('__');
}

function openChatWith(talent) {
  // Open chat window
}

function closeChatWindow() {
  // Close chat
}

async function sendChatMessage() {
  // Send message
}

function renderChatList() {
  // Render chat list
}
