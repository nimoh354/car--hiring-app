// ============================================
// ADMIN PROTECTION - Redirect if not admin
// ============================================

(function checkAdminAccess() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = '/admin-login';
        return;
    }
})();

let allDrivers = [];
let bookingsChart = null;
let revenueChart = null;
let popularCarsChart = null;
let statusChart = null;

// ============================================
// PUSHER - REAL-TIME NOTIFICATIONS (PRODUCTION)
// ============================================

function initPusher() {
    // Check if Pusher is available and credentials exist
    if (typeof Pusher !== 'undefined' && process.env && process.env.PUSHER_KEY) {
        try {
            const pusher = new Pusher(process.env.PUSHER_KEY, {
                cluster: process.env.PUSHER_CLUSTER || 'mt1',
                forceTLS: true
            });

            const channel = pusher.subscribe('car-hiring');

            channel.bind('NEW_BOOKING', (data) => {
                console.log('📨 Pusher: New booking:', data);
                showToast(`📅 ${data.message || 'New booking created!'}`, 'info');
                refreshAll();
            });

            channel.bind('BOOKING_STATUS', (data) => {
                console.log('📨 Pusher: Booking status:', data);
                showToast(`📅 ${data.message || 'Booking status updated'}`, 'info');
                refreshAll();
            });

            channel.bind('DRIVER_ASSIGNED', (data) => {
                console.log('📨 Pusher: Driver assigned:', data);
                showToast(`👨‍✈️ ${data.message || 'Driver assigned!'}`, 'success');
                refreshAll();
            });

            channel.bind('TRIP_COMPLETED', (data) => {
                console.log('📨 Pusher: Trip completed:', data);
                showToast(`✅ ${data.message || 'Trip completed!'}`, 'success');
                refreshAll();
            });

            channel.bind('NEW_REVIEW', (data) => {
                console.log('📨 Pusher: New review:', data);
                showToast(`⭐ ${data.message || 'New review received!'}`, 'info');
                refreshAll();
            });

            console.log('🔌 Pusher connected!');
            showToast('🔌 Real-time notifications connected!', 'success');
        } catch (error) {
            console.warn('⚠️ Pusher initialization failed:', error);
        }
    }
}

// ============================================
// WEBSOCKET - REAL-TIME NOTIFICATIONS (LOCAL)
// ============================================

let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectWebSocket() {
    // Only use WebSocket in development/local environment
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.log('🔌 WebSocket disabled in production (using Pusher)');
        return;
    }

    try {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close();
        }

        socket = new WebSocket('ws://localhost:8080');
        
        socket.onopen = () => {
            console.log('🔌 WebSocket connected');
            showToast('🔌 Real-time notifications connected!', 'success');
            reconnectAttempts = 0;
        };
        
        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };
        
        socket.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            attemptReconnect();
        };
        
        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    } catch (error) {
        console.error('WebSocket connection failed:', error);
    }
}

function attemptReconnect() {
    if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
        setTimeout(() => {
            connectWebSocket();
        }, 3000 * reconnectAttempts);
    } else {
        console.log('❌ Max reconnect attempts reached');
        showToast('⚠️ Real-time notifications disconnected', 'warning');
    }
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'NEW_BOOKING':
            showToast(`📅 New booking: ${data.message || 'A new booking was created!'}`, 'info');
            refreshAll();
            break;
            
        case 'BOOKING_STATUS':
            showToast(`📅 Booking #${data.bookingId} status changed to ${data.status}`, 'info');
            refreshAll();
            break;
            
        case 'DRIVER_ASSIGNED':
            showToast(`👨‍✈️ Driver assigned to booking #${data.bookingId}`, 'success');
            refreshAll();
            break;
            
        case 'TRIP_COMPLETED':
            showToast(`✅ Trip #${data.bookingId} completed!`, 'success');
            refreshAll();
            break;
            
        case 'NEW_REVIEW':
            showToast(`⭐ New review received for ${data.carName || 'a car'}`, 'info');
            refreshAll();
            break;
            
        default:
            console.log('Unknown message type:', data);
    }
}

