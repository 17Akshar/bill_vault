import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { waitForAuthReady } from './authReady';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
  || process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  console.warn('EXPO_PUBLIC_BACKEND_URL is not configured — using default');
}

// Globally force axios to use the `fetch` adapter on web (browser + SSR).
// Without this, axios falls back to its Node.js `http` adapter which pulls in
// `follow-redirects` and Node-only modules (`http`, `https`, `stream`, etc.) —
// these crash with `Cannot read properties of undefined (reading 'prototype')`
// in any web bundle (browser or expo-router SSR).
if (Platform.OS === 'web') {
  axios.defaults.adapter = 'fetch';
}

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  ...(Platform.OS === 'web' ? { adapter: 'fetch' as const } : {}),
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    // Wait until AuthContext bootstrap has finished (or timed out) so that
    // deep-linked screens don't fire requests before the single-user token
    // has been minted and persisted to AsyncStorage. This prevents an
    // auth-bootstrap race where the very first /api/* call lands a 401 and
    // the response interceptor below wipes the (in-flight) token.
    try {
      await waitForAuthReady();
    } catch {
      // ignore — fall through and send the request anyway
    }
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
let _reauthInFlight: Promise<string | null> | null = null;

async function _tryReauth(): Promise<string | null> {
  // In single-user mode, try once to re-mint a token before logging the
  // user out. Multiple concurrent 401s share the same in-flight promise.
  if (_reauthInFlight) return _reauthInFlight;
  const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
    || process.env.EXPO_PUBLIC_BACKEND_URL;
  _reauthInFlight = (async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/auth/single-user`, undefined, {
        ...(Platform.OS === 'web' ? { adapter: 'fetch' as const } : {}),
      });
      const newToken = res.data?.access_token;
      const newUser  = res.data?.user;
      if (newToken) await AsyncStorage.setItem('auth_token', newToken);
      if (newUser)  await AsyncStorage.setItem('user', JSON.stringify(newUser));
      return newToken || null;
    } catch {
      return null;
    } finally {
      // allow another attempt later if this one failed
      setTimeout(() => { _reauthInFlight = null; }, 2000);
    }
  })();
  return _reauthInFlight;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      // Try once to re-mint a single-user token, then replay the original request.
      const newToken = await _tryReauth();
      if (newToken) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
      // Re-auth failed — only now clear stored creds.
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;