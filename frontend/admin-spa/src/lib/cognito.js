import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const poolConfig = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId:   import.meta.env.VITE_COGNITO_CLIENT_ID,
};

function getUserPool() {
  if (!poolConfig.UserPoolId || !poolConfig.ClientId) {
    throw new Error('Admin auth is not configured. Check that VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID are set in your .env file and rebuild.');
  }
  return new CognitoUserPool(poolConfig);
}

export function login(email, password) {
  const pool = getUserPool();
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool });
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => resolve({ user: cognitoUser, session }),
      onFailure: (err) => reject(err),
      newPasswordRequired: (userAttr) => reject({ code: 'NEW_PASSWORD_REQUIRED', userAttr, cognitoUser }),
    });
  });
}

export function logout() {
  const user = getUserPool().getCurrentUser();
  if (user) user.signOut();
  window.location.reload();
}

export function getSession() {
  const pool = getUserPool();
  return new Promise((resolve, reject) => {
    const user = pool.getCurrentUser();
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
