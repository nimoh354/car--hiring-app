-- ============================================
-- CAR HIRING DATABASE - COMPLETE SCHEMA
-- ============================================

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS railway;
USE railway;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('user', 'admin', 'driver') DEFAULT 'user',
    reset_token VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CARS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year YEAR NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    price_per_day DECIMAL(10,2) NOT NULL,
    fuel_type ENUM('Petrol', 'Diesel', 'Electric', 'Hybrid') DEFAULT 'Petrol',
    transmission ENUM('Manual', 'Automatic') DEFAULT 'Manual',
    seats INT DEFAULT 5,
    image_url VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. DRIVERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 0.00,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    total_trips INT DEFAULT 0,
    earnings DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 4. BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    car_id INT NOT NULL,
    driver_id INT NULL,
    pickup_date DATE NOT NULL,
    dropoff_date DATE NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'assigned', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    CHECK (pickup_date < dropoff_date)
);

-- ============================================
-- 5. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(100) UNIQUE,
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    payment_method ENUM('mpesa', 'cash', 'card') DEFAULT 'mpesa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 6. INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    due_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 7. REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    car_id INT NOT NULL,
    driver_id INT NULL,
    car_rating INT DEFAULT 0,
    driver_rating INT DEFAULT 0,
    car_review TEXT,
    driver_review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    CHECK (car_rating >= 0 AND car_rating <= 5),
    CHECK (driver_rating >= 0 AND driver_rating <= 5)
);

-- ============================================
-- 8. CAR PACKAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS car_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    car_id INT NOT NULL,
    includes_gps BOOLEAN DEFAULT FALSE,
    includes_insurance BOOLEAN DEFAULT FALSE,
    includes_child_seat BOOLEAN DEFAULT FALSE,
    extra_services_price DECIMAL(10,2) DEFAULT 0.00,
    base_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

-- ============================================
-- 9. HOLIDAY OFFERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS holiday_offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. APPLIED OFFERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS applied_offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    offer_id INT NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (offer_id) REFERENCES holiday_offers(id) ON DELETE CASCADE
);

-- ============================================
-- 11. SAMPLE DATA
-- ============================================

-- Admin User (password: admin123)
INSERT INTO users (name, email, password, phone, role) VALUES 
('Admin', 'admin@carhire.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '1234567890', 'admin');

-- Test Customer (password: customer123)
INSERT INTO users (name, email, password, phone, role) VALUES 
('Test Customer', 'customer@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0712345678', 'user');

-- Test Drivers (password: driver123)
INSERT INTO users (name, email, password, phone, role) VALUES 
('James Mwangi', 'james@carhire.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0711122334', 'driver'),
('Sarah Wanjiru', 'sarah@carhire.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0722233445', 'driver'),
('David Ochieng', 'david@carhire.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0733344556', 'driver');

-- Driver Profiles
INSERT INTO drivers (user_id, license_number, phone, address, is_available) 
SELECT id, CONCAT('DL', id, '23456'), phone, 'Nairobi, Kenya', TRUE 
FROM users WHERE role = 'driver';

-- Sample Cars
INSERT INTO cars (brand, model, year, license_plate, price_per_day, fuel_type, transmission, seats, image_url) VALUES
('Toyota', 'Camry', 2022, 'ABC-1234', 45.00, 'Petrol', 'Automatic', 5, 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400'),
('Honda', 'Civic', 2023, 'XYZ-5678', 50.00, 'Petrol', 'Manual', 5, 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400'),
('Tesla', 'Model 3', 2024, 'TESLA-001', 120.00, 'Electric', 'Automatic', 5, 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400'),
('Ford', 'Mustang', 2022, 'MUST-007', 95.00, 'Petrol', 'Automatic', 4, 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=400'),
('BMW', 'X5', 2023, 'BMW-2023', 110.00, 'Diesel', 'Automatic', 7, 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400'),
('Mercedes', 'C-Class', 2024, 'MER-2024', 130.00, 'Petrol', 'Automatic', 5, 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=400'),
('Audi', 'Q7', 2023, 'AUDI-007', 115.00, 'Diesel', 'Automatic', 7, 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400');

-- Sample Packages
INSERT INTO car_packages (name, description, car_id, includes_gps, includes_insurance, includes_child_seat, extra_services_price, base_price, discount_percentage) VALUES
('Premium Package', 'Full coverage with GPS navigation and insurance', 1, TRUE, TRUE, FALSE, 25.00, 45.00, 10.00),
('Family Package', 'Perfect for family trips with child seat and GPS', 4, TRUE, FALSE, TRUE, 30.00, 50.00, 15.00),
('Business Package', 'Executive rental with full insurance and premium support', 2, TRUE, TRUE, FALSE, 35.00, 55.00, 5.00);

-- Sample Holiday Offers
INSERT INTO holiday_offers (name, description, code, discount_percentage, start_date, end_date) VALUES
('Christmas Special', 'Enjoy 20% off on all bookings this Christmas!', 'XMAS2026', 20.00, '2026-12-20', '2026-12-31'),
('New Year Deal', 'Start the new year with 15% off!', 'NY2027', 15.00, '2027-01-01', '2027-01-15'),
('Summer Vacation', 'Get 10% off on weekly rentals!', 'SUMMER10', 10.00, '2026-06-01', '2026-08-31');