const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Verify connection
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email transporter error:', error);
    } else {
        console.log('✅ Email transporter ready!');
    }
});

// ============================================
// SEND BOOKING CONFIRMATION
// ============================================
async function sendBookingConfirmation(booking, car, user) {
    const mailOptions = {
        from: `"CarHire" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: '✅ Booking Confirmation - CarHire',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <div style="text-align: center; padding: 20px; background: #1a1a2e; border-radius: 10px 10px 0 0;">
                    <h2 style="color: #FFD700; margin: 0;">🚗 Booking Confirmed!</h2>
                </div>
                <div style="padding: 20px;">
                    <p>Dear <strong>${user.name}</strong>,</p>
                    <p>Your booking has been confirmed successfully!</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin: 0; color: #333;">Booking Details</h3>
                        <p><strong>Booking ID:</strong> #${booking.id}</p>
                        <p><strong>Car:</strong> ${car.brand} ${car.model} (${car.year})</p>
                        <p><strong>Pickup Date:</strong> ${booking.pickup_date}</p>
                        <p><strong>Dropoff Date:</strong> ${booking.dropoff_date}</p>
                        <p><strong>Total Price:</strong> $${booking.total_price}</p>
                    </div>
                    <p style="color: #666; font-size: 14px;">Thank you for choosing CarHire! We hope you enjoy your ride.</p>
                </div>
                <div style="text-align: center; padding: 10px; background: #f5f5f5; border-radius: 0 0 10px 10px;">
                    <p style="color: #999; font-size: 12px; margin: 0;">© 2026 CarHire. All rights reserved.</p>
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Booking confirmation sent to ${user.email}`);
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
    }
}

// ============================================
// SEND DRIVER ASSIGNMENT NOTIFICATION
// ============================================
async function sendDriverAssignmentNotification(booking, car, user, driver) {
    const mailOptions = {
        from: `"CarHire" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: '👨‍✈️ Driver Assigned - CarHire',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <div style="text-align: center; padding: 20px; background: #1a1a2e; border-radius: 10px 10px 0 0;">
                    <h2 style="color: #FFD700; margin: 0;">👨‍✈️ Driver Assigned!</h2>
                </div>
                <div style="padding: 20px;">
                    <p>Dear <strong>${user.name}</strong>,</p>
                    <p>A driver has been assigned to your booking!</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin: 0; color: #333;">Driver Details</h3>
                        <p><strong>Driver:</strong> ${driver.name}</p>
                        <p><strong>Phone:</strong> ${driver.phone || 'N/A'}</p>
                        <p><strong>Car:</strong> ${car.brand} ${car.model}</p>
                        <p><strong>Pickup:</strong> ${booking.pickup_date}</p>
                    </div>
                    <p style="color: #666; font-size: 14px;">Your driver will contact you shortly.</p>
                </div>
                <div style="text-align: center; padding: 10px; background: #f5f5f5; border-radius: 0 0 10px 10px;">
                    <p style="color: #999; font-size: 12px; margin: 0;">© 2026 CarHire. All rights reserved.</p>
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Driver assignment email sent to ${user.email}`);
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
    }
}

// ============================================
// SEND BOOKING CANCELLATION
// ============================================
async function sendBookingCancellation(booking, car, user) {
    const mailOptions = {
        from: `"CarHire" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: '❌ Booking Cancelled - CarHire',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <div style="text-align: center; padding: 20px; background: #1a1a2e; border-radius: 10px 10px 0 0;">
                    <h2 style="color: #ff6b6b; margin: 0;">❌ Booking Cancelled</h2>
                </div>
                <div style="padding: 20px;">
                    <p>Dear <strong>${user.name}</strong>,</p>
                    <p>Your booking has been cancelled successfully.</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin: 0; color: #333;">Booking Details</h3>
                        <p><strong>Booking ID:</strong> #${booking.id}</p>
                        <p><strong>Car:</strong> ${car.brand} ${car.model}</p>
                        <p><strong>Dates:</strong> ${booking.pickup_date} → ${booking.dropoff_date}</p>
                    </div>
                    <p style="color: #666; font-size: 14px;">We hope to serve you again in the future.</p>
                </div>
                <div style="text-align: center; padding: 10px; background: #f5f5f5; border-radius: 0 0 10px 10px;">
                    <p style="color: #999; font-size: 12px; margin: 0;">© 2026 CarHire. All rights reserved.</p>
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Cancellation email sent to ${user.email}`);
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
    }
}

// ============================================
// SEND TRIP COMPLETION
// ============================================
async function sendTripCompletion(booking, car, user, driver) {
    const mailOptions = {
        from: `"CarHire" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: '✅ Trip Completed - CarHire',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <div style="text-align: center; padding: 20px; background: #1a1a2e; border-radius: 10px 10px 0 0;">
                    <h2 style="color: #6bcb77; margin: 0;">✅ Trip Completed!</h2>
                </div>
                <div style="padding: 20px;">
                    <p>Dear <strong>${user.name}</strong>,</p>
                    <p>Your trip has been completed successfully!</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin: 0; color: #333;">Trip Summary</h3>
                        <p><strong>Car:</strong> ${car.brand} ${car.model}</p>
                        <p><strong>Driver:</strong> ${driver.name}</p>
                        <p><strong>Total Paid:</strong> $${booking.total_price}</p>
                    </div>
                    <p style="color: #666; font-size: 14px;">Thank you for choosing CarHire! We hope you enjoyed your ride.</p>
                    <p style="color: #666; font-size: 14px;">📝 Please leave a review for your driver and car.</p>
                </div>
                <div style="text-align: center; padding: 10px; background: #f5f5f5; border-radius: 0 0 10px 10px;">
                    <p style="color: #999; font-size: 12px; margin: 0;">© 2026 CarHire. All rights reserved.</p>
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Trip completion email sent to ${user.email}`);
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
    }
}

module.exports = {
    sendBookingConfirmation,
    sendDriverAssignmentNotification,
    sendBookingCancellation,
    sendTripCompletion,
};