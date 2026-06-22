// ============================================
// DRIVER PORTAL - COMPLETE FIXED
// ============================================

let currentDriverId = null;
let isAvailable = true;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔍 Driver Portal loading...');
    
    const user = getCurrentUser();
    console.log('🔍 Current user:', user);
    
    if (!user) {
        showToast('Please login as driver', 'error');
        setTimeout(() => {
            window.location.href = '/driver-login';
        }, 1500);
        return;
    }
    
    if (user.role !== 'driver') {
        showToast('Access denied. Driver only!', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
        return;
    }

    // Set logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            logoutUser();
            window.location.href = '/';
        };
    }

    // Availability toggle
    const availabilityBtn = document.getElementById('toggleAvailabilityBtn');
    if (availabilityBtn) {
        availabilityBtn.onclick = toggleAvailability;
    }

    // Navigation
    document.querySelectorAll('.sidebar-menu a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadMyRides(tab.dataset.status);
        });
    });

    // Sidebar toggle
    const toggleBtn = document.getElementById('toggleSidebar');
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        };
    }

    await loadDriverData();
});

// ============================================
// NAVIGATION
// ============================================
function navigateTo(page) {
    document.querySelectorAll('.sidebar-menu a[data-page]').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });

    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'my-rides':
            loadMyRides('all');
            break;
        case 'earnings':
            loadEarnings();
            break;
        case 'available':
            loadAvailableBookings();
            break;
        case 'profile':
            // Already loaded
            break;
    }
}

// ============================================
// LOAD DRIVER DATA
// ============================================
async function loadDriverData() {
    try {
        const driver = await getDriverProfile();
        currentDriverId = driver.id;
        isAvailable = driver.is_available === 1;
        
        // Update profile info
        document.getElementById('driverNameTop').textContent = driver.name || 'Driver';
        document.getElementById('profileName').textContent = driver.name || '-';
        document.getElementById('profileEmail').textContent = driver.email || '-';
        document.getElementById('profileLicense').textContent = driver.license_number || '-';
        document.getElementById('profilePhone').textContent = driver.phone || '-';
        document.getElementById('profileAddress').textContent = driver.address || '-';
        document.getElementById('profileJoined').textContent = driver.created_at ? new Date(driver.created_at).toLocaleDateString() : '-';
        
        // Update stats
        document.getElementById('totalTrips').textContent = driver.total_trips || 0;
        document.getElementById('totalEarnings').textContent = `$${driver.earnings || 0}`;
        document.getElementById('driverRating').textContent = `${driver.rating || 0} ⭐`;
        
        updateAvailabilityUI();
        
        // Load all sections
        await loadDashboard();
        await loadMyRides('all');
        await loadAvailableBookings();
        await loadEarnings();
        
    } catch (error) {
        console.error('Error loading driver data:', error);
        showToast('Error loading driver data: ' + error.message, 'error');
    }
}

// ============================================
// AVAILABILITY
// ============================================
function updateAvailabilityUI() {
    const statusEl = document.getElementById('statusBadge');
    const btnEl = document.getElementById('toggleAvailabilityBtn');
    
    if (isAvailable) {
        statusEl.className = 'status-badge';
        statusEl.innerHTML = '<i class="fas fa-circle"></i> Available';
        btnEl.textContent = '🟢 Available';
        btnEl.className = 'btn-availability';
    } else {
        statusEl.className = 'status-badge unavailable';
        statusEl.innerHTML = '<i class="fas fa-circle"></i> Not Available';
        btnEl.textContent = '🔴 Not Available';
        btnEl.className = 'btn-availability unavailable';
    }
}

