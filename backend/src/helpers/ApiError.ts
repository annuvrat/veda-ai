export class ApiError extends Error {
  statusCode: number;
  success: boolean;
  errors: any[];

  constructor(
    statusCode: number,
    message: string = "Something went wrong",
    errors: any[] = [],
    stack: string = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string = "Bad Request", errors: any[] = []): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message: string = "Unauthorized", errors: any[] = []): ApiError {
    return new ApiError(401, message, errors);
  }

  static forbidden(message: string = "Forbidden", errors: any[] = []): ApiError {
    return new ApiError(403, message, errors);
  }

  static notFound(message: string = "Not Found", errors: any[] = []): ApiError {
    return new ApiError(404, message, errors);
  }

  static internal(message: string = "Internal Server Error", errors: any[] = []): ApiError {
    return new ApiError(500, message, errors);
  }
}
