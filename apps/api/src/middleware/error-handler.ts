import type { Request, Response, NextFunction } from 'express';
import { ChatBridgeError } from '@chatbridge/shared';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ChatBridgeError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        retryable: err.retryable,
      },
    });
    return;
  }

  // Generic error
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
