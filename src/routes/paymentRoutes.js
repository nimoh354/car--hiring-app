const express = require('express');
const router = express.Router();
const { 
    initiatePayment,
    confirmPayment,
    getPaymentStatus,
    getUserPayments,
    generateInvoice,
    getInvoices
} = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.post('/initiate', auth, initiatePayment);
router.post('/confirm', auth, confirmPayment);
router.get('/status/:paymentId', auth, getPaymentStatus);
router.get('/my-payments', auth, getUserPayments);
router.post('/invoice/:bookingId', auth, generateInvoice);
router.get('/invoices', auth, getInvoices);

module.exports = router;