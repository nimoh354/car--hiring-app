const db = require('../config/db');

// ============================================
// CAR PACKAGES
// ============================================

// Get all packages
exports.getAllPackages = async (req, res) => {
    try {
        const [packages] = await db.query(
            `SELECT p.*, c.brand, c.model, c.year, c.image_url 
             FROM car_packages p 
             JOIN cars c ON p.car_id = c.id 
             WHERE p.is_active = TRUE
             ORDER BY p.created_at DESC`
        );
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get package by ID
exports.getPackageById = async (req, res) => {
    try {
        const [packages] = await db.query(
            `SELECT p.*, c.brand, c.model, c.year, c.image_url 
             FROM car_packages p 
             JOIN cars c ON p.car_id = c.id 
             WHERE p.id = ?`,
            [req.params.id]
        );
        
        if (packages.length === 0) {
            return res.status(404).json({ error: 'Package not found' });
        }
        
        res.json(packages[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create package (admin)
exports.createPackage = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { 
            name, description, car_id, includes_gps, includes_insurance, 
            includes_child_seat, extra_services_price, base_price, discount_percentage 
        } = req.body;

        const [result] = await db.query(
            `INSERT INTO car_packages 
             (name, description, car_id, includes_gps, includes_insurance, 
              includes_child_seat, extra_services_price, base_price, discount_percentage) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, description, car_id, includes_gps || 0, includes_insurance || 0, 
             includes_child_seat || 0, extra_services_price || 0, base_price, discount_percentage || 0]
        );

        res.status(201).json({ 
            message: 'Package created successfully!', 
            packageId: result.insertId 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update package (admin)
exports.updatePackage = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { 
            name, description, car_id, includes_gps, includes_insurance, 
            includes_child_seat, extra_services_price, base_price, discount_percentage, is_active 
        } = req.body;

        await db.query(
            `UPDATE car_packages SET 
             name = ?, description = ?, car_id = ?, includes_gps = ?, 
             includes_insurance = ?, includes_child_seat = ?, 
             extra_services_price = ?, base_price = ?, discount_percentage = ?, is_active = ? 
             WHERE id = ?`,
            [name, description, car_id, includes_gps || 0, includes_insurance || 0, 
             includes_child_seat || 0, extra_services_price || 0, base_price, discount_percentage || 0, is_active || 1, req.params.id]
        );

        res.json({ message: 'Package updated successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete package (admin)
exports.deletePackage = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        await db.query('DELETE FROM car_packages WHERE id = ?', [req.params.id]);
        res.json({ message: 'Package deleted successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// HOLIDAY OFFERS
// ============================================

// Get all active holiday offers
exports.getHolidayOffers = async (req, res) => {
    try {
        const [offers] = await db.query(
            `SELECT * FROM holiday_offers 
             WHERE is_active = TRUE 
               AND start_date <= CURDATE() 
               AND end_date >= CURDATE()
             ORDER BY discount_percentage DESC`
        );
        res.json(offers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get offer by code
exports.getOfferByCode = async (req, res) => {
    try {
        const [offers] = await db.query(
            `SELECT * FROM holiday_offers 
             WHERE code = ? AND is_active = TRUE 
               AND start_date <= CURDATE() 
               AND end_date >= CURDATE()`,
            [req.params.code]
        );
        
        if (offers.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired offer code' });
        }
        
        res.json(offers[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create holiday offer (admin)
exports.createHolidayOffer = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { name, description, code, discount_percentage, start_date, end_date } = req.body;

        const [result] = await db.query(
            `INSERT INTO holiday_offers (name, description, code, discount_percentage, start_date, end_date) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, description, code, discount_percentage, start_date, end_date]
        );

        res.status(201).json({ 
            message: 'Holiday offer created successfully!',
            offerId: result.insertId 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update holiday offer (admin)
exports.updateHolidayOffer = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { name, description, code, discount_percentage, start_date, end_date, is_active } = req.body;

        await db.query(
            `UPDATE holiday_offers SET 
             name = ?, description = ?, code = ?, discount_percentage = ?, 
             start_date = ?, end_date = ?, is_active = ? 
             WHERE id = ?`,
            [name, description, code, discount_percentage, start_date, end_date, is_active || 1, req.params.id]
        );

        res.json({ message: 'Holiday offer updated successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete holiday offer (admin)
exports.deleteHolidayOffer = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        await db.query('DELETE FROM holiday_offers WHERE id = ?', [req.params.id]);
        res.json({ message: 'Holiday offer deleted successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// CALCULATE PACKAGE PRICE
// ============================================

exports.calculatePackagePrice = async (req, res) => {
    try {
        const { package_id, days, offer_code } = req.body;

        // Get package details
        const [packages] = await db.query('SELECT * FROM car_packages WHERE id = ?', [package_id]);
        if (packages.length === 0) {
            return res.status(404).json({ error: 'Package not found' });
        }

        const pkg = packages[0];
        let basePrice = parseFloat(pkg.base_price);
        let extraServices = parseFloat(pkg.extra_services_price) || 0;
        
        // Add service fees
        if (pkg.includes_gps) extraServices += 5.00;
        if (pkg.includes_insurance) extraServices += 10.00;
        if (pkg.includes_child_seat) extraServices += 8.00;

        // Calculate subtotal
        let subtotal = (basePrice + extraServices) * days;
        let totalPrice = subtotal;
        let packageDiscount = 0;
        let offerDiscount = 0;
        let offer = null;

        // Apply package discount
        if (pkg.discount_percentage > 0) {
            packageDiscount = (subtotal * pkg.discount_percentage) / 100;
            totalPrice -= packageDiscount;
        }

        // Apply holiday offer
        if (offer_code) {
            const [offers] = await db.query(
                `SELECT * FROM holiday_offers 
                 WHERE code = ? AND is_active = TRUE 
                   AND start_date <= CURDATE() 
                   AND end_date >= CURDATE()`,
                [offer_code]
            );
            
            if (offers.length > 0) {
                offer = offers[0];
                offerDiscount = (totalPrice * offer.discount_percentage) / 100;
                totalPrice -= offerDiscount;
            }
        }

        res.json({
            package: pkg,
            days: days,
            basePrice: basePrice,
            extraServices: extraServices,
            subtotal: Math.round(subtotal * 100) / 100,
            packageDiscount: Math.round(packageDiscount * 100) / 100,
            offerDiscount: Math.round(offerDiscount * 100) / 100,
            totalPrice: Math.round(totalPrice * 100) / 100,
            services: {
                gps: pkg.includes_gps === 1,
                insurance: pkg.includes_insurance === 1,
                childSeat: pkg.includes_child_seat === 1
            },
            offer: offer
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// APPLY OFFER TO BOOKING
// ============================================

exports.applyOfferToBooking = async (req, res) => {
    try {
        const { booking_id, offer_code } = req.body;
        const user_id = req.userId;

        // Check if booking exists
        const [bookings] = await db.query(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
            [booking_id, user_id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Get offer
        const [offers] = await db.query(
            `SELECT * FROM holiday_offers 
             WHERE code = ? AND is_active = TRUE 
               AND start_date <= CURDATE() 
               AND end_date >= CURDATE()`,
            [offer_code]
        );

        if (offers.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired offer code' });
        }

        const offer = offers[0];
        const booking = bookings[0];
        const discountAmount = (booking.total_price * offer.discount_percentage) / 100;
        const newTotal = booking.total_price - discountAmount;

        // Update booking total
        await db.query(
            'UPDATE bookings SET total_price = ? WHERE id = ?',
            [newTotal, booking_id]
        );

        // Record applied offer
        await db.query(
            'INSERT INTO applied_offers (booking_id, offer_id, discount_amount) VALUES (?, ?, ?)',
            [booking_id, offer.id, discountAmount]
        );

        res.json({
            message: 'Offer applied successfully!',
            originalPrice: booking.total_price,
            discountAmount: Math.round(discountAmount * 100) / 100,
            newTotal: Math.round(newTotal * 100) / 100,
            offer: offer
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};