import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await getCurrentUser();
      if (res.data?.loggedIn) {
        setUser(res.data.user);
        return res.data.user;
      }
      setUser(null);
      return null;
    } catch (error) {
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (credentials) => {
    const res = await loginRequest(credentials);
    const nextUser = res.data?.user || await refreshUser();
    setUser(nextUser);
    return nextUser;
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      window.dispatchEvent(new Event('user-logged-out'));
    }
  }, []);

  const value = useMemo(() => ({
    user,
    authLoading,
    isAuthenticated: Boolean(user),
    refreshUser,
    login,
    logout,
  }), [user, authLoading, refreshUser, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
