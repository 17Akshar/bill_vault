/**
 * Forgot Email / Recover Account screen.
 *
 * Flow:
 *   1. User enters phone number
 *   2. Firebase sends OTP via SMS (reCAPTCHA on web)
 *   3. User enters OTP
 *   4. Backend verifies ID token + returns masked email(s) from Firestore
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { sendPhoneOtp, verifyPhoneOtp, resetRecaptcha } from '../../utils/firebasePhoneAuth';
import type { ConfirmationResult } from 'firebase/auth';

type Step = 'phone' | 'otp' | 'done';
const RECAPTCHA_ID = 'fe-recaptcha-container';

interface MaskedAccount {
  masked_email: string;
  name_preview: string | null;
  created_at: string | null;
}

export default function ForgotEmailScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<MaskedAccount[]>([]);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const sendOtp = async () => {
    setError(null);
    if (Platform.OS !== 'web') {
      setError('Phone OTP recovery is only available on web. Please open Fintracker in your browser.');
      return;
    }
    const e164 = phone.trim().replace(/\s/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
      setError('Enter phone in E.164 format, e.g., +919876543210');
      return;
    }
    setLoading(true);
    try {
      confirmationRef.current = await sendPhoneOtp(e164, RECAPTCHA_ID);
      setStep('otp');
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndReveal = async () => {
    setError(null);
    if (!confirmationRef.current) {
      setError('Session expired. Please request a new OTP.');
      setStep('phone');
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit OTP you received.');
      return;
    }
    setLoading(true);
    try {
      const idToken = await verifyPhoneOtp(confirmationRef.current, otp);
      const res = await api.post('/recovery/email/reveal', { firebase_id_token: idToken });
      setAccounts(res.data?.accounts || []);
      setStep('done');
      resetRecaptcha();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to recover account');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => router.replace('/auth/login');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <TouchableOpacity onPress={goToLogin} style={styles.backBtn} testID="forgot-email-back-btn">
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Recover Account</Text>
            <View style={{ width: 28 }} />
          </View>

          {step === 'phone' && (
            <>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Forgot which email you used? Verify your phone number and we'll show you the accounts linked to it.
              </Text>
              <Text style={[styles.label, { color: colors.text }]}>Registered phone number</Text>
              <TextInput
                testID="forgot-email-phone-input"
                value={phone}
                onChangeText={setPhone}
                placeholder="+919876543210"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              <Text style={[styles.helper, { color: colors.textSecondary }]}>
                Enter in E.164 format including country code.
              </Text>
              {Platform.OS === 'web' && <div id={RECAPTCHA_ID} />}
              <PrimaryButton
                label="Send OTP"
                loading={loading}
                onPress={sendOtp}
                colors={colors}
                testID="forgot-email-send-otp"
              />
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter the OTP we sent to {phone.slice(0, 3)}****{phone.slice(-2)}.
              </Text>
              <Text style={[styles.label, { color: colors.text }]}>OTP</Text>
              <TextInput
                testID="forgot-email-otp-input"
                value={otp}
                onChangeText={setOtp}
                placeholder="123456"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, styles.otpInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                keyboardType="number-pad"
                maxLength={6}
              />
              <PrimaryButton
                label="Verify & Reveal Email"
                loading={loading}
                onPress={verifyAndReveal}
                colors={colors}
                testID="forgot-email-verify"
              />
              <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); resetRecaptcha(); }}>
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  Didn't get the code? Try again
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <View style={styles.doneBox}>
              {accounts.length > 0 ? (
                <>
                  <Ionicons name="checkmark-circle" size={56} color="#22C55E" />
                  <Text style={[styles.doneTitle, { color: colors.text }]}>
                    We found {accounts.length} account{accounts.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={[styles.doneText, { color: colors.textSecondary }]}>
                    Your email is shown below. For privacy we only show a masked version.
                  </Text>
                  {accounts.map((acc, i) => (
                    <View
                      key={i}
                      testID={`forgot-email-account-${i}`}
                      style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <Ionicons name="mail-outline" size={22} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.accountEmail, { color: colors.text }]}>
                          {acc.masked_email}
                        </Text>
                        {acc.name_preview && (
                          <Text style={[styles.accountSub, { color: colors.textSecondary }]}>
                            {acc.name_preview}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <Ionicons name="alert-circle" size={56} color="#F59E0B" />
                  <Text style={[styles.doneTitle, { color: colors.text }]}>No account found</Text>
                  <Text style={[styles.doneText, { color: colors.textSecondary }]}>
                    We couldn't find any Fintracker account linked to this phone number.
                  </Text>
                </>
              )}
              <PrimaryButton
                label="Back to sign in"
                loading={false}
                onPress={goToLogin}
                colors={colors}
                testID="forgot-email-back-to-login"
              />
            </View>
          )}

          {error && (
            <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText} testID="forgot-email-error">{error}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryButton({ label, loading, onPress, colors, testID }: any) {
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, marginBottom: 8,
  },
  otpInput: { textAlign: 'center', fontSize: 22, letterSpacing: 8 },
  helper: { fontSize: 12, marginBottom: 12 },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12, marginBottom: 12 },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  linkText: { textAlign: 'center', fontSize: 13, fontWeight: '600', marginTop: 8 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12,
  },
  errorText: { color: '#991B1B', fontSize: 13, flex: 1 },
  doneBox: { alignItems: 'center', padding: 12, gap: 12 },
  doneTitle: { fontSize: 20, fontWeight: '700' },
  doneText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  accountCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 16,
  },
  accountEmail: { fontSize: 16, fontWeight: '700' },
  accountSub: { fontSize: 12, marginTop: 2 },
});
