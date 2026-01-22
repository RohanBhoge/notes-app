
import dotenv from "dotenv";
dotenv.config();

const requiredEnvVars = [
    'DB_HOST',
    'DB_USER',
    'DB_NAME',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET_NAME',
    'PORT'
];

const optionalEnvVars = {
    NODE_ENV: 'development',
    CORS_ORIGIN: 'http://localhost:5173',
    JWT_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100'
};

export function validateEnv() {
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
            'Please check your .env file against .env.example'
        );
    }

    // Set defaults for optional variables
    Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
        if (!process.env[key]) {
            process.env[key] = defaultValue;
        }
    });

    // Validate JWT secrets have minimum length
    if (process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    if (process.env.JWT_REFRESH_SECRET.length < 32) {
        throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
    }
}

export function getConfig() {
    return {
        db: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        },
        jwt: {
            secret: process.env.JWT_SECRET,
            refreshSecret: process.env.JWT_REFRESH_SECRET,
            expiresIn: process.env.JWT_EXPIRES_IN,
            refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
        },
        aws: {
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            s3BucketName: process.env.S3_BUCKET_NAME
        },
        server: {
            port: parseInt(process.env.PORT, 10),
            nodeEnv: process.env.NODE_ENV,
            corsOrigin: process.env.CORS_ORIGIN,
            isProduction: process.env.NODE_ENV === 'production'
        },
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10),
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)
        }
    };
}
