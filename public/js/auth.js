// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

// Session timeout in milliseconds (1 hour)
const SESSION_TIMEOUT = 60 * 60 * 1000;
let sessionTimer = null;

// ============================================
// SESSION MANAGEMENT
// ============================================

function resetSessionTimer() {
    if (sessionTimer) {
        clearTimeout(sessionTimer);
        sessionTimer = null;
    }
    
    const user = getCurrentUser();
    if (!user) return;
    
    sessionTimer = setTimeout(() => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            showToast('⏰ Session expired. Logging out...', 'warning');
            setTimeout(() => {
                logoutUser();
                window.location.href = '/';
            }, 1500);
        }
    }, SESSION_TIMEOUT);
}

function handleUserActivity() {
    const user = getCurrentUser();
    if (user) {
        resetSessionTimer();
    }
}

function startSessionMonitoring() {
    document.removeEventListener('click', handleUserActivity);
    document.removeEventListener('keydown', handleUserActivity);
    document.removeEventListener('scroll', handleUserActivity);
    document.removeEventListener('mousemove', handleUserActivity);
    document.removeEventListener('touchstart', handleUserActivity);
    
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('touchstart', handleUserActivity);
    
    const user = getCurrentUser();
    if (user) {
        resetSessionTimer();
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 350px;
        `;
        document.body.appendChild(container);
    }

    const colors = {
        success: { bg: 'rgba(107, 203, 119, 0.15)', border: '#6bcb77', text: '#6bcb77' },
        error: { bg: 'rgba(255, 107, 107, 0.15)', border: '#ff6b6b', text: '#ff6b6b' },
        warning: { bg: 'rgba(255, 215, 0, 0.15)', border: '#FFD700', text: '#FFD700' },
        info: { bg: 'rgba(77, 150, 255, 0.15)', border: '#4d96ff', text: '#4d96ff' }
    };
    const color = colors[type] || colors.info;
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        padding: 1rem 1.5rem;
        border-radius: 10px;
        background: ${color.bg};
        color: ${color.text};
        border-left: 4px solid ${color.border};
        font-weight: 500;
        animation: slideIn 0.5s ease;
        box-shadow: 0 5px 20px rgba(0,0,0,0.5);
        margin-bottom: 5px;
        max-width: 100%;
    `;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// ============================================
// DOM CONTENT LOADED
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Get elements
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Check if user is logged in
    const user = getCurrentUser();
    
    if (loginBtn && registerBtn && logoutBtn) {
        if (user) {
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            logoutBtn.style.display = 'inline';
            // Start session monitoring
            startSessionMonitoring();
        } else {
            loginBtn.style.display = 'inline';
            registerBtn.style.display = 'inline';
            logoutBtn.style.display = 'none';
        }
    }

    // Login modal
    if (loginBtn) {
        loginBtn.onclick = () => {
            if (loginModal) loginModal.style.display = 'flex';
        };
    }

    // Register modal
    if (registerBtn) {
        registerBtn.onclick = () => {
            if (registerModal) registerModal.style.display = 'flex';
        };
    }

    // Close modals
    document.querySelectorAll('.close').forEach(close => {
        close.onclick = () => {
            if (loginModal) loginModal.style.display = 'none';
            if (registerModal) registerModal.style.display = 'none';
        };
    });

    // Close on outside click
    window.onclick = (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (e.target === registerModal) {
            registerModal.style.display = 'none';
        }
    };

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;

            if (!email || !password) {
                alert('Please enter email and password');
                return;
            }

            try {
                const data = await loginUser(email, password);
                showToast('✅ Login successful!', 'success');
                if (loginModal) loginModal.style.display = 'none';
                setTimeout(() => {
                    location.reload();
                }, 500);
            } catch (error) {
                showToast('❌ ' + error.message, 'error');
            }
        };
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName')?.value;
            const email = document.getElementById('registerEmail')?.value;
            const password = document.getElementById('registerPassword')?.value;
            const phone = document.getElementById('registerPhone')?.value;

            if (!name || !email || !password) {
                alert('Please fill in all required fields');
                return;
            }

            try {
                await registerUser(name, email, password, phone);
                showToast('✅ Registration successful! Please login.', 'success');
                if (registerModal) registerModal.style.display = 'none';
                if (loginModal) loginModal.style.display = 'flex';
                registerForm.reset();
            } catch (error) {
                showToast('❌ ' + error.message, 'error');
            }
        };
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm('Are you sure you want to logout?')) {
                logoutUser();
                location.reload();
            }
        };
    }
});

// ============================================
// CLOSE MODAL FUNCTION
// ============================================
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// ============================================
// API FUNCTIONS
// ============================================

async function registerUser(name, email, password, phone) {
    return apiRequest('/auth/register', 'POST', { name, email, password, phone });
}

async function loginUser(email, password) {
    const data = await apiRequest('/auth/login', 'POST', { email, password });
    if (data.token) {
        authToken = data.token;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
}

function logoutUser() {
    authToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}