async function toggleAvailability() {
    try {
        const newStatus = !isAvailable;
        const btn = document.getElementById('toggleAvailabilityBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Updating...';
        
        await updateDriverAvailability(newStatus);
        isAvailable = newStatus;
        updateAvailabilityUI();
        showToast(`✅ Status updated: ${isAvailable ? 'Available' : 'Not Available'}`, 'success');
        await loadDriverData();
    } catch (error) {
        showToast('❌ Error updating availability: ' + error.message, 'error');
        isAvailable = !isAvailable;
        updateAvailabilityUI();
    } finally {
        const btn = document.getElementById('toggleAvailabilityBtn');
        btn.disabled = false;
        updateAvailabilityUI();
    }
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        const available = await getAvailableBookings();
        document.getElementById('availableCount').textContent = available?.length || 0;

        const bookings = await getDriverBookings();
        const container = document.getElementById('recentRides');
        const recent = bookings?.slice(0, 5) || [];
        
        if (recent.length === 0) {
            container.innerHTML = '<p class="no-data">No rides yet. Accept a booking to get started!</p>';
            return;
        }

        container.innerHTML = recent.map(b => `
            <div class="ride-card">
                <div class="ride-info">
                    <h4>${b.brand} ${b.model}</h4>
                    <p>📅 ${b.pickup_date} → ${b.dropoff_date} | 💰 $${b.total_price}</p>
                </div>
                <span class="ride-status status-${b.status}">${b.status.toUpperCase()}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ============================================
// MY RIDES
// ============================================
async function loadMyRides(filter = 'all') {
    try {
        const bookings = await getDriverBookings();
        const container = document.getElementById('myRidesList');
        
        let filtered = bookings || [];
        if (filter !== 'all') {
            filtered = filtered.filter(b => b.status === filter);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p class="no-data">No rides found.</p>';
            return;
        }

        container.innerHTML = filtered.map(b => `
            <div class="ride-card">
                <div class="ride-info">
                    <h4>${b.brand} ${b.model}</h4>
                    <p>📅 ${b.pickup_date} → ${b.dropoff_date}</p>
                    <p>💰 $${b.total_price} | 👤 ${b.user_name || 'Customer'}</p>
                </div>
                <div>
                    <span class="ride-status status-${b.status}">${b.status.toUpperCase()}</span>
                    ${b.status === 'assigned' ? `<button class="btn-complete" onclick="completeTrip(${b.id})">✅ Complete</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading rides:', error);
    }
}

// ============================================
// EARNINGS
// ============================================
async function loadEarnings() {
    try {
        const driver = await getDriverProfile();
        document.getElementById('totalEarningsPage').textContent = `$${driver.earnings || 0}`;
        document.getElementById('totalTripsPage').textContent = driver.total_trips || 0;
        document.getElementById('monthEarnings').textContent = `$${driver.earnings || 0}`;

        const bookings = await getDriverBookings();
        const container = document.getElementById('earningsHistory');
        const completed = bookings?.filter(b => b.status === 'completed') || [];

        if (completed.length === 0) {
            container.innerHTML = '<p class="no-data">No earnings history yet.</p>';
            return;
        }

        container.innerHTML = completed.map(b => `
            <div class="ride-card">
                <div class="ride-info">
                    <h4>${b.brand} ${b.model}</h4>
                    <p>📅 ${b.pickup_date} → ${b.dropoff_date}</p>
                </div>
                <div style="text-align:right;">
                    <p style="color:var(--gold);font-weight:bold;">+$${b.total_price}</p>
                    <small style="color:var(--gray);">${new Date(b.created_at).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading earnings:', error);
    }
}

// ============================================
// AVAILABLE BOOKINGS
// ============================================
async function loadAvailableBookings() {
    try {
        console.log('🔄 Loading available bookings...');
        const bookings = await getAvailableBookings();
        console.log('📊 Available bookings:', bookings);
        
        const container = document.getElementById('availableBookingsList');
        
        if (!container) {
            console.error('❌ availableBookingsList container not found');
            return;
        }
        
        if (!bookings || bookings.length === 0) {
            container.innerHTML = '<p class="no-data">No available bookings for assignment.</p>';
            return;
        }

        console.log(`✅ Displaying ${bookings.length} available bookings`);

        container.innerHTML = bookings.map(b => `
            <div class="ride-card">
                <div class="ride-info">
                    <h4>${b.brand} ${b.model}</h4>
                    <p>📅 ${b.pickup_date} → ${b.dropoff_date}</p>
                    <p>💰 $${b.total_price} | 👤 ${b.user_name || 'Customer'}</p>
                </div>
                <button class="btn-accept" onclick="acceptBooking(${b.id})">✅ Accept</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('❌ Error loading available bookings:', error);
        const container = document.getElementById('availableBookingsList');
        if (container) {
            container.innerHTML = `<p class="no-data">❌ Error: ${error.message}</p>`;
        }
    }
}

// ============================================
// ACCEPT BOOKING
// ============================================
async function acceptBooking(bookingId) {
    console.log(`🔍 Accepting booking ${bookingId} with driver ${currentDriverId}`);
    
    if (!currentDriverId) {
        showToast('❌ Driver ID not found. Please refresh the page.', 'error');
        return;
    }
    
    if (!confirm(`Accept booking #${bookingId}?`)) return;
    
    try {
        showToast('⏳ Accepting booking...', 'info');
        await assignDriver(bookingId, currentDriverId);
        showToast('✅ Booking accepted successfully!', 'success');
        await loadDriverData();
    } catch (error) {
        console.error('❌ Error accepting booking:', error);
        showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================
// COMPLETE TRIP
// ============================================
async function completeTrip(bookingId) {
    if (!confirm('Mark this trip as completed?')) return;
    
    try {
        showToast('⏳ Completing trip...', 'info');
        await completeBooking(bookingId);
        showToast('✅ Trip completed successfully! 🎉', 'success');
        await loadDriverData();
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
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