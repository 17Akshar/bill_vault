import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://localhost:8000';

if (!Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL && !process.env.EXPO_PUBLIC_BACKEND_URL) {
  console.warn('EXPO_PUBLIC_BACKEND_URL is not configured — falling back to http://localhost:8000');
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
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      // You might want to navigate to login here
    }
    return Promise.reject(error);
  }
);

export default api;