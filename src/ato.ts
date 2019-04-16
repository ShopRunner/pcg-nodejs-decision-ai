import { Buffer } from 'buffer';
import fetch from 'node-fetch';
import { HttpError, DecisionError } from './lib/error';
import { ConsoleLogger, Logger, LogLevel } from './lib/logger';
import {
  ApiVersion,
  DecisionStatus,
  Channel,
  LoginStatus,
  AuthenticationType,
  CognitionResponse,
  CognitionRequest
} from './lib/decisionAi';
import {
  User,
  Context,
  ContextProtocol,
  Callback
} from './lib/auth0';

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
  overrides?: CognitionRequest;
  timeout?: number;
}

/**
 * @description Requires that its argument is never. This is useful when you want to prove that you have handled
 * all possible cases of an enum in a switch or if block.
 */
function assertNeverNoop (value: never): void {
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
    this._baseUrl = `${baseUrl}/${options.version}/`;

    const { userName, password } = options.auth;
    this._authorization = 'Basic ' + Buffer.from(userName + ':' + password, 'utf8').toString('base64');

    this._apiKey = options.apiKey;

    this._timeout = options.timeout || 5000;
  }

  /**
   * @description Sends login data for scoring and returns the result. `Ato.isGoodLogin` may be used to determine if the login
   * is good. If there is a network outage, auth failure, or any other ip/tcp/http level error, it WILL return a rejected promise.
   */
  public async decision(user: User, context: Context, options: DecisionOptions = {}): Promise<CognitionResponse> {
    const reqBody = this._buildBody(user, context, options);
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
  public async autoDecision(user: User, context: Context, callback: Callback, options: DecisionOptions = {}): Promise<void> {
    try {
      const response = await this.decision(user, context, options);
      let err: DecisionError | null = null;

      if (!Ato.isGoodLogin(response)) {
        err = new DecisionError(true);
        this._logger.info('Auto-Decision - reject');
      }
      process.nextTick(() => callback(err, user, context));
    } catch (err) {
      this._logger.error(err);

      // Default to auto-allow
      process.nextTick(() => callback(null, user, context));
    }
  }

  public static isGoodLogin(decisionResponse: CognitionResponse): boolean {
    const {decision} = decisionResponse;
    return decision === DecisionStatus.allow || decision === DecisionStatus.review;
  }

  private _getAuthenticationType(protocol: ContextProtocol): AuthenticationType | undefined {
    switch (protocol) {
      case ContextProtocol.OidcBasicProfile:
      case ContextProtocol.OidcImplicitProfile:
      case ContextProtocol.OAuth2ResourceOwner:
      case ContextProtocol.OAuth2Password:
        return AuthenticationType.password;
      case ContextProtocol.SAMLP:
      case ContextProtocol.WSFed:
      case ContextProtocol.WSTrustUsernameMixed:
        return AuthenticationType.single_sign_on;
      case ContextProtocol.OAuth2RefreshToken:
      case ContextProtocol.OAuth2ResourceOwnerJwtBearer:
        return AuthenticationType.key;
      case ContextProtocol.Delegation:
      case ContextProtocol.RedirectCallback:
        return undefined;
      default:
        assertNeverNoop(protocol);
        this._logger.warn('Unable to determine AuthenticationType');
        return undefined;
        // @todo support `other`
        // return AuthenticationType.other;
    }
  }

  private _buildBody(user: User, context: Context, options: DecisionOptions): CognitionRequest {
    const {overrides: {login = {}, ...overrides} = {}} = options;
    return {
      apiKey: this._apiKey,
      eventId: context.sessionID,
      dateTime: new Date(),
      ipAddress: context.request.ip,
      ...overrides,
      login: {
        userId: user.user_id,
        channel: Channel.web, // @todo in future allow for mapping
        usedCaptcha: false,
        authenticationType: this._getAuthenticationType(context.protocol),
        status: LoginStatus.success,
        passwordUpdateTime: user.last_password_reset,
        ...login
      }
    };
  }
}

export { Ato };
export { HttpError, DecisionError } from './lib/error';
