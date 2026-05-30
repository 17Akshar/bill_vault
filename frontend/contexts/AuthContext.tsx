import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authEvents, BACKEND_URL as API_BACKEND_URL } from '../utils/api';

// Force axios to use the `fetch` adapter on web (browser + expo-router SSR).
// Without this, axios falls back to its Node-only `http` adapter which pulls in
// `follow-redirects` + Node core modules and crashes the bundle with:
//   "Cannot read properties of undefined (reading 'prototype')"
// Set at module-init time so it applies before any HTTP call below.
if (Platform.OS === 'web') {
  axios.defaults.adapter = 'fetch';
}

const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  API_BACKEND_URL ||
  'http://localhost:8000';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; mobile_number: string; security_question: string; security_answer: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  useSingleUserMode: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    // Listen for 401 responses from the api interceptor — clear state and go to login
    const handleUnauthenticated = () => {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    };
    authEvents.on('unauthenticated', handleUnauthenticated);
    return () => { authEvents.off('unauthenticated', handleUnauthenticated); };
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        // Validate the stored token with the backend before trusting it
        try {
          await axios.get(`${BACKEND_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            ...(Platform.OS === 'web' ? { adapter: 'fetch' as any } : {}),
          });
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } catch (validationError: any) {
          // Stored token is invalid or expired — clear it and try single-user mode
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user');
          try {
            await useSingleUserMode();
          } catch {
            // Backend unreachable — stay unauthenticated, show login screen
          }
        }
      } else {
        // Auto-bootstrap single-user mode when no stored credentials exist
        // so that deep-links to protected screens (eg /investments) work
        // without forcing a manual login on the welcome screen.
        try {
          await useSingleUserMode();
        } catch (e) {
          // Network/backend hiccup — silent fallback to unauthenticated state.
          // Welcome screen will still render its CTAs.
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email,
        password
      });

      const { user: userData, access_token } = response.data;
      
      await AsyncStorage.setItem('auth_token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      let msg = 'Login failed';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d: any) => typeof d === 'string' ? d : d.msg || d.message || 'Validation error').join('. ');
      }
      throw new Error(msg);
    }
  };

  const register = async (data: { email: string; password: string; name: string; mobile_number: string; security_question: string; security_answer: string }) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        email: data.email,
        password: data.password,
        name: data.name,
        mobile_number: data.mobile_number,
        security_question: data.security_question,
        security_answer: data.security_answer,
      });

      const { user: userData, access_token } = response.data;
      
      await AsyncStorage.setItem('auth_token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      let msg = 'Registration failed';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d: any) => typeof d === 'string' ? d : d.msg || d.message || 'Validation error').join('. ');
      }
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async () => {
    // Lazy import so the firebase JS SDK only loads when this method is called
    // (and only on web — on native it throws a friendly error message).
    const { signInWithGooglePopup } = await import('../utils/firebase');
    let idToken: string;
    try {
      const result = await signInWithGooglePopup();
      idToken = result.idToken;
    } catch (err: any) {
      // User closed popup, blocked popups, or unauthorized domain
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new Error('Google sign-in was cancelled');
      }
      if (code === 'auth/popup-blocked') {
        throw new Error('Popup blocked. Please allow popups for this site and try again.');
      }
      if (code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized for Google Sign-In. Add it in Firebase Console → Authentication → Settings → Authorized domains.');
      }
      throw new Error(err?.message || 'Google sign-in failed');
    }

    // Exchange Firebase ID token for our app JWT
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/google/firebase`, { id_token: idToken });
      const { user: userData, access_token } = response.data;

      await AsyncStorage.setItem('auth_token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      throw new Error(typeof detail === 'string' ? detail : 'Google login failed on backend');
    }
  };

  // Legacy (Emergent OAuth) — kept for backwards compat but no longer wired in UI.
  const loginWithGoogleSession = async (sessionId: string) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/google/session`, {
        session_id: sessionId
      });

      const { user: userData, session_token } = response.data;
      
      await AsyncStorage.setItem('auth_token', session_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setToken(session_token);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Google login failed');
    }
  };

  const useSingleUserMode = async () => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/single-user`);

      const { user: userData, access_token } = response.data;
      
      await AsyncStorage.setItem('auth_token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Single user mode failed');
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        register,
        loginWithGoogle,
        useSingleUserMode,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};