// ============================================
// MAIN INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    const user = getCurrentUser();
    
    if (!user || user.role !== 'admin') {
        window.location.href = '/admin-login';
        return;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            logoutUser();
            window.location.href = '/admin-login';
        };
    }
    
    await loadAdminData();

    const carForm = document.getElementById('carForm');
    if (carForm) {
        carForm.onsubmit = async (e) => {
            e.preventDefault();
            
            const carData = {
                brand: document.getElementById('brand').value,
                model: document.getElementById('model').value,
                year: document.getElementById('year').value,
                license_plate: document.getElementById('license_plate').value,
                price_per_day: document.getElementById('price_per_day').value,
                fuel_type: document.getElementById('fuel_type').value,
                transmission: document.getElementById('transmission').value,
                seats: document.getElementById('seats').value,
                image_url: document.getElementById('image_url').value || 'https://via.placeholder.com/400x200?text=Car'
            };
            
            try {
                await addCar(carData);
                showToast('✅ Car added successfully!', 'success');
                hideAddCarForm();
                carForm.reset();
                await loadCarsAdmin();
                await loadStats();
                await loadAnalytics();
            } catch (error) {
                showToast('❌ Error: ' + error.message, 'error');
            }
        };
    }

    // Initialize real-time notifications
    initPusher();
    connectWebSocket();
});

