const DecisionAi = require('decision-ai-sdk');

function rule (user, context, callback) {
  const decisionAi = new DecisionAi.Auth0({
    appId: process.env.PRECOGNITIVE_APP_ID,
    auth: {
      userName: process.env.PRECOGNITIVE_USERNAME,
      password: process.env.PRECOGNITIVE_PASSWORD
    }
  });

  decisionAi.authFailure(user, context)
    .then((result) => {
      // Log the results or use in logic if needed
      console.log(result);
    })
    .catch((err) => {
      // handle the error
      console.error(err);
    });
}
