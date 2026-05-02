/**
 * MPIN Setup / Management Screen
 *
 * Flow:
 *   Step 'length'  -> user chooses 4 or 6 digits (skipped if already enabled)
 *   Step 'enter'   -> user types new MPIN (client-side weakness check)
 *   Step 'confirm' -> user re-types to confirm
 *
 * Router param next=dashboard: after successful setup, jump to dashboard
 * instead of router.back() (used from post-login prompt).
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Vibration, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { isWeakMpin } from '../../utils/mpinPolicy';

type Step = 'length' | 'enter' | 'confirm';
type PinLength = 4 | 6;

export default function MPINScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const { colors } = useTheme();

  const [pinLength, setPinLength] = useState<PinLength>(4);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<Step>('length');
  const [loading, setLoading] = useState(false);
  const [mpinEnabled, setMpinEnabled] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // submitting flag prevents double-submit when 6th digit triggers auto-submit
  const submittingRef = useRef(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await api.get('/mpin/status');
      setMpinEnabled(res.data.is_enabled);
      if (res.data.is_enabled) {
        // Existing MPIN — skip length selection, show change flow
        setPinLength((res.data.pin_length || 4) as PinLength);
        setStep('enter');
      }
    } catch (e) { /* ignore */ }
    finally { setCheckingStatus(false); }
  };

  const safeVibrate = (ms: number) => {
    if (Platform.OS !== 'web') {
      try { Vibration.vibrate(ms); } catch { /* ignore */ }
    }
  };

  const handleDigit = (digit: string) => {
    if (submittingRef.current) return;
    setError(null);
    safeVibrate(10);
    if (step === 'enter') {
      if (pin.length < pinLength) {
        const newPin = pin + digit;
        setPin(newPin);
        if (newPin.length === pinLength) {
          // Check weakness before moving to confirm
          const weak = isWeakMpin(newPin);
          if (weak) {
            setTimeout(() => {
              setError(weak);
              setPin('');
            }, 400);
            return;
          }
          setTimeout(() => setStep('confirm'), 200);
        }
      }
    } else {
      if (confirmPin.length < pinLength) {
        const newConfirm = confirmPin + digit;
        setConfirmPin(newConfirm);
        if (newConfirm.length === pinLength) {
          submittingRef.current = true;
          setTimeout(() => submitMPIN(pin, newConfirm), 200);
        }
      }
    }
  };

  const handleDelete = () => {
    setError(null);
    safeVibrate(10);
    if (step === 'enter') setPin(pin.slice(0, -1));
    else setConfirmPin(confirmPin.slice(0, -1));
  };

  const submitMPIN = async (p: string, cp: string) => {
    if (p !== cp) {
      setError('PINs do not match. Try again.');
      setPin('');
      setConfirmPin('');
      setStep('enter');
      submittingRef.current = false;
      return;
    }
    setLoading(true);
    try {
      await api.post('/mpin/setup', { mpin: p });
      setMpinEnabled(true);
      setError(null);
      // Success — brief checkmark then navigate
      setTimeout(() => {
        if (params.next === 'dashboard') {
          router.replace('/(tabs)/dashboard');
        } else if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/profile');
        }
      }, 800);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to set MPIN');
      setPin('');
      setConfirmPin('');
      setStep('enter');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const disableMPIN = async () => {
    setLoading(true);
    try {
      await api.post('/mpin/disable');
      setMpinEnabled(false);
      setPin(''); setConfirmPin(''); setStep('length');
    } catch { setError('Failed to disable MPIN'); }
    finally { setLoading(false); }
  };

  const chooseLength = (l: PinLength) => {
    setPinLength(l);
    setStep('enter');
  };

  const currentPin = step === 'enter' ? pin : confirmPin;

  if (checkingStatus) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (params.next === 'dashboard') router.replace('/(tabs)/dashboard');
            else if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/profile');
          }}
          style={styles.backBtn}
          testID="mpin-back-btn"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>MPIN Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.pinContainer}>
        {/* Status badge */}
        <View style={[styles.statusBadge, {
          backgroundColor: mpinEnabled ? '#22C55E20' : colors.card,
        }]}>
          <Ionicons
            name={mpinEnabled ? 'shield-checkmark' : 'shield-outline'}
            size={20}
            color={mpinEnabled ? '#22C55E' : colors.textSecondary}
          />
          <Text style={[styles.statusLabel, {
            color: mpinEnabled ? '#22C55E' : colors.textSecondary,
          }]}>
            MPIN is {mpinEnabled ? 'enabled' : 'not set'}
          </Text>
        </View>

        {/* STEP: length picker (only shown for first-time setup) */}
        {step === 'length' && (
          <>
            <View style={[styles.lockIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="keypad" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.pinTitle, { color: colors.text }]}>
              Choose MPIN length
            </Text>
            <Text style={[styles.pinSubtitle, { color: colors.textSecondary }]}>
              A 6-digit MPIN is more secure.
            </Text>

            <View style={styles.lengthRow}>
              <TouchableOpacity
                testID="mpin-length-4-btn"
                style={[styles.lengthBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => chooseLength(4)}
                activeOpacity={0.7}
              >
                <Text style={[styles.lengthDigit, { color: colors.text }]}>4</Text>
                <Text style={[styles.lengthLabel, { color: colors.textSecondary }]}>digits</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="mpin-length-6-btn"
                style={[styles.lengthBtn, {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + '10',
                  borderWidth: 2,
                }]}
                onPress={() => chooseLength(6)}
                activeOpacity={0.7}
              >
                <Text style={[styles.lengthDigit, { color: colors.primary }]}>6</Text>
                <Text style={[styles.lengthLabel, { color: colors.primary, fontWeight: '700' }]}>
                  digits · Recommended
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* STEP: enter / confirm */}
        {(step === 'enter' || step === 'confirm') && (
          <>
            <View style={[styles.lockIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="lock-closed" size={36} color={colors.primary} />
            </View>

            <Text style={[styles.pinTitle, { color: colors.text }]}>
              {step === 'enter'
                ? `Set your ${pinLength}-digit MPIN`
                : 'Confirm your MPIN'}
            </Text>
            <Text style={[styles.pinSubtitle, { color: colors.textSecondary }]}>
              {step === 'enter'
                ? 'This PIN will be used to unlock the app'
                : 'Re-enter your PIN to confirm'}
            </Text>

            {/* PIN Dots */}
            <View style={styles.dotsRow} testID="mpin-dots-row">
              {Array.from({ length: pinLength }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { borderColor: colors.primary },
                    i < currentPin.length && { backgroundColor: colors.primary },
                  ]}
                />
              ))}
            </View>

            {/* Error message */}
            {error && (
              <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText} testID="mpin-error">{error}</Text>
              </View>
            )}

            {/* Numpad */}
            <View style={styles.numpad}>
              {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'del']].map((row, ri) => (
                <View key={ri} style={styles.numpadRow}>
                  {row.map((digit, di) => (
                    <TouchableOpacity
                      key={di}
                      testID={digit ? `mpin-key-${digit}` : undefined}
                      style={[
                        styles.numpadKey,
                        { backgroundColor: digit ? colors.card : 'transparent' },
                      ]}
                      onPress={() => {
                        if (digit === 'del') handleDelete();
                        else if (digit) handleDigit(digit);
                      }}
                      disabled={!digit || loading}
                      activeOpacity={0.6}
                    >
                      {digit === 'del' ? (
                        <Ionicons name="backspace-outline" size={24} color={colors.text} />
                      ) : (
                        <Text style={[styles.numpadDigit, { color: colors.text }]}>{digit}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {loading && (
              <View style={{ marginTop: 16 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}

            {/* Disable button */}
            {mpinEnabled && !loading && (
              <TouchableOpacity
                testID="mpin-disable-btn"
                style={[styles.disableBtn, { borderColor: '#EF4444' }]}
                onPress={disableMPIN}
              >
                <Text style={[styles.disableBtnText, { color: '#EF4444' }]}>Disable MPIN</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  pinContainer: {
    flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 8,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 20,
  },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  lockIcon: {
    width: 72, height: 72, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  pinTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  pinSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  lengthRow: { flexDirection: 'row', gap: 16, width: '100%', maxWidth: 360 },
  lengthBtn: {
    flex: 1, paddingVertical: 24, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', gap: 4,
  },
  lengthDigit: { fontSize: 40, fontWeight: '800' },
  lengthLabel: { fontSize: 12, fontWeight: '500' },
  dotsRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  numpad: { width: '100%', maxWidth: 280 },
  numpadRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 18, marginBottom: 12,
  },
  numpadKey: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  numpadDigit: { fontSize: 24, fontWeight: '600' },
  disableBtn: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10,
    marginTop: 14,
  },
  disableBtnText: { fontSize: 13, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 14, maxWidth: 320,
  },
  errorText: { color: '#991B1B', fontSize: 12, flex: 1 },
});
