// Auth0 Types, Interfaces and other structures
// ---------------------------------------------------

type MetaData = {
  [s: string]: string
}

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

export const enum ContextAuthenticationMethodName {
  federated = 'federated',
  pwd = 'pwd',
  sms = 'sms',
  email = 'email',
  mfa = 'mfa'
}

type ContextAuthenticationMethod = {
  name: ContextAuthenticationMethodName,
  timestamp: number
}

/**
 * @description Auth0 Context Object, passed into rules
 * @link https://auth0.com/docs/rules/references/context-object
 */
interface Context {
  tenant: string,
  clientID: string,
  clientName: string,
  clientMetadata: MetaData,
  connectionID: string,
  connection: string,
  connectionStrategy: string,
  connectionOptions: {
    tenant_domain: string,
    domain_aliases: Array<string>
  },
  connectionMetadata: MetaData,
  samlConfiguration: object,
  protocol: ContextProtocol,
  stats: object,
  sso: {
    with_auth0: boolean,
    with_dbconn: boolean,
    current_clients?: Array<string>
  },
  accessToken: {
    scope?: Array<string>
  },
  idToken: object,
  original_protocol: string,
  multifactor: object,
  sessionID: string,
  authentication: {
    methods: Array<ContextAuthenticationMethod>
  },
  primaryUser: string,
  request: {
    userAgent: string,
    ip: string,
    hostname: string,
    query: {
      cognition_event_id: string
    },
    body: object,
    geoip: {
      country_code: string,
      country_code3: string,
      country_name: string,
      city_name: string,
      latitude: string,
      longitude: string,
      time_zone: string,
      continent_code: string,
    }
  },
  authorization: { roles: Array<string> }
}

type UserIdentity = {
  connection: string,
  isSocial: boolean,
  provider: string,
  user_id: string
}

/**
 * @description Auth0 User Object, passed into rules
 * @link https://auth0.com/docs/rules/references/user-object
 */
interface User {
  app_metadata: MetaData,
  blocked: boolean,
  created_at: Date,
  email: string,
  email_verified: boolean,
  identities: Array<UserIdentity>
  multifactor: Array<string>,
  family_name: string,
  given_name: string,
  name: string,
  nickname: string,
  last_password_reset: Date,
  phone_number: string,
  phone_verified: boolean,
  picture: string,
  updated_at: Date,
  user_id: string,
  user_metadata: MetaData
  username: string,
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
