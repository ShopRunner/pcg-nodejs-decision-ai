import { Login } from './login';
import {
  User,
  Context,
  ContextProtocol,
  Callback
} from './lib/auth0';
import {
  ApiVersion,
  Channel,
  LoginStatus,
  AuthenticationType,
  CognitionResponse,
  CognitionInput,
  CognitionRequestOverrides
} from './lib/decisionAi';
import { ConsoleLogger, Logger, LogLevel } from './lib/logger';

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

interface DecisionOptions {
  overrides?: CognitionRequestOverrides;
  timeout?: number;
}

/* istanbul ignore next */
/**
 * @description Requires that its argument is never. This is useful when you want to prove that you have handled
 * all possible cases of an enum in a switch or if block.
 */
function assertNeverNoop (value: never): void {
}

class Auth0 {
  private readonly _base: Login;
  private readonly _logger: Logger;

  constructor(options: ConstructorOptions) {
    if (options.logger) {
      this._logger = options.logger;
    } else {
      this._logger = new ConsoleLogger(options.logLevel || LogLevel.NONE);
    }

    this._base = new Login({
      ...options,
      logger: this._logger
    });
  }

  /**
   * @description Sends login data for scoring and returns the result. `Auth0.isGoodLogin` may be used to determine if the login
   * is good. If there is a network outage, auth failure, or any other ip/tcp/http level error, it WILL return a rejected promise.
   */
  public async decision(user: User, context: Context, options: DecisionOptions = {}): Promise<CognitionResponse> {
    const reqBody = this._buildBody(user, context, options);
    return this._base.decision(reqBody, options);
  }

  /**
   * @description Sends login data for scoring. If the login is good, continues, otherwise it calls the callback with the error.
   * If there is a network outage, auth failure, or any other ip/tcp/http level error, it will log it and move on. It will NOT
   * prevent the login in this case.
   */
  public autoDecision(user: User, context: Context, callback: Callback, options: DecisionOptions = {}): void {
    try {
      const reqBody = this._buildBody(user, context, options);
      this._base.autoDecision(reqBody, options).then(() => {
        process.nextTick(() => callback(null, user, context));
      }, err => {
        process.nextTick(() => callback(err, user, context));
      });
    } catch (err) {
      this._logger.error(err);
      process.nextTick(() => callback(null, user, context));
    }
  }

  public static isGoodLogin(decisionResponse: CognitionResponse): boolean {
    return Login.isGoodLogin(decisionResponse);
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

  private _buildBody(user: User, context: Context, options: DecisionOptions): CognitionInput {
    const {overrides: {login = {}, ...overrides} = {}} = options;
    return {
      eventId: context.sessionID,
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

export { Auth0 };
export { HttpError, DecisionError } from './lib/error';
