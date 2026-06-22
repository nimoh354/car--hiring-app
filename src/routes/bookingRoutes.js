const express = require('express');
const router = express.Router();
const { 
    createBooking, 
    getUserBookings, 
    cancelBooking, 
    getAllBookings,
    updateBookingStatus,
    getAnalytics
} = require('../controllers/bookingController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// ============================================
// BOOKING ROUTES
// ============================================

// Create booking (authenticated users only)
router.post('/', auth, validate('booking'), createBooking);

// Get user's bookings
router.get('/my-bookings', auth, getUserBookings);

// Cancel booking
router.put('/:id/cancel', auth, cancelBooking);

// Admin only routes
router.get('/all', auth, getAllBookings);
router.put('/:id/status', auth, updateBookingStatus);
router.get('/analytics', auth, getAnalytics);

module.exports = router;