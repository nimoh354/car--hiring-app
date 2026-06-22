const Joi = require('joi');

const schemas = {
    register: Joi.object({
        name: Joi.string().min(2).max(100).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        phone: Joi.string().optional()
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    car: Joi.object({
        brand: Joi.string().required(),
        model: Joi.string().required(),
        year: Joi.number().min(1900).max(new Date().getFullYear() + 1).required(),
        license_plate: Joi.string().required(),
        price_per_day: Joi.number().min(0).required(),
        fuel_type: Joi.string().valid('Petrol', 'Diesel', 'Electric', 'Hybrid'),
        transmission: Joi.string().valid('Manual', 'Automatic'),
        seats: Joi.number().min(1).max(50),
        image_url: Joi.string().optional(),
        is_available: Joi.boolean().optional()
    }),

    booking: Joi.object({
        car_id: Joi.number().required(),
        pickup_date: Joi.date().min('now').required(),
        dropoff_date: Joi.date().greater(Joi.ref('pickup_date')).required()
    }),

    payment: Joi.object({
        booking_id: Joi.number().required(),
        phone: Joi.string().pattern(/^(07|01)\d{8}$/).required(),
        amount: Joi.number().min(1).required()
    })
};

function validate(schemaName) {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        if (!schema) {
            return res.status(500).json({ error: 'Validation schema not found' });
        }

        const { error, value } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map(detail => detail.message);
            return res.status(400).json({ 
                error: 'Validation error',
                details: errors 
            });
        }

        req.body = value;
        next();
    };
}

module.exports = validate;