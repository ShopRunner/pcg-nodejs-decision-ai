// Auth0 Types, Interfaces and other structures
// ---------------------------------------------------


/**
 * @description Auth0 authentication protocol potential values
 * @link https://auth0.com/docs/rules/references/context-object
 */
const enum ContextProtocol {
  OidcBasicProfile = 'oidc-basic-profile',
  OidcImplicitProfile = 'oidc-implicit-profile',
  OAuth2ResourceOwner = 'oauth2-resource-owner',
  OAuth2ResourceOwnerJwtBearer = 'oauth2-resource-owner-jwt-bearer',
  OAuth2Password = 'oauth2-password',
  OAuth2RefreshToken = 'oauth2-refresh-token',
  SAMLP = 'samlp',
  WSFed = 'wsfed',
  WSTrustUsernameMixed = 'wstrust-usernamemixed',
  Delegation = 'delegation',
  RedirectCallback = 'redirect-callback',
}

/**
 * @description Auth0 Context Object, passed into rules
 * @link https://auth0.com/docs/rules/references/context-object
 */
interface Context {
  clientID: string,
  protocol: ContextProtocol,
  sessionID: string,
  request: {
    hostname: string,
    ip: string,
    query: string,
    userAgent: string,
    geoip: {
      city_name: string,
      continent_code: string,
      country_code3: string,
      country_code: string,
      country_name: string,
      latitude: string,
      longitude: string,
      time_zone: string,
    }
  }
}

/**
 * @description Auth0 User Object, passed into rules
 * @link https://auth0.com/docs/rules/references/user-object
 */
interface User {
  app_metadata: object,
  created_at: Date,
  email: string,
  last_ip: string,
  last_login: Date,
  logins_count: number,
  last_password_reset: Date,
  name: string,
  password_set_date: Date,
  updated_at: Date,
  username: string,
  user_id: string,
  user_metadata: object
}

/**
 * @description Auth0 Callback passed into rules
 * @link: https://auth0.com/docs/rules#syntax
 */
interface Callback {
  (err: null | Error, user: User, context: Context): void
}

/**
 * @description Auth0 Rule Interface
 * @link https://auth0.com/docs/rules
 */
interface Rule {
  (user: User, context: Context, callback: Callback): void
}

export { Context, ContextProtocol, User, Callback, Rule };
