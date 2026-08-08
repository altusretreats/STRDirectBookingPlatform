import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const poolConfig = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId:   import.meta.env.VITE_COGNITO_CLIENT_ID,
};

const userPool = new CognitoUserPool(poolConfig);

export function login(email, password) {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => resolve({ user: cognitoUser, session }),
      onFailure: (err) => reject(err),
      newPasswordRequired: (userAttr) => reject({ code: 'NEW_PASSWORD_REQUIRED', userAttr, cognitoUser }),
    });
  });
}

export function logout() {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
  window.location.reload();
}

export function getSession() {
  return new Promise((resolve, reject) => {
    const user = userPool.getCurrentUser();
    if (!user) return reject(new Error('No user'));
    user.getSession((err, session) => {
      if (err || !session?.isValid()) return reject(err || new Error('Session invalid'));
      resolve(session);
    });
  });
}

export async function getIdToken() {
  const session = await getSession();
  return session.getIdToken().getJwtToken();
}
