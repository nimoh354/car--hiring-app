document.addEventListener('DOMContentLoaded', () => {
    // Modal elements
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Check if user is logged in
    const user = getCurrentUser();
    if (user) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        logoutBtn.style.display = 'inline';
    }

    // Show login modal
    if (loginBtn) {
        loginBtn.onclick = () => loginModal.style.display = 'flex';
    }

    // Show register modal
    if (registerBtn) {
        registerBtn.onclick = () => registerModal.style.display = 'flex';
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            logoutUser();
            location.reload();
        };
    }

    // ===== LOGIN FORM =====
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                await loginUser(email, password);
                alert('✅ Login successful!');
                loginModal.style.display = 'none';
                location.reload();
            } catch (error) {
                alert('❌ ' + error.message);
            }
        };
    }

    // ===== REGISTER FORM =====
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const phone = document.getElementById('registerPhone').value;

            try {
                await registerUser(name, email, password, phone);
                alert('✅ Registration successful! Please login.');
                registerModal.style.display = 'none';
                loginModal.style.display = 'flex';
                registerForm.reset();
            } catch (error) {
                alert('❌ ' + error.message);
            }
        };
    }
});

// Close modal function
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
};