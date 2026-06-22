const API_URL = 'http://localhost:5000/api';

// Store token
let authToken = localStorage.getItem('token');

// API helper
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
    }

    return result;
}

// ===== AUTH FUNCTIONS =====

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
}

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// ===== CAR FUNCTIONS =====

async function getCars(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/cars?${params}`);
}

async function getCar(id) {
    return apiRequest(`/cars/${id}`);
}

// ===== BOOKING FUNCTIONS =====

async function createBooking(carId, pickupDate, dropoffDate) {
    return apiRequest('/bookings', 'POST', { 
        car_id: carId, 
        pickup_date: pickupDate, 
        dropoff_date: dropoffDate 
    });
}

async function getMyBookings() {
    return apiRequest('/bookings/my-bookings');
}

// ===== BOOKING FUNCTIONS =====

async function cancelBooking(bookingId) {
    return apiRequest(`/bookings/${bookingId}/cancel`, 'PUT');
}

// ===== ADMIN FUNCTIONS =====

async function getAllBookings() {
    return apiRequest('/bookings/all');
}

async function addCar(carData) {
    return apiRequest('/cars', 'POST', carData);
}

async function updateCar(id, carData) {
    return apiRequest(`/cars/${id}`, 'PUT', carData);
}

async function deleteCar(id) {
    return apiRequest(`/cars/${id}`, 'DELETE');
}

// ===== DRIVER FUNCTIONS =====

async function registerDriver(driverData) {
    return apiRequest('/drivers/register', 'POST', driverData);
}

async function getDriverProfile() {
    return apiRequest('/drivers/profile');
}

async function getDriverBookings() {
    return apiRequest('/drivers/bookings');
}

async function getAvailableBookings() {
    return apiRequest('/drivers/available-bookings');
}


async function assignDriver(bookingId, driverId) {
    console.log(`📡 Assigning driver ${driverId} to booking ${bookingId}`);
    return apiRequest(`/drivers/assign-booking/${bookingId}`, 'PUT', { driver_id: driverId });
}

async function completeBooking(bookingId) {
    return apiRequest(`/drivers/complete-booking/${bookingId}`, 'PUT');
}
// ===== DRIVER MANAGEMENT (ADMIN) =====

async function getDrivers() {
    console.log('📡 Fetching drivers from API...');
    const result = await apiRequest('/drivers/all');
    console.log('📡 API returned:', result);
    return result;
}

// ===== BOOKING MANAGEMENT (ADMIN) =====

async function updateBookingStatus(bookingId, status) {
    return apiRequest(`/bookings/${bookingId}/status`, 'PUT', { status });
}
// ============================================
// PACKAGE API FUNCTIONS
// ============================================

async function getPackages() {
    return apiRequest('/packages/packages');
}

async function getPackageById(id) {
    return apiRequest(`/packages/packages/${id}`);
}

async function getHolidayOffers() {
    return apiRequest('/packages/offers');
}

async function getOfferByCode(code) {
    return apiRequest(`/packages/offers/code/${code}`);
}

async function calculatePrice(packageId, days, offerCode) {
    return apiRequest('/packages/calculate-price', 'POST', { 
        package_id: packageId, 
        days: days, 
        offer_code: offerCode 
    });
}

async function applyOffer(bookingId, offerCode) {
    return apiRequest('/packages/apply-offer', 'POST', { 
        booking_id: bookingId, 
        offer_code: offerCode 
    });
}

// ============================================
// REVIEW API FUNCTIONS
// ============================================

async function createReview(reviewData) {
    return apiRequest('/reviews', 'POST', reviewData);
}

async function getCarReviews(carId) {
    return apiRequest(`/reviews/car/${carId}`);
}

async function getDriverReviews(driverId) {
    return apiRequest(`/reviews/driver/${driverId}`);
}

async function getUserReviews() {
    return apiRequest('/reviews/my-reviews');
}

async function updateReview(reviewId, reviewData) {
    return apiRequest(`/reviews/${reviewId}`, 'PUT', reviewData);
}
// ============================================
// DRIVER AVAILABILITY
// ============================================

async function updateDriverAvailability(isAvailable) {
    return apiRequest('/drivers/availability', 'PUT', { is_available: isAvailable });
}

// ============================================
// GET DRIVER STATUS (for main app)
// ============================================

async function getDriverStatus(driverId) {
    return apiRequest(`/drivers/status/${driverId}`);
}

// ============================================
// ANALYTICS
// ============================================

async function getAnalytics() {
    return apiRequest('/bookings/analytics');
}