import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    danger: string;
    warning: string;
    info: string;
  };
}

const lightColors = {
  primary: '#5B2FBF',
  background: '#F5F5FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#8E8E9F',
  border: '#E8E8EF',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#6366F1'
};

const darkColors = {
  primary: '#7C5CE7',
  background: '#0D0D14',
  card: '#1A1A28',
  text: '#FFFFFF',
  textSecondary: '#8E8EA0',
  border: '#2C2C3E',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#6366F1'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};