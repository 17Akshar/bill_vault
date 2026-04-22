import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <LinearGradient
            colors={['#5B2FBF', '#7C5CE7', '#9B7AFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBg}
          >
            <Ionicons name="wallet" size={40} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.logoText, { color: colors.text }]}>Fintracker</Text>
        </View>

        {/* Tagline */}
        <Text style={[styles.tagline, { color: colors.text }]}>
          Your Personal Finance{'\n'}& Wealth OS
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Track, manage and grow your wealth{'\n'}all in one place
        </Text>

        {/* Feature Cards */}
        <View style={styles.featureGrid}>
          <FeatureCard
            icon="trending-up"
            title="Net Worth"
            desc="Track total wealth"
            color="#22C55E"
            bgColor={isDark ? '#1A2E1F' : '#ECFDF5'}
          />
          <FeatureCard
            icon="pie-chart"
            title="Investments"
            desc="Portfolio analytics"
            color="#5B2FBF"
            bgColor={isDark ? '#1E1A2E' : '#F3F0FF'}
          />
          <FeatureCard
            icon="card"
            title="Accounts"
            desc="Banks & wallets"
            color="#3B82F6"
            bgColor={isDark ? '#1A2436' : '#EFF6FF'}
          />
          <FeatureCard
            icon="notifications"
            title="Reminders"
            desc="Never miss a bill"
            color="#F59E0B"
            bgColor={isDark ? '#2E2A1A' : '#FFFBEB'}
          />
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#5B2FBF', '#7C5CE7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          Fintracker v2.0
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const FeatureCard = ({ icon, title, desc, color, bgColor }: { icon: string; title: string; desc: string; color: string; bgColor: string }) => (
  <View style={[styles.featureCard, { backgroundColor: bgColor }]}>
    <View style={[styles.featureIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <Text style={[styles.featureTitle, { color }]}>{title}</Text>
    <Text style={[styles.featureDesc, { color: color + 'AA' }]}>{desc}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    alignSelf: 'center',
    marginBottom: 32,
  },
  logoBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 36,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 68) / 2,
    borderRadius: 16,
    padding: 16,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});