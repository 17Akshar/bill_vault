/**
 * Forgot Password screen.
 *
 * Two paths:
 *   - Email: Firebase sendPasswordResetEmail() + backend rate-limit log
 *   - Phone: Firebase Phone Auth OTP (web-only) -> backend password update
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { sendPasswordResetEmail } from '../../utils/firebase';
import { sendPhoneOtp, verifyPhoneOtp, resetRecaptcha } from '../../utils/firebasePhoneAuth';
import type { ConfirmationResult } from 'firebase/auth';

type Method = 'email' | 'phone';
type Step = 'choose' | 'verify_otp' | 'new_password' | 'done_email' | 'done_phone';

const RECAPTCHA_ID = 'fp-recaptcha-container';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [method, setMethod] = useState<Method>('email');
  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const idTokenRef = useRef<string>('');

  // ---- Step 1a: Email flow ----
  const submitEmailReset = async () => {
    setError(null);
    if (!email.trim() || !/.+@.+\..+/.test(email)) {
      setError('Please enter a valid email.');
      return;
    }
    setLoading(true);
    try {
      // 1. Server-side rate limit + log
      await api.post('/recovery/password/email', { email: email.trim().toLowerCase() });
      // 2. Firebase email link (web only, silently ignored on mobile)
      await sendPasswordResetEmail(email.trim().toLowerCase());
      setSuccess('If an account exists with that email, a reset link has been sent to your inbox.');
      setStep('done_email');
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 1b: Phone flow - send OTP ----
  const submitPhoneOtp = async () => {
    setError(null);
    if (Platform.OS !== 'web') {
      setError('Phone OTP recovery is only available on web. Please use email instead, or open Fintracker in your browser.');
      return;
    }
    const e164 = phone.trim().replace(/\s/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
      setError('Enter phone in E.164 format, e.g., +919876543210');
      return;
    }
    setLoading(true);
    try {
      const confirmation = await sendPhoneOtp(e164, RECAPTCHA_ID);
      confirmationRef.current = confirmation;
      setSuccess(`OTP sent to ${e164.slice(0, 3)}****${e164.slice(-2)}`);
      setStep('verify_otp');
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 2: Verify OTP ----
  const submitVerifyOtp = async () => {
    setError(null);
    if (!confirmationRef.current) {
      setError('Session expired. Please request a new OTP.');
      setStep('choose');
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit OTP you received.');
      return;
    }
    setLoading(true);
    try {
      idTokenRef.current = await verifyPhoneOtp(confirmationRef.current, otp);
      setSuccess('Phone verified! Now set a new password.');
      setStep('new_password');
    } catch (e: any) {
      setError(e.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 3: Set new password ----
  const submitNewPassword = async () => {
    setError(null);
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter and one number');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!idTokenRef.current) {
      setError('Session expired. Please start again.');
      setStep('choose');
      return;
    }
    setLoading(true);
    try {
      await api.post('/recovery/password/phone/verify', {
        firebase_id_token: idTokenRef.current,
        new_password: newPassword,
      });
      setSuccess('Password reset successfully. You can now sign in with your new password.');
      setStep('done_phone');
      resetRecaptcha();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to reset password');
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={goToLogin}
              style={styles.backBtn}
              testID="forgot-password-back-btn"
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Progress */}
          <View style={styles.progress}>
            {(['choose', 'verify_otp', 'new_password'] as Step[]).map((s, i) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      step === s || (step === 'done_email' && s === 'choose')
                        || (step === 'done_phone')
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* STEP 1: Choose method */}
          {step === 'choose' && (
            <>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Choose how you'd like to reset your password.
              </Text>

              <View style={styles.methodToggle}>
                <TouchableOpacity
                  testID="forgot-password-method-email"
                  style={[
                    styles.methodBtn,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    method === 'email' && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => { setMethod('email'); setError(null); }}
                >
                  <Ionicons name="mail-outline" size={22}
                    color={method === 'email' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.methodLabel,
                    { color: method === 'email' ? colors.text : colors.textSecondary }]}>
                    Email
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="forgot-password-method-phone"
                  style={[
                    styles.methodBtn,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    method === 'phone' && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => { setMethod('phone'); setError(null); }}
                >
                  <Ionicons name="call-outline" size={22}
                    color={method === 'phone' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.methodLabel,
                    { color: method === 'phone' ? colors.text : colors.textSecondary }]}>
                    Phone OTP
                  </Text>
                </TouchableOpacity>
              </View>

              {method === 'email' ? (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
                  <TextInput
                    testID="forgot-password-email-input"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <PrimaryButton
                    label="Send reset link"
                    loading={loading}
                    onPress={submitEmailReset}
                    colors={colors}
                    testID="forgot-password-submit-email"
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>Phone number</Text>
                  <TextInput
                    testID="forgot-password-phone-input"
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
                  {Platform.OS === 'web' && (
                    // Invisible reCAPTCHA container (required by Firebase Phone Auth on web)
                    <div id={RECAPTCHA_ID} />
                  )}
                  <PrimaryButton
                    label="Send OTP"
                    loading={loading}
                    onPress={submitPhoneOtp}
                    colors={colors}
                    testID="forgot-password-submit-phone"
                  />
                </>
              )}
            </>
          )}

          {/* STEP 2: Verify OTP (phone only) */}
          {step === 'verify_otp' && (
            <>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter the 6-digit OTP we sent to your phone.
              </Text>
              <Text style={[styles.label, { color: colors.text }]}>OTP</Text>
              <TextInput
                testID="forgot-password-otp-input"
                value={otp}
                onChangeText={setOtp}
                placeholder="123456"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, styles.otpInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                keyboardType="number-pad"
                maxLength={6}
              />
              <PrimaryButton
                label="Verify OTP"
                loading={loading}
                onPress={submitVerifyOtp}
                colors={colors}
                testID="forgot-password-verify-otp"
              />
              <TouchableOpacity onPress={() => { setStep('choose'); setOtp(''); resetRecaptcha(); }}>
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  Didn't get the code? Try again
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 3: Set new password (after phone verified) */}
          {step === 'new_password' && (
            <>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Create a new password. Must be at least 8 characters with 1 uppercase letter and 1 number.
              </Text>

              <Text style={[styles.label, { color: colors.text }]}>New password</Text>
              <View style={[styles.passwordWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  testID="forgot-password-new-password-input"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.passwordInput, { color: colors.text }]}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPwd(v => !v)} testID="forgot-password-toggle-show">
                  <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Confirm password</Text>
              <TextInput
                testID="forgot-password-confirm-password-input"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
              />

              <PasswordChecklist password={newPassword} colors={colors} />

              <PrimaryButton
                label="Reset password"
                loading={loading}
                onPress={submitNewPassword}
                colors={colors}
                testID="forgot-password-submit-new-password"
              />
            </>
          )}

          {/* DONE states */}
          {(step === 'done_email' || step === 'done_phone') && (
            <View style={styles.doneBox}>
              <Ionicons name="checkmark-circle" size={56} color="#22C55E" />
              <Text style={[styles.doneTitle, { color: colors.text }]}>
                {step === 'done_email' ? 'Check your inbox' : 'Password reset!'}
              </Text>
              <Text style={[styles.doneText, { color: colors.textSecondary }]}>
                {success}
              </Text>
              <PrimaryButton
                label="Back to sign in"
                loading={false}
                onPress={goToLogin}
                colors={colors}
                testID="forgot-password-back-to-login"
              />
            </View>
          )}

          {/* Inline messages */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText} testID="forgot-password-error">{error}</Text>
            </View>
          )}
          {success && step !== 'done_email' && step !== 'done_phone' && (
            <View style={[styles.successBox, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text style={styles.successText} testID="forgot-password-success">{success}</Text>
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
      {loading ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function PasswordChecklist({ password, colors }: { password: string, colors: any }) {
  const rules = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'One number', ok: /\d/.test(password) },
  ];
  return (
    <View style={styles.checklist}>
      {rules.map(r => (
        <View key={r.label} style={styles.checkRow}>
          <Ionicons
            name={r.ok ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={r.ok ? '#22C55E' : colors.textSecondary}
          />
          <Text style={{ color: r.ok ? '#22C55E' : colors.textSecondary, fontSize: 12 }}>
            {r.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  progress: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24 },
  progressDot: { width: 40, height: 4, borderRadius: 2 },
  subtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  methodToggle: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  methodBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 16,
    alignItems: 'center', gap: 8,
  },
  methodLabel: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, marginBottom: 8,
  },
  otpInput: { textAlign: 'center', fontSize: 22, letterSpacing: 8 },
  passwordWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, marginBottom: 8,
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  helper: { fontSize: 12, marginBottom: 12 },
  button: {
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    marginTop: 12, marginBottom: 12,
  },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  linkText: { textAlign: 'center', fontSize: 13, fontWeight: '600', marginTop: 8 },
  checklist: { gap: 4, marginVertical: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12,
  },
  errorText: { color: '#991B1B', fontSize: 13, flex: 1 },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12,
  },
  successText: { color: '#166534', fontSize: 13, flex: 1 },
  doneBox: { alignItems: 'center', padding: 24, gap: 12 },
  doneTitle: { fontSize: 20, fontWeight: '700' },
  doneText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
