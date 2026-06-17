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

async function cancelBooking(bookingId) {
    return apiRequest(`/bookings/${bookingId}/cancel`, 'PUT');
}