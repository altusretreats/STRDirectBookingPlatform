import { useState, useEffect, createContext, useContext, createElement } from 'react';
import { getSession, logout } from '../lib/cognito';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then((session) => setUser({ email: session.getIdToken().payload.email }))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return createElement(AuthContext.Provider, { value: { user, setUser, loading, logout } }, children);
}

export const useAuth = () => useContext(AuthContext);
