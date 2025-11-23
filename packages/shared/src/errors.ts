export class ChatBridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ChatBridgeError';
  }
}

export class SlackAPIError extends ChatBridgeError {
  constructor(message: string, public slackError: string, retryable = false) {
    super(message, 'SLACK_API_ERROR', 502, retryable);
    this.name = 'SlackAPIError';
  }
}

export class EmailDeliveryError extends ChatBridgeError {
  constructor(message: string, retryable = true) {
    super(message, 'EMAIL_DELIVERY_ERROR', 502, retryable);
    this.name = 'EmailDeliveryError';
  }
}

export class ValidationError extends ChatBridgeError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400, false);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ChatBridgeError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404, false);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ChatBridgeError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', 429, true);
    this.name = 'RateLimitError';
  }
}

export class IdempotencyError extends ChatBridgeError {
  constructor(message: string) {
    super(message, 'IDEMPOTENCY_ERROR', 409, false);
    this.name = 'IdempotencyError';
  }
}
