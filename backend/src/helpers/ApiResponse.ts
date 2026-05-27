import { Response } from "express";

export class ApiResponse<T = any> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;

  constructor(statusCode: number, data: T, message: string = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }

  static ok<T>(data: T, message: string = 'Success'): ApiResponse<T> {
    return new ApiResponse(200, data, message);
  }

  static created<T>(data: T, message: string = 'Created successfully'): ApiResponse<T> {
    return new ApiResponse(201, data, message);
  }

  static error(message: string, statusCode: number = 500) {
    return new ApiResponse(statusCode, null, message);
  }

  // ✅ One-liner clean usage
  send(res: Response): void {
    res.status(this.statusCode).json(this);
  }
}