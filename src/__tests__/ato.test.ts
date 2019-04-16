import fetchMockModule from 'fetch-mock';
import _ from 'lodash';
import fetchMock from '../__mocks__/node-fetch';
import { Ato, DecisionError, HttpError } from '../';
import { ApiVersion, CognitionResponse, DecisionStatus, AuthenticationType, Channel, LoginStatus, CognitionInput } from '../lib/decisionAi';

const date = new Date();

// from https://stackoverflow.com/questions/3143070/javascript-regex-iso-datetime
const isoDateRegexp = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;

function getBaseResponse (decision: DecisionStatus, score = _.random(-200, 200), confidence = _.random(0, 100)): CognitionResponse {
  return {
    decision,
    score,
    confidence,
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

function getOptions (): CognitionInput {
  return {
    eventId: '123456789',
    ipAddress: '127.0.0.1',
    login: {
      authenticationType: AuthenticationType.password,
      channel: Channel.web,
      passwordUpdateTime: date,
      status: LoginStatus.success,
      usedCaptcha: false,
      userId: '34294892831981',
    },
  };
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
    const auth0 = new Ato(config);
    const response = getBaseResponse(DecisionStatus.allow);
    fetchMock.postOnce(url, response);
    const actual = await auth0.decision(defaultOptions);
    expect(actual).toEqual(response);

    assertOneCall(fetchMock.calls(), getDecisionRecord());
    expect(fetchMock.done()).toEqual(true);
  });

  it('throws error on http failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Ato(config);
    fetchMock.postOnce(url, {status: 500, body: JSON.stringify({code: 'failed', message: 'Failed'})});
    await expect(auth0.decision(defaultOptions)).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock.done()).toEqual(true);
  });

  it('throws error on request failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Ato(config);
    const err = new Error('Mock');
    fetchMock.postOnce(url, {throws: err});
    await expect(auth0.decision(defaultOptions)).rejects.toBe(err);
    expect(fetchMock.done()).toEqual(true);
  });
});

describe('autodecision', () => {
  it('disallows if the response is `reject`', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Ato(config);
    const response = getBaseResponse(DecisionStatus.reject);
    fetchMock.postOnce(url, response);
    await expect(auth0.autoDecision(defaultOptions)).rejects.toBeInstanceOf(DecisionError);

    assertOneCall(fetchMock.calls(), getDecisionRecord());
    expect(fetchMock.done()).toEqual(true);
  });

  it('allows if the response is `review`', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Ato(config);
    const response = getBaseResponse(DecisionStatus.review);
    fetchMock.postOnce(url, response);
    await auth0.autoDecision(defaultOptions);

    assertOneCall(fetchMock.calls(), getDecisionRecord());
    expect(fetchMock.done()).toEqual(true);
  });

  it('allows if the response is `allow`', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Ato(config);
    const response = getBaseResponse(DecisionStatus.allow);
    fetchMock.postOnce(url, response);
    auth0.autoDecision(defaultOptions);

    assertOneCall(fetchMock.calls(), getDecisionRecord());
    expect(fetchMock.done()).toEqual(true);
  });

  it('allows on http failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Ato(config);
    fetchMock.postOnce(url, {status: 500, body: JSON.stringify({code: 'failed', message: 'Failed'})});
    await auth0.autoDecision(defaultOptions);
    expect(fetchMock.done()).toEqual(true);
  });

  it('allows on request failure', async () => {
    const defaultOptions = getOptions();
    const auth0 = new Ato(config);
    const err = new Error('Mock');
    fetchMock.postOnce(url, {throws: err});
    await auth0.autoDecision(defaultOptions);
    expect(fetchMock.done()).toEqual(true);
  });
});

describe('isGoodLogin', () => {
  it('accepts allowed login', () => {
    expect(Ato.isGoodLogin(getBaseResponse(DecisionStatus.allow))).toEqual(true);
  });

  it('accepts reviewed login', () => {
    expect(Ato.isGoodLogin(getBaseResponse(DecisionStatus.review))).toEqual(true);
  });

  it('rejects rejected login', () => {
    expect(Ato.isGoodLogin(getBaseResponse(DecisionStatus.reject))).toEqual(false);
  });
});

it('uses custom logger', async () => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  const defaultOptions = getOptions();
  defaultOptions.dateTime = new Date('2019-01-01');
  defaultOptions.login.passwordUpdateTime = defaultOptions.dateTime;
  const auth0 = new Ato({...config, logger});
  const response = getBaseResponse(DecisionStatus.allow, 50, 40);
  fetchMock.postOnce(url, response);
  await auth0.decision(defaultOptions);
  expect(_.mapValues(logger, (mock) => mock.mock.calls)).toMatchSnapshot();
  expect(fetchMock.done()).toEqual(true);
});
