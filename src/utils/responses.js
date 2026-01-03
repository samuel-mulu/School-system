export const sendSuccess = (res, data, message, statusCode = 200) => {
    const response = {
        success: true,
        data,
        ...(message && { message }),
    };
    return res.status(statusCode).json(response);
};
export const sendError = (res, error, statusCode = 500) => {
    const response = {
        success: false,
        error,
    };
    return res.status(statusCode).json(response);
};
//# sourceMappingURL=responses.js.map