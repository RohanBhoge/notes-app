import { ApiError } from '../utils/ApiError.js';

export const errorHandler = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';
        error = new ApiError(statusCode, message, false, err.stack);
    }

    const response = {
        success: false,
        message: error.message,
        statusCode: error.statusCode
    };

    if (process.env.NODE_ENV === 'development') {
        response.stack = error.stack;
    }
    res.status(error.statusCode).json(response);
};

export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
