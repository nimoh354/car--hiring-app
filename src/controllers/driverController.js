const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
    sendDriverAssignmentNotification,
    sendTripCompletion
} = require('../utils/email');

// Register Driver
exports.registerDriver = async (req, res) => {
    try {
        const { name, email, password, license_number, phone, address } = req.body;

        // Check if user exists
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with role 'driver'
        const [userResult] = await db.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone, 'driver']
        );

        const userId = userResult.insertId;

        // Create driver profile
        await db.query(
            'INSERT INTO drivers (user_id, license_number, phone, address) VALUES (?, ?, ?, ?)',
            [userId, license_number, phone, address]
        );

        res.status(201).json({ 
            message: 'Driver registered successfully!',
            userId: userId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Driver Profile
exports.getDriverProfile = async (req, res) => {
    try {
        const [drivers] = await db.query(
            `SELECT d.*, u.name, u.email 
             FROM drivers d 
             JOIN users u ON d.user_id = u.id 
             WHERE d.user_id = ?`,
            [req.userId]
        );
        
        if (drivers.length === 0) {
            return res.status(404).json({ error: 'Driver profile not found' });
        }
        
        res.json(drivers[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Driver's Bookings
exports.getDriverBookings = async (req, res) => {
    try {
        // Get driver id
        const [drivers] = await db.query('SELECT id FROM drivers WHERE user_id = ?', [req.userId]);
        if (drivers.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        
        const driverId = drivers[0].id;
        
        const [bookings] = await db.query(
            `SELECT b.*, c.brand, c.model, c.image_url, u.name as user_name 
             FROM bookings b 
             JOIN cars c ON b.car_id = c.id 
             JOIN users u ON b.user_id = u.id 
             WHERE b.driver_id = ? 
             ORDER BY b.created_at DESC`,
            [driverId]
        );
        
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Available Bookings for Assignment
exports.getAvailableBookings = async (req, res) => {
    try {
        console.log('📡 Getting available bookings...');
        
        const [bookings] = await db.query(
            `SELECT b.*, c.brand, c.model, c.image_url, u.name as user_name 
             FROM bookings b 
             JOIN cars c ON b.car_id = c.id 
             JOIN users u ON b.user_id = u.id 
             WHERE b.driver_id IS NULL 
               AND b.status IN ('pending', 'confirmed')
             ORDER BY b.pickup_date ASC`
        );
        
        console.log(`📋 Found ${bookings.length} available bookings`);
        res.json(bookings);
    } catch (error) {
        console.error('❌ Error getting available bookings:', error);
        res.status(500).json({ error: error.message });
    }
};

// Assign Driver to Booking
exports.assignDriver = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { driver_id } = req.body;
        
        console.log(`🔄 Assigning driver ${driver_id} to booking ${bookingId}`);
        
        // Check if booking exists
        const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Check if driver exists
        const [drivers] = await db.query('SELECT * FROM drivers WHERE id = ?', [driver_id]);
        if (drivers.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        
        // Update booking with driver
        await db.query(
            'UPDATE bookings SET driver_id = ?, status = "assigned" WHERE id = ?',
            [driver_id, bookingId]
        );
        
        console.log(`✅ Driver ${driver_id} assigned to booking ${bookingId}`);
        
        // ✅ Send driver assignment notification (INSIDE the function)
        const [booking] = await db.query(
            'SELECT b.*, c.brand, c.model FROM bookings b JOIN cars c ON b.car_id = c.id WHERE b.id = ?',
            [bookingId]
        );
        const [user] = await db.query('SELECT * FROM users WHERE id = ?', [booking[0].user_id]);
        const [driver] = await db.query(
            'SELECT d.*, u.name FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.id = ?',
            [driver_id]
        );

        await sendDriverAssignmentNotification(
            booking[0], 
            { brand: booking[0].brand, model: booking[0].model }, 
            user[0], 
            driver[0]
        );

        res.json({ 
            message: 'Driver assigned successfully!',
            bookingId: bookingId,
            driverId: driver_id
        });
    } catch (error) {
        console.error('❌ Assignment error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Complete Booking (Trip Completed)
exports.completeBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        // Get booking details
        const [bookings] = await db.query(
            'SELECT * FROM bookings WHERE id = ?',
            [bookingId]
        );
        
        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        const booking = bookings[0];
        
        // Update booking status to completed
        await db.query(
            'UPDATE bookings SET status = "completed" WHERE id = ?',
            [bookingId]
        );
        
        // Update driver stats
        await db.query(
            'UPDATE drivers SET total_trips = total_trips + 1, earnings = earnings + ? WHERE id = ?',
            [booking.total_price, booking.driver_id]
        );
        
        // ✅ Send trip completion email (INSIDE the function)
        const [car] = await db.query('SELECT * FROM cars WHERE id = ?', [booking.car_id]);
        const [user] = await db.query('SELECT * FROM users WHERE id = ?', [booking.user_id]);
        const [driver] = await db.query(
            'SELECT d.*, u.name FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.id = ?',
            [booking.driver_id]
        );

        await sendTripCompletion(booking, car[0], user[0], driver[0]);

        res.json({ message: 'Trip completed successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get All Drivers (Admin)
exports.getAllDrivers = async (req, res) => {
    try {
        // Check if admin
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const [drivers] = await db.query(
            `SELECT d.*, u.name, u.email, u.phone 
             FROM drivers d 
             JOIN users u ON d.user_id = u.id`
        );
        
        console.log(`✅ Found ${drivers.length} drivers`);
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// UPDATE DRIVER AVAILABILITY
// ============================================
exports.updateAvailability = async (req, res) => {
    try {
        const { is_available } = req.body;
        const userId = req.userId;
        
        console.log(`🔄 Updating availability for user ${userId} to ${is_available}`);
        
        // Get driver id from user
        const [drivers] = await db.query('SELECT id FROM drivers WHERE user_id = ?', [userId]);
        if (drivers.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        await db.query(
            'UPDATE drivers SET is_available = ? WHERE user_id = ?',
            [is_available, userId]
        );

        console.log(`✅ Driver availability updated to ${is_available ? 'available' : 'unavailable'}`);
        
        res.json({ 
            message: `Driver availability updated to ${is_available ? 'available' : 'unavailable'}`,
            is_available: is_available
        });
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GET DRIVER STATUS
// ============================================
exports.getDriverStatus = async (req, res) => {
    try {
        const { driver_id } = req.params;
        
        const [drivers] = await db.query(
            `SELECT d.is_available, d.rating, d.total_trips, u.name 
             FROM drivers d 
             JOIN users u ON d.user_id = u.id 
             WHERE d.id = ?`,
            [driver_id]
        );
        
        if (drivers.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        
        res.json({
            is_available: drivers[0].is_available === 1,
            rating: drivers[0].rating || 0,
            total_trips: drivers[0].total_trips || 0,
            name: drivers[0].name
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};