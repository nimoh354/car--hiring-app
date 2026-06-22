const express = require('express');
const router = express.Router();
const { 
    registerDriver, 
    getDriverProfile, 
    getDriverBookings,
    getAvailableBookings,
    assignDriver,
    completeBooking,
    getAllDrivers,
    updateAvailability,
    getDriverStatus
} = require('../controllers/driverController');
const auth = require('../middleware/auth');

router.post('/register', registerDriver);
router.get('/profile', auth, getDriverProfile);
router.get('/bookings', auth, getDriverBookings);
router.get('/available-bookings', auth, getAvailableBookings);
router.put('/assign-booking/:id', auth, assignDriver);  // ✅ THIS ROUTE
router.put('/complete-booking/:id', auth, completeBooking);
router.get('/all', auth, getAllDrivers);
router.put('/availability', auth, updateAvailability);
router.get('/status/:driver_id', getDriverStatus);

module.exports = router;