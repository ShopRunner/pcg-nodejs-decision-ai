# Decision-AI Node.js SDK

[![CircleCI](https://circleci.com/gh/Precognitive/nodejs-decision-ai/tree/master.svg?style=svg)](https://circleci.com/gh/Precognitive/nodejs-decision-ai/tree/master)
[![codecov](https://codecov.io/gh/Precognitive/nodejs-decision-ai/branch/master/graph/badge.svg)](https://codecov.io/gh/Precognitive/nodejs-decision-ai)

Node SDK for integrating the Precognitive Decision-AI APIs with Node based applications and tools.

## Login

You can use the SDK to make calls to our Login API. This API is used to prevent Account Takeover fraud.
To learn more about the API call use the link below.

[Docs Link](https://developers.precognitive.io/#operation//decision/login)

**Example:**
```typescript
import DecisionAi from '@precognitive/decision-ai';

const login = new DecisionAi.Login({
  appId: process.env.PRECOGNITIVE_APP_ID,
  auth: {
    userName: process.env.PRECOGNITIVE_USERNAME,
    password: process.env.PRECOGNITIVE_PASSWORD
  }
});

async function auth(req): Promise<void> {
  const { body } = req;
  const user = await User.getUserByUserName(body.userName);
  
  const response = await login.decision({
    dateTime: new Date(),
    eventId: req.body.eventId,
    clientPayload: req.body.clientPayload,
    ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    login: {
      userId: user.id,
      channel: "web",
      usedCaptcha: false,
      usedRememberMe: false,
      authenticationType: "password",
      status: user.isPasswordMatch(body.password),
      passwordUpdateTime: user.passwordUpdateTime,
      userNameUpdateTime: user.userNameUpdateTime 
    }
  });
  
  // do something with the "response" 
  if (response.decision === 'reject') {
    throw new InvalidCredentialsError('Sorry not gonna happen...');
  }
}
```

## Auth0 Integration

Auth0 provides a universal authentication & authorization platform for web and mobile applications. Out of the box
Auth0 provides a sandbox (rules) where ad hoc JavaScript code can be executed. We provide an npm package that can be utilized
in these rules to to integrate our Account-Takeover Fraud prevention API.

### Logical Overview

Precognitive's API returns a decision of "allow", "review" or "reject", amongst other data points. An error will (should) 
be thrown if the authentication is to be prevented (usually a "reject"). The error will be a custom `PrecognitiveError` that 
will have a property called `isFraud`. This will return true if Precognitive considers the login to be fraudulent.
In addition, methods are provided to handle directly hitting our API and the authentication failure case.

Follow the steps below:

##### 1a. AutoDecision Rule (Preferred installation)

The AutoDecision Rule makes the decision based off preexisting logic managed by the SDK. This is the preferred integration.

##### 1b. Decision Rule

The Decision Rule allows the developer to access the direct response, either to log/persist the response or the override the 
Precognitive decision.

##### 2. AuthFailure Rule

The Auth Failure rule is used 

##### 3. Configuration

The following configuration values are required to be accessible in the Rule sandbox. These values will be provided by your account
manager or technical contact.
 
* PRECOGNITIVE_API_KEY - API Key is used to tie a request to an application
* PRECOGNITIVE_USERNAME - UserName is used for Basic-Auth 
* PRECOGNITIVE_PASSWORD - Password is used for Basic-Auth

##### 4. Client-Side Installation

Auth0 provides a session ID that is accessible in the browser by utilizing the `auth0` cookie. You can retrieve and parse 
the cookie in whatever way is easiest for your team as long as the value is passed along in its current format.

```html
<img src="https://cdn.ad1x.com/static/clrpxl.gif?apiKey={{ API_KEY }}&eventId={{ CUSTOM_EVENT_ID }}" style="display: none" />
<script type="application/javascript">
  // visit https://developers.precognitive.io/#section/Integration/JavaScriptTag-Deployment to retrieve the full script
  
  // Add the auth0 session ID as the eventId.
  // @note You can use any Cookie parsing lib or vanilla JS.
  _trnu("set", "eventId", "{{ CUSTOM_EVENT_ID }}");
</script>
``` 

##### 5. Deploy Rules

## Road Map

We will add additional API integrations over time including the below APIs (and others as our product evolves).

- [Transactions API](https://dev.precognitive.io/#operation//decision/login)
- [Opens API](https://dev.precognitive.io/#operation//decision/login)
