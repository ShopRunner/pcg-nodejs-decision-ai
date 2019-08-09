const DecisionAi = require('decision-ai-sdk');

function rule (user, context, callback) {
  const decisionAi = new DecisionAi.Auth0({
    appId: process.env.PRECOGNITIVE_APP_ID,
    auth: {
      userName: process.env.PRECOGNITIVE_USERNAME,
      password: process.env.PRECOGNITIVE_PASSWORD
    }
  });

  decisionAi.decision(user, context)
    .then((res) => {
      const isGoodLogin = DecisionAi.Auth0.isGoodLogin(res);
      let err = null;

      if (!isGoodLogin) {
        err = new Error('Unauthorized');
      }

      callback(err, user, context);
    })
    .catch((err) => {
      callback(err, user, context);
    });
}