// ============================================
// LOAD ADMIN DATA
// ============================================
async function loadAdminData() {
    try {
        await loadDrivers();
        await loadCarsAdmin();
        await loadStats();
        await loadAllBookings();
        await loadAnalytics();
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

// ============================================
// LOAD DRIVERS - WITH NAMES
// ============================================
async function loadDrivers() {
    try {
        console.log('🔄 Loading drivers...');
        const drivers = await getDrivers();
        console.log('📊 Drivers response:', drivers);
        
        allDrivers = drivers.map(d => ({
            ...d,
            name: d.name || 'Driver #' + d.id
        }));
        
        console.log(`✅ Loaded ${allDrivers.length} drivers`);
        
        if (allDrivers.length === 0) {
            console.warn('⚠️ No drivers found in database');
        }
    } catch (error) {
        console.error('❌ Error loading drivers:', error);
        allDrivers = [];
        showToast('❌ Error loading drivers: ' + error.message, 'error');
    }
}

// ============================================
// LOAD CARS
// ============================================
async function loadCarsAdmin() {
    try {
        const cars = await getCars();
        const container = document.getElementById('carsList');
        
        if (!cars || cars.length === 0) {
            container.innerHTML = '<div class="no-data">No cars available.</div>';
            return;
        }
        
        container.innerHTML = cars.map(car => `
            <div class="car-card-admin" id="car-${car.id}">
                <div class="car-info">
                    <h4>${car.brand} ${car.model} (${car.year})</h4>
                    <p>$${car.price_per_day}/day | ${car.fuel_type} | ${car.transmission} | ${car.seats} seats</p>
                    <p>⭐ ${car.avg_rating || 0}/5 | ${car.is_available ? '✅ Available' : '❌ Booked'} | ${car.license_plate}</p>
                </div>
                <div class="car-actions">
                    <button class="btn-edit" onclick="editCar(${car.id})">✏️ Edit</button>
                    <button class="btn-delete" onclick="deleteCar(${car.id})">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('carsList').innerHTML = `<div class="no-data">❌ Error: ${error.message}</div>`;
    }
}

// ============================================
// LOAD STATS
// ============================================
async function loadStats() {
    try {
        const cars = await getCars();
        const bookings = await getAllBookings();
        const drivers = await getDrivers();
        
        document.getElementById('totalCars').textContent = cars?.length || 0;
        document.getElementById('totalBookings').textContent = bookings?.length || 0;
        document.getElementById('totalUsers').textContent = drivers?.length || 0;
        
        const pending = bookings?.filter(b => b.status === 'pending' || b.status === 'confirmed') || [];
        document.getElementById('pendingBookings').textContent = pending.length;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ============================================
// LOAD ALL BOOKINGS - FIXED DRIVER DISPLAY
// ============================================
async function loadAllBookings() {
    try {
        const bookings = await getAllBookings();
        const container = document.getElementById('bookingsList');
        
        if (!bookings || bookings.length === 0) {
            container.innerHTML = '<div class="no-data">No bookings yet.</div>';
            return;
        }
        
        if (allDrivers.length === 0) {
            await loadDrivers();
        }
        
        container.innerHTML = bookings.map(b => {
            const isPending = b.status === 'pending' || b.status === 'confirmed';
            const hasDriver = b.driver_id !== null && b.driver_id !== undefined;
            const driver = allDrivers.find(d => d.id === b.driver_id);
            
            let driverDisplay = 'Not Assigned';
            let driverStatusIcon = '⚪';
            let driverStatusColor = '#666';
            
            if (hasDriver && driver) {
                driverDisplay = driver.name || 'Driver';
                if (driver.is_available) {
                    driverStatusIcon = '🟢';
                    driverStatusColor = '#6bcb77';
                } else {
                    driverStatusIcon = '🔴';
                    driverStatusColor = '#ff6b6b';
                }
            } else if (hasDriver && !driver) {
                driverDisplay = 'Unknown Driver';
                driverStatusIcon = '⚠️';
                driverStatusColor = '#ffd93d';
            }
            
            return `
                <div class="booking-item" id="booking-${b.id}">
                    <div class="booking-info">
                        <strong>#${b.id}</strong> - ${b.brand} ${b.model}
                        <br>
                        👤 ${b.user_name || 'User'} | 📅 ${b.pickup_date} → ${b.dropoff_date}
                        <br>
                        💰 $${b.total_price} | 🚗 ${b.license_plate || 'N/A'}
                        <br>
                        👨‍✈️ Driver: <span style="color: ${driverStatusColor}; font-weight: bold;">
                            ${driverStatusIcon} ${driverDisplay}
                        </span>
                        ${!hasDriver ? '<span style="color: #ffd93d; font-size: 0.8rem;"> (Click "Assign" below)</span>' : ''}
                    </div>
                    <div class="booking-actions">
                        <span class="status ${b.status}">${b.status.toUpperCase()}</span>
                        ${isPending ? `
                            <select class="driver-select" id="driver-select-${b.id}">
                                <option value="">Select Driver</option>
                                ${allDrivers.map(d => `
                                    <option value="${d.id}" ${b.driver_id === d.id ? 'selected' : ''}>
                                        ${d.name || 'Driver #' + d.id} ${d.is_available ? '🟢' : '🔴'}
                                    </option>
                                `).join('')}
                            </select>
                            <button class="btn-assign" onclick="assignDriverToBooking(${b.id})">Assign</button>
                        ` : ''}
                        ${b.status === 'pending' ? `<button class="btn-confirm" onclick="confirmBooking(${b.id})">Confirm</button>` : ''}
                        ${b.status !== 'cancelled' && b.status !== 'completed' ? 
                            `<button class="btn-cancel-admin" onclick="cancelBookingAdmin(${b.id})">Cancel</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        document.getElementById('bookingsList').innerHTML = `<div class="no-data">❌ Error: ${error.message}</div>`;
    }
}

// ============================================
// ASSIGN DRIVER TO BOOKING
// ============================================
async function assignDriverToBooking(bookingId) {
    console.log('🔍 Assign function called with bookingId:', bookingId);
    
    const select = document.getElementById(`driver-select-${bookingId}`);
    if (!select) {
        showToast('❌ Driver select not found', 'error');
        return;
    }
    
    const driverId = select.value;
    
    if (!driverId) {
        showToast('⚠️ Please select a driver', 'warning');
        return;
    }
    
    if (!confirm(`Assign this driver to booking #${bookingId}?`)) return;
    
    try {
        showToast('⏳ Assigning driver...', 'info');
        const result = await assignDriver(bookingId, driverId);
        showToast('✅ Driver assigned successfully!', 'success');
        await loadAllBookings();
        await loadStats();
    } catch (error) {
        console.error('❌ Assignment error:', error);
        showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================
// HELPERS
// ============================================
function getDriverName(driverId) {
    const driver = allDrivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unknown';
}

// ============================================
// CONFIRM BOOKING
// ============================================
async function confirmBooking(bookingId) {
    if (!confirm('Confirm this booking?')) return;
    
    try {
        await updateBookingStatus(bookingId, 'confirmed');
        showToast('✅ Booking confirmed!', 'success');
        await loadAllBookings();
        await loadStats();
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================
// CANCEL BOOKING (ADMIN)
// ============================================
async function cancelBookingAdmin(bookingId) {
    if (!confirm('Cancel this booking?')) return;
    
    try {
        await updateBookingStatus(bookingId, 'cancelled');
        showToast('✅ Booking cancelled!', 'success');
        await loadAllBookings();
        await loadStats();
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================
// CAR MANAGEMENT
// ============================================
function showAddCarForm() {
    document.getElementById('addCarForm').style.display = 'block';
}

function hideAddCarForm() {
    document.getElementById('addCarForm').style.display = 'none';
}

// ============================================
// DELETE CAR
// ============================================
async function deleteCar(carId) {
    if (!confirm('Are you sure you want to delete this car?')) return;
    
    try {
        await deleteCar(carId);
        showToast('✅ Car deleted successfully!', 'success');
        await loadCarsAdmin();
        await loadStats();
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================
// EDIT CAR
// ============================================
async function editCar(carId) {
    try {
        const car = await getCar(carId);
        
        const brand = prompt('Brand:', car.brand);
        if (brand === null) return;
        
        const model = prompt('Model:', car.model);
        if (model === null) return;
        
        const price = prompt('Price per day:', car.price_per_day);
        if (price === null) return;
        
        const updatedCar = {
            ...car,
            brand,
            model,
            price_per_day: parseFloat(price)
        };
        
        await updateCar(carId, updatedCar);
        showToast('✅ Car updated successfully!', 'success');
        await loadCarsAdmin();
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================
// LOAD ANALYTICS
// ============================================
async function loadAnalytics() {
    try {
        const data = await getAnalytics();
        
        document.getElementById('totalRevenue').textContent = `$${data.totalRevenue || 0}`;
        document.getElementById('monthRevenue').textContent = `$${data.monthRevenue || 0}`;
        document.getElementById('weekRevenue').textContent = `$${data.weekRevenue || 0}`;
        document.getElementById('avgBooking').textContent = `$${data.avgBooking || 0}`;
        
        createBookingsChart(data.monthlyBookings || []);
        createRevenueChart(data.monthlyRevenue || []);
        createPopularCarsChart(data.popularCars || []);
        createStatusChart(data.statusCounts || {});
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// ============================================
// CHART FUNCTIONS
// ============================================

function createBookingsChart(monthlyData) {
    const ctx = document.getElementById('bookingsChart');
    if (!ctx) return;
    
    const months = monthlyData.map(d => d.month || '');
    const counts = monthlyData.map(d => d.count || 0);
    
    if (bookingsChart) bookingsChart.destroy();
    
    bookingsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Bookings',
                data: counts,
                backgroundColor: 'rgba(255, 215, 0, 0.6)',
                borderColor: '#FFD700',
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#B8B8B8' } }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { color: '#B8B8B8' },
                    grid: { color: 'rgba(255,215,0,0.05)' }
                },
                x: { 
                    ticks: { color: '#B8B8B8' },
                    grid: { display: false }
                }
            }
        }
    });
}

function createRevenueChart(monthlyData) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    const months = monthlyData.map(d => d.month || '');
    const revenues = monthlyData.map(d => d.revenue || 0);
    
    if (revenueChart) revenueChart.destroy();
    
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Revenue ($)',
                data: revenues,
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                borderColor: '#FFD700',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#FFD700',
                pointBorderColor: '#0a0a0a'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#B8B8B8' } }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { 
                        color: '#B8B8B8',
                        callback: function(value) { return '$' + value; }
                    },
                    grid: { color: 'rgba(255,215,0,0.05)' }
                },
                x: { 
                    ticks: { color: '#B8B8B8' },
                    grid: { display: false }
                }
            }
        }
    });
}

function createPopularCarsChart(popularCars) {
    const ctx = document.getElementById('popularCarsChart');
    if (!ctx) return;
    
    const names = popularCars.map(d => d.name || '');
    const counts = popularCars.map(d => d.count || 0);
    const colors = ['#FFD700', '#FFC107', '#FFB300', '#FFA000', '#FF8F00'];
    
    if (popularCarsChart) popularCarsChart.destroy();
    
    popularCarsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: names,
            datasets: [{
                data: counts,
                backgroundColor: colors.slice(0, names.length),
                borderColor: '#0a0a0a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { 
                    labels: { 
                        color: '#B8B8B8',
                        padding: 10
                    }
                }
            }
        }
    });
}

function createStatusChart(statusCounts) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    const labels = ['Pending', 'Confirmed', 'Assigned', 'Completed', 'Cancelled'];
    const colors = ['#ffd93d', '#6bcb77', '#4d96ff', '#1a1a2e', '#ff6b6b'];
    const data = labels.map(label => statusCounts[label.toLowerCase()] || 0);
    
    if (statusChart) statusChart.destroy();
    
    statusChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#0a0a0a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { 
                    labels: { 
                        color: '#B8B8B8',
                        padding: 10
                    }
                }
            }
        }
    });
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

    const toast = document.createElement('div');
    const colors = {
        success: { bg: 'rgba(107, 203, 119, 0.15)', border: '#6bcb77', text: '#6bcb77' },
        error: { bg: 'rgba(255, 107, 107, 0.15)', border: '#ff6b6b', text: '#ff6b6b' },
        warning: { bg: 'rgba(255, 215, 0, 0.15)', border: '#FFD700', text: '#FFD700' },
        info: { bg: 'rgba(77, 150, 255, 0.15)', border: '#4d96ff', text: '#4d96ff' }
    };
    const color = colors[type] || colors.info;
    
    toast.style.cssText = `
        padding: 0.8rem 1.2rem;
        border-radius: 8px;
        background: ${color.bg};
        color: ${color.text};
        border-left: 4px solid ${color.border};
        font-weight: 500;
        animation: slideIn 0.5s ease;
        box-shadow: 0 5px 20px rgba(0,0,0,0.5);
        font-size: 0.9rem;
        backdrop-filter: blur(10px);
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

// ============================================
// REFRESH FUNCTIONS
// ============================================

let isRefreshing = false;

async function refreshAll() {
    if (isRefreshing) return;
    isRefreshing = true;
    
    const btn = document.getElementById('refreshAllBtn');
    const text = document.getElementById('refreshText');
    
    if (btn) {
        btn.disabled = true;
        if (text) text.innerHTML = '<span class="spinner">⟳</span> Refreshing...';
    }
    
    try {
        await loadAdminData();
        showToast('✅ All data refreshed successfully!', 'success');
        updateLastUpdated();
    } catch (error) {
        showToast('❌ Error refreshing: ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            if (text) text.textContent = 'Refresh All';
        }
        isRefreshing = false;
    }
}

async function refreshAnalytics() {
    try {
        await loadAnalytics();
        showToast('✅ Charts refreshed!', 'success');
    } catch (error) {
        showToast('❌ Error refreshing charts: ' + error.message, 'error');
    }
}

async function refreshCars() {
    try {
        await loadCarsAdmin();
        showToast('✅ Cars refreshed!', 'success');
    } catch (error) {
        showToast('❌ Error refreshing cars: ' + error.message, 'error');
    }
}

async function refreshBookings() {
    try {
        await loadAllBookings();
        showToast('✅ Bookings refreshed!', 'success');
    } catch (error) {
        showToast('❌ Error refreshing bookings: ' + error.message, 'error');
    }
}

function updateLastUpdated() {
    const el = document.getElementById('lastUpdated');
    if (el) {
        const now = new Date();
        el.textContent = `🕐 Last updated: ${now.toLocaleTimeString()}`;
    }
}

// ============================================
// CSS ANIMATION FOR TOAST
// ============================================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    .spinner {
        display: inline-block;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);