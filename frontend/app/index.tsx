import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function Welcome() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/bills');
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="receipt-outline" size={80} color={colors.primary} />
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>Bill Tracker</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Never miss a payment again
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresContainer}>
          <FeatureItem 
            icon="calendar-outline" 
            text="Track all your bills"
            colors={colors}
          />
          <FeatureItem 
            icon="notifications-outline" 
            text="Get reminders"
            colors={colors}
          />
          <FeatureItem 
            icon="stats-chart-outline" 
            text="View analytics"
            colors={colors}
          />
        </View>
      </View>
    </View>
  );
}

const FeatureItem = ({ icon, text, colors }: any) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon} size={24} color={colors.primary} />
    <Text style={[styles.featureText, { color: colors.textSecondary }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 48,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  featuresContainer: {
    marginTop: 48,
    gap: 16,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
  },
});