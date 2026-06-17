const db = require('../config/db');

exports.getAllCars = async (req, res) => {
    try {
        const { available, brand, minPrice, maxPrice } = req.query;
        let query = 'SELECT * FROM cars WHERE 1=1';
        const params = [];

        if (available === 'true') {
            query += ' AND is_available = TRUE';
        }
        if (brand) {
            query += ' AND brand LIKE ?';
            params.push(`%${brand}%`);
        }
        if (minPrice) {
            query += ' AND price_per_day >= ?';
            params.push(minPrice);
        }
        if (maxPrice) {
            query += ' AND price_per_day <= ?';
            params.push(maxPrice);
        }

        const [cars] = await db.query(query, params);
        res.json(cars);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCarById = async (req, res) => {
    try {
        const [cars] = await db.query('SELECT * FROM cars WHERE id = ?', [req.params.id]);
        if (cars.length === 0) {
            return res.status(404).json({ error: 'Car not found' });
        }
        res.json(cars[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addCar = async (req, res) => {
    try {
        const { brand, model, year, license_plate, price_per_day, fuel_type, transmission, seats, image_url } = req.body;
        
        const [result] = await db.query(
            `INSERT INTO cars (brand, model, year, license_plate, price_per_day, fuel_type, transmission, seats, image_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [brand, model, year, license_plate, price_per_day, fuel_type, transmission, seats, image_url]
        );
        
        res.status(201).json({ message: 'Car added successfully', carId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCar = async (req, res) => {
    try {
        const { brand, model, year, license_plate, price_per_day, fuel_type, transmission, seats, image_url, is_available } = req.body;
        
        await db.query(
            `UPDATE cars SET brand=?, model=?, year=?, license_plate=?, price_per_day=?, 
             fuel_type=?, transmission=?, seats=?, image_url=?, is_available=? WHERE id=?`,
            [brand, model, year, license_plate, price_per_day, fuel_type, transmission, seats, image_url, is_available, req.params.id]
        );
        
        res.json({ message: 'Car updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteCar = async (req, res) => {
    try {
        await db.query('DELETE FROM cars WHERE id = ?', [req.params.id]);
        res.json({ message: 'Car deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};