const db = require('../config/db');

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

        res.status(201).json({
            message: 'Booking created successfully',
            bookingId: result.insertId,
            total_price
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

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

        await db.query(
            'UPDATE bookings SET status = "cancelled" WHERE id = ?',
            [bookingId]
        );

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllBookings = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const [bookings] = await db.query(
            `SELECT b.*, u.name as user_name, u.email, c.brand, c.model 
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