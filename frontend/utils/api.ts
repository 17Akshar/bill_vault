import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { EventEmitter } from 'events';

export const authEvents = new EventEmitter();

const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://localhost:8000';

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

// Handle response errors — on 401 clear stored credentials and signal logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      // Notify AuthContext so it resets state and sends user back to login
      authEvents.emit('unauthenticated');
    }
    return Promise.reject(error);
  }
);

export { BACKEND_URL };
export default api;