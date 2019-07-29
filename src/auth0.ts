import _ from 'lodash';
import process from 'process';
import { Login } from './login';
import {
  User,
  Context,
  Callback,
  ContextAuthenticationMethodName
} from './lib/auth0';
import {
  ApiVersion,
  Channel,
  LoginStatus,
  AuthenticationType,
  CognitionResponse,
  CognitionRequestOverrides,
  DecisionStatus,
  CognitionInput
} from './lib/decisionAi';
import { ConsoleLogger, Logger, LogLevel } from './lib/logger';

interface ConstructorOptions {
  apiKey: string,
  version: ApiVersion,
  auth: {
    userName: string,
    password: string
  },
  getUserId?: {
    (user: User, context: Context): string
  },
  timeout?: number,
  logger?: Logger,
  logLevel?: LogLevel
}

interface DecisionOptions {
  defaultResponse?: DecisionStatus;
  overrides?: CognitionRequestOverrides;
  timeout?: number;
}

class Auth0 {
  private readonly _base: Login;
  private readonly _getUserIdOption?: (user: User, context: Context) => string;
  private readonly _logger: Logger;

  constructor(options: ConstructorOptions) {
    if (options.logger) {
      this._logger = options.logger;
    } else {
      this._logger = new ConsoleLogger(options.logLevel || LogLevel.NONE);
    }

    this._getUserIdOption = options.getUserId;

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

  private _getUserId(user: User, context: Context): string {
    if (this._getUserIdOption) {
      return this._getUserIdOption(user, context);
    } else {
      return user.user_id;
    }
  }

  private _getAuthenticationType(user: User, context: Context): AuthenticationType | null {
    const latestAuthMethod = _.last(_.sortBy(context.authentication.methods, 'timestamp'));

    if (typeof latestAuthMethod === 'undefined') {
      return null;
    } else if (latestAuthMethod.name === ContextAuthenticationMethodName.mfa) {
      return AuthenticationType.two_factor;
    } else if (latestAuthMethod.name === ContextAuthenticationMethodName.federated) {
      const identity = _.find(user.identities, {connection: context.connection});
      // check social VS sso
      if (typeof identity === 'undefined' || identity.isSocial) {
        return AuthenticationType.social_sign_on;
      } else {
        return AuthenticationType.single_sign_on;
      }
    } else if (_.get(context, 'sso.current_clients', []).length > 0) {
      return AuthenticationType.client_storage;
    } else {
      // Currently password-less still falls to password
      return AuthenticationType.password;
    }
  }

  private _getChannel(user: User, context: Context): Channel {
    return Channel.web;
  }

  private _buildBody(user: User, context: Context, options: DecisionOptions): CognitionInput {
    const request: CognitionInput = {
      _custom: {
        // Include Auth0 Specific data points
        auth0: {
          sdkVersion: '1.0',
          user: {
            updated: user.updated_at,
            fullName: user.name,
            lastName: user.family_name,
            firstName: user.given_name,
            username: user.username,
            email: user.email,
            emailVerified: user.email_verified || false,
            phoneNumber: user.phone_number,
            phoneNumberVerified: user.phone_verified || false,
            blocked: user.blocked || false
          },
          context: {
            authenticationMethods: context.authentication.methods,
            stats: context.stats,
            geoIp: context.request.geoip,
            primaryUser: context.primaryUser,
            ssoCurrentClients: context.sso.current_clients
          }
        }
      },
      eventId: _.get(context.request.query, 'cognition_event_id'),
      ipAddress: context.request.ip,
      login: {
        userId: this._getUserId(user, context),
        channel: this._getChannel(user, context),
        usedCaptcha: false,
        usedRememberMe: false,
        authenticationType: this._getAuthenticationType(user, context),
        status: LoginStatus.success,
        passwordUpdateTime: user.last_password_reset
      }
    };
    return _.merge(request, _.get(options, 'overrides', {}));
  }
}

export { Auth0 };
export { HttpError, DecisionError } from './lib/error';
