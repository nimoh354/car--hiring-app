const db = require('../config/db');
const { 
    sendBookingConfirmation, 
    sendBookingCancellation 
} = require('../utils/email');

// ============================================
// CREATE BOOKING
// ============================================
exports.createBooking = async (req, res) => {
    try {
        const { car_id, pickup_date, dropoff_date } = req.body;
        const user_id = req.userId;

        const [cars] = await db.query('SELECT * FROM cars WHERE id = ? AND is_available = TRUE', [car_id]);
        if (cars.length === 0) {
            return res.status(404).json({ error: 'Car not available' });
        }

        const car = cars[0];
        const days = Math.ceil((new Date(dropoff_date) - new Date(pickup_date)) / (1000 * 60 * 60 * 24));
        const total_price = days * parseFloat(car.price_per_day);

        const [conflicts] = await db.query(
            `SELECT * FROM bookings WHERE car_id = ? AND status != 'cancelled' 
             AND ((pickup_date <= ? AND dropoff_date >= ?) OR (pickup_date <= ? AND dropoff_date >= ?))`,
            [car_id, dropoff_date, pickup_date, dropoff_date, pickup_date]
        );

        if (conflicts.length > 0) {
            return res.status(400).json({ error: 'Car is already booked for these dates' });
        }

        const [result] = await db.query(
            `INSERT INTO bookings (user_id, car_id, pickup_date, dropoff_date, total_price) 
             VALUES (?, ?, ?, ?, ?)`,
            [user_id, car_id, pickup_date, dropoff_date, total_price]
        );

        // ✅ Send confirmation email (INSIDE the function)
        const [user] = await db.query('SELECT * FROM users WHERE id = ?', [user_id]);
        await sendBookingConfirmation({ id: result.insertId, pickup_date, dropoff_date, total_price }, car, user[0]);

        res.status(201).json({
            message: 'Booking created successfully',
            bookingId: result.insertId,
            total_price
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GET USER BOOKINGS
// ============================================
exports.getUserBookings = async (req, res) => {
    try {
        const [bookings] = await db.query(
            `SELECT b.*, c.brand, c.model, c.license_plate, c.image_url 
             FROM bookings b 
             JOIN cars c ON b.car_id = c.id 
             WHERE b.user_id = ? 
             ORDER BY b.created_at DESC`,
            [req.userId]
        );
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// CANCEL BOOKING
// ============================================
exports.cancelBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        const [bookings] = await db.query(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
            [bookingId, req.userId]
        );
        
        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookings[0];

        await db.query(
            'UPDATE bookings SET status = "cancelled" WHERE id = ?',
            [bookingId]
        );

        // ✅ Send cancellation email (INSIDE the function)
        const [car] = await db.query('SELECT * FROM cars WHERE id = ?', [booking.car_id]);
        const [user] = await db.query('SELECT * FROM users WHERE id = ?', [booking.user_id]);
        await sendBookingCancellation(booking, car[0], user[0]);

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GET ALL BOOKINGS (ADMIN)
// ============================================
exports.getAllBookings = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const [bookings] = await db.query(
            `SELECT b.*, u.name as user_name, u.email, c.brand, c.model, c.license_plate 
             FROM bookings b 
             JOIN users u ON b.user_id = u.id 
             JOIN cars c ON b.car_id = c.id 
             ORDER BY b.created_at DESC`
        );
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// UPDATE BOOKING STATUS (ADMIN)
// ============================================
exports.updateBookingStatus = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { status } = req.body;
        
        // Check if admin
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // Valid statuses
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'assigned'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        // Check if booking exists
        const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Update status
        await db.query(
            'UPDATE bookings SET status = ? WHERE id = ?',
            [status, bookingId]
        );
        
        res.json({ message: 'Booking status updated successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GET ANALYTICS DATA (ADMIN)
// ============================================
exports.getAnalytics = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Total revenue
        const [totalRevenue] = await db.query(
            'SELECT SUM(total_price) as total FROM bookings WHERE status = "completed"'
        );
        
        // Monthly bookings and revenue
        const [monthlyData] = await db.query(
            `SELECT 
                DATE_FORMAT(created_at, '%b %Y') as month,
                COUNT(*) as count,
                SUM(total_price) as revenue
             FROM bookings 
             WHERE status = 'completed' 
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY created_at DESC
             LIMIT 6`
        );

        // Popular cars
        const [popularCars] = await db.query(
            `SELECT 
                CONCAT(c.brand, ' ', c.model) as name,
                COUNT(b.id) as count
             FROM bookings b
             JOIN cars c ON b.car_id = c.id
             GROUP BY b.car_id
             ORDER BY count DESC
             LIMIT 5`
        );

        // Status counts
        const [statusCounts] = await db.query(
            `SELECT status, COUNT(*) as count 
             FROM bookings 
             GROUP BY status`
        );

        // This month revenue
        const [monthRevenue] = await db.query(
            `SELECT SUM(total_price) as total 
             FROM bookings 
             WHERE status = 'completed' 
               AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
               AND YEAR(created_at) = YEAR(CURRENT_DATE())`
        );

        // This week revenue
        const [weekRevenue] = await db.query(
            `SELECT SUM(total_price) as total 
             FROM bookings 
             WHERE status = 'completed' 
               AND YEARWEEK(created_at) = YEARWEEK(CURRENT_DATE())`
        );

        // Average per booking
        const [avgBooking] = await db.query(
            `SELECT AVG(total_price) as avg 
             FROM bookings 
             WHERE status = 'completed'`
        );

        // Format monthly data
        const monthlyBookings = monthlyData.map(d => ({
            month: d.month,
            count: d.count
        }));

        const monthlyRevenue = monthlyData.map(d => ({
            month: d.month,
            revenue: d.revenue
        }));

        // Format status counts
        const statusObj = {};
        statusCounts.forEach(s => {
            statusObj[s.status] = s.count;
        });

        res.json({
            totalRevenue: totalRevenue[0].total || 0,
            monthRevenue: monthRevenue[0].total || 0,
            weekRevenue: weekRevenue[0].total || 0,
            avgBooking: avgBooking[0].avg || 0,
            monthlyBookings: monthlyBookings.reverse(),
            monthlyRevenue: monthlyRevenue.reverse(),
            popularCars: popularCars,
            statusCounts: statusObj
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: error.message });
    }
};