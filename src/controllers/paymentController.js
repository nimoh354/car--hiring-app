const db = require('../config/db');

// ============================================
// INITIATE PAYMENT
// ============================================
exports.initiatePayment = async (req, res) => {
    try {
        const { booking_id, phone, amount } = req.body;
        const user_id = req.userId;

        // Check if booking exists
        const [bookings] = await db.query(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
            [booking_id, user_id]
        );
        
        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Generate transaction ID
        const transaction_id = 'MP' + Date.now() + Math.floor(Math.random() * 1000);

        // Create payment record
        const [result] = await db.query(
            `INSERT INTO payments (booking_id, user_id, amount, phone, transaction_id, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [booking_id, user_id, amount, phone, transaction_id, 'pending']
        );

        // Simulate M-Pesa STK Push
        console.log(`📱 M-Pesa STK Push sent to ${phone} for KES ${amount}`);

        res.status(201).json({
            message: 'Payment initiated! Please check your phone for M-Pesa prompt.',
            transaction_id: transaction_id,
            payment_id: result.insertId,
            status: 'pending',
            mpesa_message: `You will receive a prompt on ${phone} to complete payment of KES ${amount}`
        });

    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// CONFIRM PAYMENT
// ============================================
exports.confirmPayment = async (req, res) => {
    try {
        const { transaction_id, status } = req.body;

        // Update payment status
        await db.query(
            'UPDATE payments SET status = ? WHERE transaction_id = ?',
            [status, transaction_id]
        );

        // If payment completed, update booking status
        if (status === 'completed') {
            const [payment] = await db.query(
                'SELECT booking_id FROM payments WHERE transaction_id = ?',
                [transaction_id]
            );
            
            if (payment.length > 0) {
                await db.query(
                    'UPDATE bookings SET status = "confirmed" WHERE id = ?',
                    [payment[0].booking_id]
                );
            }
        }

        res.json({
            message: 'Payment confirmed!',
            transaction_id,
            status
        });

    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GET PAYMENT STATUS
// ============================================
exports.getPaymentStatus = async (req, res) => {
    try {
        const paymentId = req.params.paymentId;
        const userId = req.userId;

        const [payments] = await db.query(
            'SELECT * FROM payments WHERE id = ? AND user_id = ?',
            [paymentId, userId]
        );

        if (payments.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json(payments[0]);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GET USER PAYMENTS
// ============================================
exports.getUserPayments = async (req, res) => {
    try {
        const [payments] = await db.query(
            `SELECT p.*, b.car_id, c.brand, c.model 
             FROM payments p
             JOIN bookings b ON p.booking_id = b.id
             JOIN cars c ON b.car_id = c.id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC`,
            [req.userId]
        );

        res.json(payments);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GENERATE INVOICE
// ============================================
exports.generateInvoice = async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        const userId = req.userId;

        const [bookings] = await db.query(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
            [bookingId, userId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookings[0];
        const invoiceNumber = 'INV-' + Date.now() + '-' + bookingId;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const [cars] = await db.query('SELECT brand, model FROM cars WHERE id = ?', [booking.car_id]);

        const [existing] = await db.query(
            'SELECT * FROM invoices WHERE booking_id = ?',
            [bookingId]
        );

        let invoice;
        if (existing.length > 0) {
            invoice = existing[0];
        } else {
            const [result] = await db.query(
                `INSERT INTO invoices (booking_id, user_id, invoice_number, total_amount, due_date) 
                 VALUES (?, ?, ?, ?, ?)`,
                [bookingId, userId, invoiceNumber, booking.total_price, dueDate]
            );

            const [newInvoice] = await db.query(
                'SELECT * FROM invoices WHERE id = ?',
                [result.insertId]
            );
            invoice = newInvoice[0];
        }

        res.json({
            invoice,
            car: cars[0],
            booking
        });

    } catch (error) {
        console.error('Invoice generation error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GET USER INVOICES
// ============================================
exports.getInvoices = async (req, res) => {
    try {
        const [invoices] = await db.query(
            `SELECT i.*, b.car_id, c.brand, c.model 
             FROM invoices i
             JOIN bookings b ON i.booking_id = b.id
             JOIN cars c ON b.car_id = c.id
             WHERE i.user_id = ?
             ORDER BY i.created_at DESC`,
            [req.userId]
        );

        res.json(invoices);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};