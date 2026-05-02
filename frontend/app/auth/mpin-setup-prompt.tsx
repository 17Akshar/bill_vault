/**
 * Post-login MPIN Setup Prompt.
 *
 * Shown automatically after sign-in / register when the user has NOT yet
 * set up MPIN AND has not dismissed the prompt.
 *
 *   Set Up Now → navigate to /security/mpin
 *   Skip for Now → one-time dismiss, show again next login
 *   Don't Ask Again → persists dismissal (POST /api/mpin/dismiss-prompt)
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

export default function MpinSetupPromptScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const goToDashboard = () => router.replace('/(tabs)/dashboard');

  const onSetUp = () => {
    // Pass next=dashboard so MPIN screen returns straight into the app
    router.replace('/security/mpin?next=dashboard');
  };

  const onSkip = () => {
    goToDashboard();
  };

  const onDontAskAgain = async () => {
    setLoading(true);
    try {
      await api.post('/mpin/dismiss-prompt', {});
    } catch { /* non-blocking */ }
    goToDashboard();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Shield hero */}
        <View style={[styles.heroIcon, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="shield-checkmark" size={56} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]} testID="mpin-prompt-title">
          Set up Quick Login
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Create a 4–6 digit MPIN to unlock Fintracker instantly, without typing your password every time.
        </Text>

        {/* Benefits */}
        <View style={styles.benefits}>
          {[
            { icon: 'flash', label: 'One-tap sign-in' },
            { icon: 'lock-closed', label: 'Biometric-class security' },
            { icon: 'phone-portrait', label: 'Works offline' },
          ].map(b => (
            <View key={b.label} style={styles.benefitRow}>
              <Ionicons name={b.icon as any} size={18} color={colors.primary} />
              <Text style={[styles.benefitText, { color: colors.text }]}>{b.label}</Text>
            </View>
          ))}
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          testID="mpin-prompt-setup-btn"
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={onSetUp}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Set up MPIN</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>

        {/* Secondary actions */}
        <TouchableOpacity
          testID="mpin-prompt-skip-btn"
          style={styles.textBtn}
          onPress={onSkip}
          disabled={loading}
        >
          <Text style={[styles.textBtnLabel, { color: colors.text }]}>Skip for now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="mpin-prompt-dont-ask-btn"
          style={styles.textBtn}
          onPress={onDontAskAgain}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textSecondary} size="small" />
          ) : (
            <Text style={[styles.textBtnLabel, { color: colors.textSecondary, fontWeight: '400' }]}>
              Don't ask again
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          You can enable MPIN later from Profile → Security.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingTop: 20, gap: 4,
  },
  heroIcon: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  benefits: {
    alignSelf: 'stretch', gap: 12,
    marginBottom: 36, paddingHorizontal: 8,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitText: { fontSize: 14, fontWeight: '500' },
  primaryBtn: {
    alignSelf: 'stretch', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14, marginBottom: 12,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  textBtn: {
    paddingVertical: 12, alignSelf: 'stretch', alignItems: 'center',
  },
  textBtnLabel: { fontSize: 14, fontWeight: '600' },
  footer: {
    fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18,
  },
});
