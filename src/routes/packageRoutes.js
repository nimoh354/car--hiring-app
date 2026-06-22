const express = require('express');
const router = express.Router();
const { 
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
    getHolidayOffers,
    getOfferByCode,
    createHolidayOffer,
    updateHolidayOffer,
    deleteHolidayOffer,
    calculatePackagePrice,
    applyOfferToBooking
} = require('../controllers/packageController');
const auth = require('../middleware/auth');

// Public routes
router.get('/packages', getAllPackages);
router.get('/packages/:id', getPackageById);
router.get('/offers', getHolidayOffers);
router.get('/offers/code/:code', getOfferByCode);

// Protected routes (admin only)
router.post('/packages', auth, createPackage);
router.put('/packages/:id', auth, updatePackage);
router.delete('/packages/:id', auth, deletePackage);
router.post('/offers', auth, createHolidayOffer);
router.put('/offers/:id', auth, updateHolidayOffer);
router.delete('/offers/:id', auth, deleteHolidayOffer);

// User routes (auth required)
router.post('/calculate-price', auth, calculatePackagePrice);
router.post('/apply-offer', auth, applyOfferToBooking);

module.exports = router;