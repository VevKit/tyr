// src/core/errors.ts

export class TyrError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TyrError';
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, TyrError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details ? { details: this.details } : {})
    };
  }
}

// Common HTTP errors
export class NotFoundError extends TyrError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends TyrError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends TyrError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends TyrError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends BadRequestError {
  constructor(message: string = 'Validation Error', public validationErrors?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = validationErrors;
  }
}

// Error type guard
export function isTyrError(error: unknown): error is TyrError {
  return error instanceof TyrError;
}

// Error factory
export function createError(
  statusCode: number,
  message?: string,
  details?: unknown
): TyrError {
  switch (statusCode) {
    case 400:
      return new BadRequestError(message);
    case 401:
      return new UnauthorizedError(message);
    case 403:
      return new ForbiddenError(message);
    case 404:
      return new NotFoundError(message);
    default:
      return new TyrError(message || 'Internal Server Error', statusCode, details);
  }
}