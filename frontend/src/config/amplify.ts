import { Amplify } from 'aws-amplify';

// This will be initialized dynamically after fetching config from backend
export const configureAmplify = (userPoolId: string, clientId: string, _region: string) => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: userPoolId,
        userPoolClientId: clientId,
        loginWith: {
          email: true,
        },
      },
    },
  });
};
