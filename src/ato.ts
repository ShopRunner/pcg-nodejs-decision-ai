import { Buffer } from 'buffer';
import fetch from 'node-fetch';
import { HttpError, DecisionError } from './lib/error';
import { ConsoleLogger, Logger, LogLevel } from './lib/logger';
import {
  ApiVersion,
  DecisionStatus,
  CognitionResponse,
  CognitionRequest,
  CognitionInput
} from './lib/decisionAi';

interface ConstructorOptions {
  apiKey: string;
  version: ApiVersion;
  auth: {
    userName: string;
    password: string;
  }
  logger?: Logger;
  logLevel?: LogLevel;
  timeout?: number;
}

interface PrivateConstructorOptions extends ConstructorOptions {
  apiUrl?: string;
}

interface DecisionOptions {
  timeout?: number;
}

class Ato {
  private readonly _apiKey: string;
  private readonly _authorization: string;
  private readonly _logger: Logger;
  private readonly _baseUrl: string;
  private readonly _timeout: number;

  constructor(options: ConstructorOptions) {
    if (options.logger) {
      this._logger = options.logger;
    } else {
      this._logger = new ConsoleLogger(options.logLevel || LogLevel.NONE);
    }

    const privateOptions: PrivateConstructorOptions = options;

    const baseUrl = privateOptions.apiUrl || 'https://api.precognitive.io';
    this._baseUrl = `${baseUrl}/${options.version}`;

    const { userName, password } = options.auth;
    this._authorization = 'Basic ' + Buffer.from(userName + ':' + password, 'utf8').toString('base64');

    this._apiKey = options.apiKey;

    this._timeout = options.timeout || 5000;
  }

  /**
   * @description Sends login data for scoring and returns the result. `Ato.isGoodLogin` may be used to determine if the login
   * is good. If there is a network outage, auth failure, or any other ip/tcp/http level error, it WILL return a rejected promise.
   */
  public async decision(input: CognitionInput, options: DecisionOptions = {}): Promise<CognitionResponse> {
    const reqBody = this._buildBody(input);
    this._logger.debug(`REQUEST BODY - ${JSON.stringify(reqBody)}`);

    const url = this._baseUrl + '/decision/login';
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(reqBody),
      headers: {
        Authorization: this._authorization
      },
      timeout: options.timeout || this._timeout
    });
    const resBody = await response.json();
    this._logger.debug(`RESPONSE BODY - ${JSON.stringify(resBody)}`);
    if (!response.ok) {
      const err = new HttpError(response.status, response, resBody);
      this._logger.error(err, resBody);
      throw err;
    }

    return resBody;
  }

  /**
   * @description Sends login data for scoring. If the login is good, continues, otherwise it calls the callback with the error.
   * If there is a network outage, auth failure, or any other ip/tcp/http level error, it will log it and move on. It will NOT
   * prevent the login in this case.
   */
  public async autoDecision(input: CognitionInput, options: DecisionOptions = {}): Promise<void> {
    let rejectErr: DecisionError | null = null;
    try {
      const response = await this.decision(input, options);

      if (!Ato.isGoodLogin(response)) {
        rejectErr = new DecisionError(true);
        this._logger.info('Auto-Decision - reject');
      }
    } catch (err) {
      this._logger.error(err);
    }

    if (rejectErr) {
      throw rejectErr;
    }
  }

  public static isGoodLogin(decisionResponse: CognitionResponse): boolean {
    const {decision} = decisionResponse;
    return decision === DecisionStatus.allow || decision === DecisionStatus.review;
  }

  private _buildBody(req: CognitionInput): CognitionRequest {
    return {
      dateTime: new Date(),
      ...req,
      apiKey: this._apiKey
    };
  }
}

export { Ato };
export { HttpError, DecisionError } from './lib/error';
