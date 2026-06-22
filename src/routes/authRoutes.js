const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    getProfile,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Public routes
router.post('/register', validate('register'), register);
router.post('/login', validate('login'), login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', auth, getProfile);

module.exports = router;