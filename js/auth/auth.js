// js/auth/auth.js
export function initializeAuth() {
    // Set auth persistence to LOCAL (remember me)
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
}

window.showLogin = function() {
    document.getElementById('auth-content').innerHTML = `
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
        
        <button class="btn btn-outline btn-full" onclick="showPhoneComingSoon()">
            Continue with Phone (Coming Soon)
        </button>
    `;
    
    // Update tab active states
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector('[onclick="showLogin()"]').classList.add('active');
};

window.showSignup = function() {
    document.getElementById('auth-content').innerHTML = `
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
    
    // Update tab active states
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector('[onclick="showSignup()"]').classList.add('active');
    
    // Initialize services array
    window.selectedServices = [];
};

// Services selection
window.selectedServices = [];

window.toggleService = function(service) {
    const index = window.selectedServices.indexOf(service);
    if (index === -1) {
        window.selectedServices.push(service);
    } else {
        window.selectedServices.splice(index, 1);
    }
    
    // Update UI
    updateServicesDisplay();
    
    // Update button active states
    document.querySelectorAll('.service-pill').forEach(btn => {
        if (window.selectedServices.includes(btn.textContent)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

function updateServicesDisplay() {
    const container = document.getElementById('selected-services');
    if (container) {
        container.innerHTML = window.selectedServices.map(service => 
            `<span class="service-tag">${service}</span>`
        ).join('');
    }
    
    document.getElementById('services-input').value = window.selectedServices.join(',');
}

window.handleLogin = async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // Auth state change will handle navigation
    } catch (error) {
        let message = 'Login failed. ';
        switch(error.code) {
            case 'auth/user-not-found':
                message += 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                message += 'Incorrect password.';
                break;
            case 'auth/too-many-requests':
                message += 'Too many failed attempts. Try again later.';
                break;
            default:
                message += error.message;
        }
        alert(message);
    }
};

window.handleSignup = async function(event) {
    event.preventDefault();
    
    const businessName = document.getElementById('signup-business').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const customServices = document.getElementById('custom-services').value;
    
    // Combine preset and custom services
    let services = [...window.selectedServices];
    
    if (customServices.trim()) {
        const customList = customServices.split(',').map(s => s.trim()).filter(s => s);
        services = [...services, ...customList];
    }
    
    // Remove duplicates
    services = [...new Set(services)];
    
    try {
        // Create user
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Send verification email
        await user.sendEmailVerification();
        
        // Create user document in Firestore
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
            businessNameLastChanged: null,
            usernameLastChanged: null
        });
        
        // Show verification screen
        alert('Account created! Please check your email for verification.');
        
    } catch (error) {
        let message = 'Signup failed. ';
        switch(error.code) {
            case 'auth/email-already-in-use':
                message += 'This email is already registered.';
                break;
            case 'auth/weak-password':
                message += 'Password should be at least 6 characters.';
                break;
            case 'auth/invalid-email':
                message += 'Invalid email address.';
                break;
            default:
                message += error.message;
        }
        alert(message);
    }
};

window.showPhoneComingSoon = function() {
    alert('Phone signup coming soon! Use email for now.');
};
