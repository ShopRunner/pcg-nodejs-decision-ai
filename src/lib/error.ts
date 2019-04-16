import { SDK_NAME } from './constant';

class DecisionError extends Error {
  public readonly isFraudulent = true;

  constructor() {
    super('Precognitive: Reject Authentication');
  }
}

class HttpError extends Error {
  public readonly statusCode: number;
  public readonly response?: any;
  public readonly body?: any;

  constructor(statusCode: number, response?: any, body?: any) {
    super(`${SDK_NAME} - HTTP Error [${statusCode}]`);

    this.statusCode = statusCode;
    this.response = response;
    this.body = body;
  }
}

export {DecisionError, HttpError};
