const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Pusher = require('pusher');
const db = require('./config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Security Headers
app.use(helmet());

// Custom CSP (Content Security Policy)
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "js.pusher.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "images.unsplash.com", "via.placeholder.com"],
            fontSrc: ["'self'", "cdnjs.cloudflare.com"],
            connectSrc: ["'self'", "ws://localhost:8080", "ws.pusherapp.com", "*.pusher.com"],
        },
    })
);

// Prevent clickjacking
app.use(helmet.frameguard({ action: 'deny' }));

// Prevent MIME type sniffing
app.use(helmet.noSniff());

// XSS protection
app.use(helmet.xssFilter());

// Referrer policy
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));

// ============================================
// CORS CONFIGURATION
// ============================================
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:5000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ============================================
// REQUEST SIZE LIMITING
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// RATE LIMITING
// ============================================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// ============================================
// INPUT SANITIZATION
// ============================================
const { sanitizeBody } = require('./middleware/sanitize');
app.use(sanitizeBody);

// ============================================
// SERVE STATIC FILES
// ============================================
app.use(express.static(path.join(__dirname, '../public')));

// ============================================
// PUSHER - REAL-TIME NOTIFICATIONS (PRODUCTION)
// ============================================

let pusher = null;

// Initialize Pusher only if credentials exist
if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET) {
    pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER || 'mt1',
        useTLS: true,
    });
    console.log('🔌 Pusher initialized for production!');
} else {
    console.log('⚠️ Pusher credentials not found. Real-time notifications disabled.');
}

// ============================================
// BROADCAST FUNCTIONS (Supports both Pusher and WebSocket)
// ============================================

function broadcastMessage(type, message, data = {}) {
    // 1. Send via Pusher (Production)
    if (pusher) {
        try {
            pusher.trigger('car-hiring', type, {
                message,
                ...data,
                timestamp: new Date().toISOString()
            });
            console.log(`📨 Pusher event sent: ${type}`);
        } catch (error) {
            console.error('❌ Pusher error:', error.message);
        }
    }

    // 2. Send via WebSocket (Local Development)
    if (wss) {
        const payload = JSON.stringify({ type, message, ...data, timestamp: new Date().toISOString() });
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(payload);
                } catch (error) {
                    // Ignore send errors
                }
            }
        });
        console.log(`📨 WebSocket broadcast: ${type}`);
    }
}

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

function notifyNewBooking(booking) {
    broadcastMessage('NEW_BOOKING', `New booking #${booking.id} created!`, { bookingId: booking.id });
}

function notifyBookingStatus(bookingId, status) {
    broadcastMessage('BOOKING_STATUS', `Booking #${bookingId} status updated to ${status}`, { bookingId, status });
}

function notifyDriverAssigned(bookingId, driverName) {
    broadcastMessage('DRIVER_ASSIGNED', `Driver ${driverName} assigned to booking #${bookingId}`, { bookingId });
}

function notifyTripCompleted(bookingId) {
    broadcastMessage('TRIP_COMPLETED', `Trip #${bookingId} completed!`, { bookingId });
}

function notifyNewReview(carName) {
    broadcastMessage('NEW_REVIEW', `New review for ${carName}`, { carName });
}

// Export for use in controllers
module.exports.broadcast = {
    notifyNewBooking,
    notifyBookingStatus,
    notifyDriverAssigned,
    notifyTripCompleted,
    notifyNewReview
};

// ============================================
// IMPORT ROUTES
// ============================================
const authRoutes = require('./routes/authRoutes');
const carRoutes = require('./routes/carRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const driverRoutes = require('./routes/driverRoutes');
const packageRoutes = require('./routes/packageRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// ============================================
// USE ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/payments', paymentRoutes);

// ============================================
// PAGE ROUTES
// ============================================

// Main App
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Admin Portal
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin-login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Driver Portal
app.get('/driver-register', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/driver-register.html'));
});

app.get('/driver-login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/driver-login.html'));
});

app.get('/driver-portal', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/driver-portal.html'));
});

// Book Package
app.get('/book-package', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/book-package.html'));
});

// Payment Page
app.get('/payment', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/payment.html'));
});

// ============================================
// 404 HANDLER - MUST BE AT THE END
// ============================================
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

// ============================================
// CREATE ADMIN USER
// ============================================
async function createAdminUser() {
    try {
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        
        if (!adminPasswordHash) {
            console.log('⚠️ ADMIN_PASSWORD_HASH not found in .env');
            return;
        }

        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', ['admin@carhire.com']);
        
        if (existing.length === 0) {
            await db.query(
                'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
                ['Admin', 'admin@carhire.com', adminPasswordHash, '1234567890', 'admin']
            );
            console.log('✅ Admin created! Email: admin@carhire.com, Password: admin123');
        } else {
            console.log('ℹ️ Admin already exists');
        }
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    }
}

// ============================================
// WEBSOCKET SERVER (LOCAL DEVELOPMENT)
// ============================================

const WebSocket = require('ws');
let wss;
const clients = new Set();

try {
    wss = new WebSocket.Server({ port: 8080 });
    console.log('🔌 WebSocket server running on ws://localhost:8080');

    wss.on('connection', (ws) => {
        console.log('🔌 New WebSocket connection');
        clients.add(ws);

        ws.on('close', () => {
            clients.delete(ws);
            console.log('🔌 WebSocket disconnected');
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });
} catch (error) {
    console.log('⚠️ WebSocket server could not start on port 8080 - continuing without WebSocket');
}

// ============================================
// START SERVER - ALWAYS AT THE VERY END
// ============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`\n🚗 Server running on http://localhost:${PORT}`);
    console.log(`👑 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`🚗 Driver Portal: http://localhost:${PORT}/driver-login`);
    console.log(`📦 Packages: http://localhost:${PORT}/book-package`);
    console.log(`💳 Payment: http://localhost:${PORT}/payment`);
    console.log(`📧 Email notifications: ${process.env.EMAIL_USER ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`🔌 Real-time: ${pusher ? '✅ Pusher (Production)' : wss ? '✅ WebSocket (Local)' : '❌ Disabled'}\n`);
    await createAdminUser();
});

// ============================================
// EXPORT FOR VERCEL
// ============================================
module.exports = app;