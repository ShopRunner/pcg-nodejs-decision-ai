import { SDK_NAME } from './constant';

class DecisionError extends Error {
  public readonly isFraudulent: boolean;

  constructor(isFraudulent = true) {
    super('Precognitive: Reject Authentication');
    this.isFraudulent = isFraudulent;
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
