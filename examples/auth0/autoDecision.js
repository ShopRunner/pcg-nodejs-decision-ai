const DecisionAi = require('decision-ai-sdk');

function rule (user, context, callback) {
  const decisionAi = new DecisionAi.Auth0({
    appId: process.env.PRECOGNITIVE_APP_ID,
    auth: {
      userName: process.env.PRECOGNITIVE_USERNAME,
      password: process.env.PRECOGNITIVE_PASSWORD
    }
  });

  decisionAi.autoDecision(user, context, callback);
}
