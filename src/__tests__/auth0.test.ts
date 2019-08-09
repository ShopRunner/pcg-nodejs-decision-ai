import fetchMockModule from 'fetch-mock';
import _ from 'lodash';
import fetchMock from '../__mocks__/node-fetch';
import { Auth0, DecisionError, HttpError } from '../';
import {
  ApiVersion,
  AuthenticationType,
  Channel,
  CognitionRequest,
  CognitionResponse,
  DecisionStatus,
  LoginStatus
} from '../lib/decisionAi';
import { Context, User } from '../lib/auth0';
import { RequestInit } from 'node-fetch';
import { getPasswordLogin } from './stubs/auth0';

// from https://stackoverflow.com/questions/3143070/javascript-regex-iso-datetime
const isoDateRegexp = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;

function getBaseResponse (decision: DecisionStatus, score = _.random(-200, 200), confidence = _.random(0, 100)): CognitionResponse {
  return {
    decision,
    score,
    confidence,
    tokenId: '4610b4ba-a1e0-4f8c-8cc3-f5d9bd2214cc',
    signals: [
      'test',
      'test2'
    ]
  };
}

const config = {
  auth: {
    userName: 'test',
    password: 'test-pw'
  },
  apiKey: 'kasf8w-afsafs-1asffw',
  version: ApiVersion.v1
};
const basicAuth = 'Basic dGVzdDp0ZXN0LXB3';

const updated = new Date('2019-05-05');

interface Login {
  user: User;
  context: Context;
}

function getOptions (): Login {
  const passwordLogin = getPasswordLogin();
  return {
    ...passwordLogin,
    user: {
      ...passwordLogin.user,
      updated_at: updated
    }
  };
}

function getDecisionRecord ({ context, user }: Login, status: LoginStatus = LoginStatus.success): CognitionRequest {
  return {
    apiKey: config.apiKey,
    dateTime: expect.stringMatching(isoDateRegexp),
    eventId: context.request.query.cognition_event_id,
    ipAddress: '127.0.0.1',
    login: {
      authenticationType: AuthenticationType.password,
      channel: Channel.web,
      status: status,
      usedCaptcha: false,
      usedRememberMe: false,
      userId: user.user_id,
    },
    _custom: {
      auth0: {
        context: {
          authenticationMethods: context.authentication.methods,
          geoIp: {
            city_name: 'Conshohocken',
            continent_code: 'NA',
            country_code: 'US',
            country_code3: 'USA',
            country_name: 'United States',
            latitude: 40.0825,
            longitude: -75.3044,
            time_zone: 'America/New_York',
          },
          ssoCurrentClients: context.sso.current_clients,
          stats: {
            loginsCount: 8,
          }
        },
        sdkVersion: '1.0',
        user: {
          blocked: false,
          email: 'jsmith2.precognitive@gmail.com',
          emailVerified: false,
          fullName: 'jsmith2.precognitive@gmail.com',
          phoneNumberVerified: false,
          updated: updated.toISOString(),
        }
      }
    }
  };
}

function assertOneCall (calls: fetchMockModule.MockCall[], body: any) {
  expect(calls.length).toEqual(1);

  // the fetch mock api is a bit unorthodox
  // it adds a 'request' property to the array that we don't care about
  // this strips the property and turns it into a real array.
  const request = [...calls[0]] as typeof calls[0];

  expect(request).toEqual([url, {
    body: expect.any(String),
    headers: {
      Authorization: basicAuth
    },
    method: 'POST',
    timeout: 5000
  }]);
  expect(JSON.parse((request[1] as RequestInit).body as any)).toEqual(body);
}

const url = 'https://api.precognitive.io/v1/decision/login';

afterEach(fetchMock.restore);

describe('decision', () => {
  it('returns decision-ai response', async () => {
    const login = getOptions();
    const auth0 = new Auth0(config);
    const response = getBaseResponse(DecisionStatus.allow);
    fetchMock.postOnce(url, response);
    const actual = await auth0.decision(login.user, login.context);
    expect(actual).toEqual(response);
    assertOneCall(fetchMock.calls(), getDecisionRecord(login));
    expect(fetchMock.done()).toEqual(true);
  });

  it('throws error on http failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    fetchMock.postOnce(url, { status: 500, body: JSON.stringify({ code: 'failed', message: 'Failed' }) });
    await expect(auth0.decision(defaultOptions.user, defaultOptions.context)).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock.done()).toEqual(true);
  });

  it('throws error on request failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    const err = new Error('Mock');
    fetchMock.postOnce(url, { throws: err });
    await expect(auth0.decision(defaultOptions.user, defaultOptions.context)).rejects.toBe(err);
    expect(fetchMock.done()).toEqual(true);
  });
});

