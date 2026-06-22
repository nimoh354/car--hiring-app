const express = require('express');
const router = express.Router();
const { 
    getAllCars, 
    getCarById, 
    addCar, 
    updateCar, 
    deleteCar 
} = require('../controllers/carController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// ============================================
// CAR ROUTES
// ============================================

// Public routes (no authentication required)
router.get('/', getAllCars);
router.get('/:id', getCarById);

// Admin only routes (authentication + validation required)
router.post('/', auth, validate('car'), addCar);
router.put('/:id', auth, validate('car'), updateCar);
router.delete('/:id', auth, deleteCar);

module.exports = router;