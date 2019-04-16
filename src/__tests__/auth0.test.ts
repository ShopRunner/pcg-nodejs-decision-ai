import _ from 'lodash';
import fetchMock from '../__mocks__/node-fetch';
import { Auth0, DecisionError, HttpError } from '../auth0';
import { ApiVersion, CognitionResponse, DecisionStatus, AuthenticationType, Channel } from '../lib/decisionAi';
import { ContextProtocol, User, Context } from '../lib/auth0';
import fetchMockModule = require('fetch-mock');

const date = new Date();

// from https://stackoverflow.com/questions/3143070/javascript-regex-iso-datetime
const isoDateRegexp = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;

function getBaseResponse (decision: DecisionStatus): CognitionResponse {
  return {
    decision,
    score: _.random(-200, 200),
    confidence: _.random(0, 100),
    signals: [
      'test',
      'test2'
    ]
  }
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

function getOptions (): {user: User, context: Context} {
  return {
    user: {
      name: 'test',
      app_metadata: {},
      email: "test@example.com",
      last_ip: "127.0.0.1",
      last_login: date,
      logins_count: 3,
      last_password_reset: date,
      password_set_date: date,
      created_at: date,
      updated_at: date,
      username: "test-example",
      user_id: "34294892831981",
      user_metadata: {}
    },
    context: {
      clientID: '123456789',
      sessionID: '123456789',
      protocol: ContextProtocol.OidcBasicProfile,
      request: {
        userAgent: 'test',
        ip: '127.0.0.1',
        hostname: 'example.com',
        query: '',
        geoip: {
          country_code: 'us',
          country_code3: '',
          country_name: 'murica',
          city_name: 'springville',
          latitude: '0.00',
          longitude: '0.00',
          time_zone: '-400',
          continent_code: 'na',
        }
      }
    }
  }
}

function getDecisionRecord () {
  return {
    apiKey: config.apiKey,
    dateTime: expect.stringMatching(isoDateRegexp),
    eventId: '123456789',
    ipAddress: '127.0.0.1',
    login: {
      authenticationType: 'password',
      channel: 'web',
      passwordUpdateTime: date.toISOString(),
      status: 'success',
      usedCaptcha: false,
      userId: '34294892831981',
    },
  };
}

function assertOneCall(calls: fetchMockModule.MockCall[], body: any) {
  expect(calls.length).toEqual(1);

  // the fetch mock api is asinine
  // it adds a 'request' property to the array that we don't care about
  // this strips the property and turns it into a real array.
  const request = [...calls[0]];

  expect(request).toEqual([url, {
    body: expect.any(String),
    headers: {
      Authorization: basicAuth
    },
    method: 'POST',
    timeout: 5000
  }]);
  expect(JSON.parse(request[1].body)).toEqual(body);
}

const url = 'https://api.precognitive.io/v1/decision/login';

afterEach(fetchMock.restore);

describe('decision', () => {
  it('returns decision-ai response', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    const response = getBaseResponse(DecisionStatus.allow);
    fetchMock.postOnce(url, response);
    const actual = await auth0.decision(defaultOptions.user, defaultOptions.context);
    expect(actual).toEqual(response);
    assertOneCall(fetchMock.calls(), getDecisionRecord());
    expect(fetchMock.done()).toEqual(true);
  });

  it('throws error on http failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    fetchMock.postOnce(url, {status: 500, body: JSON.stringify({code: 'failed', message: 'Failed'})});
    await expect(auth0.decision(defaultOptions.user, defaultOptions.context)).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock.done()).toEqual(true);
  });

  it('throws error on request failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    const err = new Error('Mock');
    fetchMock.postOnce(url, {throws: err});
    await expect(auth0.decision(defaultOptions.user, defaultOptions.context)).rejects.toBe(err);
    expect(fetchMock.done()).toEqual(true);
  });
});

describe('autodecision', () => {
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
    assertOneCall(fetchMock.calls(), getDecisionRecord());
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
    assertOneCall(fetchMock.calls(), getDecisionRecord());
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
    assertOneCall(fetchMock.calls(), getDecisionRecord());
    expect(fetchMock.done()).toEqual(true);
  });

  it('allows on http failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Auth0(config);
    fetchMock.postOnce(url, {status: 500, body: JSON.stringify({code: 'failed', message: 'Failed'})});
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
    fetchMock.postOnce(url, {throws: err});
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
  })
});

describe('context protocol => authentication type', () => {
  _.forEach([
    [ContextProtocol.OidcBasicProfile, AuthenticationType.password],
    [ContextProtocol.OidcImplicitProfile, AuthenticationType.password],
    [ContextProtocol.OAuth2ResourceOwner, AuthenticationType.password],
    [ContextProtocol.OAuth2Password, AuthenticationType.password],
    [ContextProtocol.SAMLP, AuthenticationType.single_sign_on],
    [ContextProtocol.WSFed, AuthenticationType.single_sign_on],
    [ContextProtocol.WSTrustUsernameMixed, AuthenticationType.single_sign_on],
    [ContextProtocol.OAuth2RefreshToken, AuthenticationType.key],
    [ContextProtocol.OAuth2ResourceOwnerJwtBearer, AuthenticationType.key],
    [ContextProtocol.Delegation, undefined],
    [ContextProtocol.RedirectCallback, undefined],
    ['invalid', undefined],
  ] as [ContextProtocol, AuthenticationType][], ([contextProtocol, authType]) => {
    it(`converts '${contextProtocol}' into '${authType}'`, async () => {
      const defaultOptions = getOptions();
      defaultOptions.context.protocol = contextProtocol;
      const auth0 = new Auth0(config);
      const response = getBaseResponse(DecisionStatus.allow);
      fetchMock.postOnce(url, response);
      const actual = await auth0.decision(defaultOptions.user, defaultOptions.context);
      expect(actual).toEqual(response);

      const expectedBody = getDecisionRecord();
      expectedBody.login.authenticationType = authType;
      assertOneCall(fetchMock.calls(), expectedBody);;
      expect(fetchMock.done()).toEqual(true);
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

  const expectedBody = getDecisionRecord();
  expectedBody.login.channel = Channel.app;
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
  const auth0 = new Auth0({...config, logger});
  const response = getBaseResponse(DecisionStatus.allow);
  fetchMock.postOnce(url, response);
  await auth0.decision(defaultOptions.user, defaultOptions.context);
  expect(_.mapValues(logger, (mock) => mock.mock.calls)).toMatchSnapshot();
  expect(fetchMock.done()).toEqual(true);
});
