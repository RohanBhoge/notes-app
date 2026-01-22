import rateLimit from 'express-rate-limit';
export const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: 'Too many login attempts',
            message: 'You have exceeded the maximum number of login attempts. Please try again after 15 minutes.',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60) + ' minutes'
        });
    }
});

export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many accounts created from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: 'Too many registration attempts',
            message: 'You have exceeded the maximum number of registration attempts. Please try again after an hour.'
        });
    }
});
