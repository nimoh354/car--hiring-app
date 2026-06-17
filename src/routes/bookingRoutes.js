const express = require('express');
const router = express.Router();
const { createBooking, getUserBookings, cancelBooking, getAllBookings } = require('../controllers/bookingController');
const auth = require('../middleware/auth');

router.post('/', auth, createBooking);
router.get('/my-bookings', auth, getUserBookings);
router.put('/:id/cancel', auth, cancelBooking);
router.get('/all', auth, getAllBookings);

module.exports = router;