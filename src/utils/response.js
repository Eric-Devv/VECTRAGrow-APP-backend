class ApiResponse {
  static success(data, message = 'Success', statusCode = 200) {
    return {
      success: true,
      statusCode,
      message,
      data
    };
  }

  static error(message, statusCode = 400, errors = null) {
    return {
      success: false,
      statusCode,
      message,
      errors
    };
  }

  static paginated(data, page, limit, total) {
    return {
      success: true,
      statusCode: 200,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static created(data, message = 'Resource created successfully') {
    return this.success(data, message, 201);
  }

  static updated(data, message = 'Resource updated successfully') {
    return this.success(data, message, 200);
  }

  static deleted(message = 'Resource deleted successfully') {
    return this.success(null, message, 200);
  }

  static notFound(message = 'Resource not found') {
    return this.error(message, 404);
  }

  static unauthorized(message = 'Unauthorized access') {
    return this.error(message, 401);
  }

  static forbidden(message = 'Forbidden access') {
    return this.error(message, 403);
  }

  static validationError(errors) {
    return this.error('Validation failed', 422, errors);
  }

  static serverError(message = 'Internal server error') {
    return this.error(message, 500);
  }
}

module.exports = ApiResponse; 