// Cognition SDK
// ---------------------------------------------------

const enum ApiVersion {
    v1 = 'v1'
}

const enum DecisionStatus {
    allow = 'allow',
    review = 'review',
    reject = 'reject'
}

const enum Channel {
    web = 'web',
    desktop = 'desktop',
    app = 'app',
}

const enum LoginStatus {
    success = 'success',
    failure = 'failure'
}

const enum AuthenticationType {
    client_storage = 'client_storage',
    password = 'password',
    two_factor = 'two_factor',
    single_sign_on = 'single_sign_on',
    key = 'key',

    other = 'other' // @todo add to API
}

interface CognitionResponse {
    score: number,
    confidence: number,
    decision: DecisionStatus,
    signals: Array<string>
}

interface CognitionRequest {
    apiKey: string,
    eventId: string,
    dateTime: Date,
    ipAddress: string,
    _custom?: object,
    clientPayload?: object,
    login: {
        userId: string,
        channel: Channel,
        usedCaptcha: boolean,
        authenticationType?: AuthenticationType | null,
        status: LoginStatus,
        passwordUpdateTime: Date,
        userNameUpdateTime?: Date
    }
}

export {
  ApiVersion,
  DecisionStatus,
  Channel,
  LoginStatus,
  AuthenticationType,
  CognitionResponse,
  CognitionRequest
};