describe('authFailure', () => {
  it('always rejects', async () => {
    const login = getOptions();
    const auth0 = new Auth0(config);
    const response = getBaseResponse(DecisionStatus.reject);
    fetchMock.postOnce(url, response);
    const actual = await auth0.authFailure(login.user, login.context);
    expect(actual).toEqual(response);
    expect(fetchMock.done()).toEqual(true);
  });

  it('handles defaults', async () => {
    const login = getOptions();
    const auth0 = new Auth0(config);
    fetchMock.postOnce(url, {});
    const actual = await auth0.authFailure(login.user, login.context);
    expect(actual).toEqual({
      decision: DecisionStatus.reject,
      confidence: 0,
      score: 0,
      signals: ['failed_to_decision'],
      tokenId: 'unknown'
    });
    expect(fetchMock.done()).toEqual(true);
  });

  it(`always passes the ${LoginStatus.failure} status`, async () => {
    const login = getOptions();
    const auth0 = new Auth0(config);
    const response = getBaseResponse(DecisionStatus.reject);
    fetchMock.postOnce(url, response);
    const actual = await auth0.authFailure(login.user, login.context);
    expect(actual).toEqual(response);
    assertOneCall(fetchMock.calls(), getDecisionRecord(login, LoginStatus.failure));
    expect(fetchMock.done()).toEqual(true);
  });
});

