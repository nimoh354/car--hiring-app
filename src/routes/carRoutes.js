const express = require('express');
const router = express.Router();
const { getAllCars, getCarById, addCar, updateCar, deleteCar } = require('../controllers/carController');
const auth = require('../middleware/auth');

router.get('/', getAllCars);
router.get('/:id', getCarById);
router.post('/', auth, addCar);
router.put('/:id', auth, updateCar);
router.delete('/:id', auth, deleteCar);

module.exports = router;