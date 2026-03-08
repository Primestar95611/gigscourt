// Main App Navigation
function showView(name, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const t = document.getElementById('view-' + name);
  if (t) { 
    t.classList.add('active'); 
    t.scrollTop = 0; 
  }
  if (btn) btn.classList.add('active');
  
  // View-specific actions
  if (name === 'search') setTimeout(initMap, 80);
  if (name === 'messages') renderChatList();
  if (name === 'admin' && auth.currentUser?.email === ADMIN_EMAIL) loadAdminData();
}

// Auth State Observer
auth.onAuthStateChanged(async user => {
  const overlay = document.getElementById('auth-overlay');
  if (user) {
    overlay.classList.add('hidden');
    setLoading('login-btn', false);
    setLoading('signup-btn', false);

    const adminTab = document.getElementById('admin-tab');
    if (user.email === ADMIN_EMAIL) {
      adminTab.style.display = 'flex';
      document.getElementById('admin-email-display').textContent = 'Logged in as ' + user.email;
      loadAdminData();
    } else {
      adminTab.style.display = 'none';
    }

    const emailEl = document.getElementById('profile-email-display');
    if (emailEl) emailEl.textContent = user.email;

    await loadUserProfile(user);
    renderChatList();

  } else {
    overlay.classList.remove('hidden');
    document.getElementById('admin-tab').style.display = 'none';
    switchAuthTab('login');
    // Clear form fields
    ['login-email','login-password','signup-name','signup-email','signup-password','signup-phone']
      .forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
    _profileData = {};
    toggleEditMode(false);
  }
});
