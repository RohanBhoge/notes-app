export class ApiResponse {
    static success(data = null, message = 'Success', statusCode = 200) {
        return {
            success: true,
            message,
            data,
            statusCode
        };
    }

    static error(message = 'Error', statusCode = 500, errors = null) {
        const response = {
            success: false,
            message,
            statusCode
        };

        if (errors) {
            response.errors = errors;
        }

        return response;
    }

    static paginated(data, page, limit, total, message = 'Success') {
        return {
            success: true,
            message,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            },
            statusCode: 200
        };
    }
}