describe('autoDecision', () => {
  it('disallows if the response is `reject`', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    const response = getBaseResponse(DecisionStatus.reject);
    fetchMock.postOnce(url, response);
    await expect(new Promise((resolve, reject) => {
      auth0.autoDecision(defaultOptions.user, defaultOptions.context, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    })).rejects.toBeInstanceOf(DecisionError);
    assertOneCall(fetchMock.calls(), getDecisionRecord(defaultOptions));
    expect(fetchMock.done()).toEqual(true);
  });

  it('allows if the response is `review`', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    const response = getBaseResponse(DecisionStatus.review);
    fetchMock.postOnce(url, response);
    await new Promise((resolve, reject) => {
      auth0.autoDecision(defaultOptions.user, defaultOptions.context, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    assertOneCall(fetchMock.calls(), getDecisionRecord(defaultOptions));
    expect(fetchMock.done()).toEqual(true);
  });

  it('allows if the response is `allow`', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    const response = getBaseResponse(DecisionStatus.allow);
    fetchMock.postOnce(url, response);
    await new Promise((resolve, reject) => {
      auth0.autoDecision(defaultOptions.user, defaultOptions.context, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    assertOneCall(fetchMock.calls(), getDecisionRecord(defaultOptions));
    expect(fetchMock.done()).toEqual(true);
  });

  it('allows on http failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    fetchMock.postOnce(url, { status: 500, body: JSON.stringify({ code: 'failed', message: 'Failed' }) });
    await new Promise((resolve, reject) => {
      auth0.autoDecision(defaultOptions.user, defaultOptions.context, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    expect(fetchMock.done()).toEqual(true);
  });

  it('allows on request failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    const err = new Error('Mock');
    fetchMock.postOnce(url, { throws: err });
    await new Promise((resolve, reject) => {
      auth0.autoDecision(defaultOptions.user, defaultOptions.context, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    expect(fetchMock.done()).toEqual(true);
  });

  it('allows default override on request failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    const err = new Error('Mock');
    fetchMock.postOnce(url, { throws: err });
    await expect(new Promise((resolve, reject) => {
      auth0.autoDecision(defaultOptions.user, defaultOptions.context, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }, { defaultResponse: DecisionStatus.reject });
    })).rejects.toBeInstanceOf(DecisionError);
    expect(fetchMock.done()).toEqual(true);
  });

  it('allows on unexpected failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    await new Promise((resolve, reject) => {
      auth0.autoDecision(defaultOptions.user, defaultOptions.context, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }, {
        overrides: {
          get login (): any {
            throw new Error('foo');
          }
        }
      });
    });
    // only assertion is code coverage
    expect(fetchMock.done()).toEqual(true);
  });
});

describe('context protocol => authentication type', () => {
  const timestamp = Date.now();

  async function testAuthType (authType: AuthenticationType | undefined, transformInput: (login: Login) => Login) {
    const data = transformInput(getOptions());
    const auth0 = new Auth0(config);
    const response = getBaseResponse(DecisionStatus.allow);
    fetchMock.postOnce(url, response);
    const actual = await auth0.decision(data.user, data.context);
    expect(actual).toEqual(response);

    const expectedBody = getDecisionRecord(data);
    if (authType) {
      expectedBody.login.authenticationType = authType;
    } else {
      delete expectedBody.login.authenticationType; // gets removed by JSON stringify
    }
    assertOneCall(fetchMock.calls(), expectedBody);
    expect(fetchMock.done()).toEqual(true);
  }

  it('transforms undefined', async () => {
    await testAuthType(undefined, (l) => {
      l.context.authentication.methods = [];
      return l;
    });
  });

  it('transforms two factor', async () => {
    await testAuthType(AuthenticationType.two_factor, (l) => {
      l.context.authentication.methods = [{ timestamp, name: 'mfa' }];
      return l;
    });
  });

  it('transforms social sign on from undefined', async () => {
    await testAuthType(AuthenticationType.social_sign_on, (l) => {
      l.context.authentication.methods = [{ timestamp, name: 'federated' }];
      l.user.identities = [];
      return l;
    });
  });

  it('transforms social sign on from identity', async () => {
    await testAuthType(AuthenticationType.social_sign_on, (l) => {
      l.context.authentication.methods = [{ timestamp, name: 'federated' }];
      l.user.identities = [{
        provider: 'google-oauth2',
        user_id: '108493928311127651660',
        connection: l.context.connection,
        isSocial: true
      }];
      return l;
    });
  });

  it('transforms single sign on', async () => {
    await testAuthType(AuthenticationType.single_sign_on, (l) => {
      l.context.authentication.methods = [{ timestamp, name: 'federated' }];
      l.user.identities = [{
        provider: 'google-oauth2',
        user_id: '108493928311127651660',
        connection: l.context.connection,
        isSocial: false
      }];
      return l;
    });
  });

  it('transforms client storage', async () => {
    await testAuthType(AuthenticationType.client_storage, (l) => {
      l.context.sso.current_clients = ['foo'];
      return l;
    });
  });

  it('transforms password', async () => {
    await testAuthType(AuthenticationType.password, (l) => {
      return l;
    });
  });
});

describe('isGoodLogin', () => {
  it('accepts allowed login', () => {
    expect(Auth0.isGoodLogin(getBaseResponse(DecisionStatus.allow))).toEqual(true);
  });

  it('accepts reviewed login', () => {
    expect(Auth0.isGoodLogin(getBaseResponse(DecisionStatus.review))).toEqual(true);
  });

  it('rejects rejected login', () => {
    expect(Auth0.isGoodLogin(getBaseResponse(DecisionStatus.reject))).toEqual(false);
  });
});

it('allows field override', async () => {
  const defaultOptions = getOptions();
  const auth0 = new Auth0(config);
  const response = getBaseResponse(DecisionStatus.allow);
  fetchMock.postOnce(url, response);
  const actual = await auth0.decision(defaultOptions.user, defaultOptions.context, {
    overrides: {
      login: {
        channel: Channel.app
      }
    }
  });
  expect(actual).toEqual(response);

  const expectedBody = getDecisionRecord(defaultOptions);
  expectedBody.login.channel = Channel.app;
  assertOneCall(fetchMock.calls(), expectedBody);
  expect(fetchMock.done()).toEqual(true);
});

it('removes PII data in Privacy Mode', async () => {
  const defaultOptions = getOptions();
  const auth0 = new Auth0(config);
  const response = getBaseResponse(DecisionStatus.allow);
  fetchMock.postOnce(url, response);
  const actual = await auth0.decision(defaultOptions.user, defaultOptions.context, { privacyMode: true });
  expect(actual).toEqual(response);

  const expectedBody = getDecisionRecord(defaultOptions);
  expectedBody._custom.auth0.user = _.omit(expectedBody._custom.auth0.user, [
    'fullName',
    'lastName',
    'firstName',
    'email',
    'phoneNumber'
  ]);
  assertOneCall(fetchMock.calls(), expectedBody);
  expect(fetchMock.done()).toEqual(true);
});

it('uses custom logger', async () => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  const defaultOptions = getOptions();
  const auth0 = new Auth0({ ...config, logger });
  const response = getBaseResponse(DecisionStatus.allow, 50, 40);
  fetchMock.postOnce(url, response);
  await auth0.decision(defaultOptions.user, defaultOptions.context, {
    overrides: {
      dateTime: new Date('2019-01-01'),
      _custom: {
        auth0: {
          user: {
            updated: updated.toISOString()
          }
        }
      },
      login: {
        passwordUpdateTime: new Date('2019-01-01')
      }
    }
  });
  expect(_.mapValues(logger, (mock) => mock.mock.calls)).toMatchSnapshot();
  expect(fetchMock.done()).toEqual(true);
});
