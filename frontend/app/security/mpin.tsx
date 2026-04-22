import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const PIN_LENGTH = 4;

export default function MPINSetupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [loading, setLoading] = useState(false);
  const [mpinEnabled, setMpinEnabled] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await api.get('/mpin/status');
      setMpinEnabled(res.data.is_enabled);
    } catch (e) { console.error(e); }
    finally { setCheckingStatus(false); }
  };

  const handleDigit = (digit: string) => {
    Vibration.vibrate(10);
    if (step === 'enter') {
      if (pin.length < PIN_LENGTH) {
        const newPin = pin + digit;
        setPin(newPin);
        if (newPin.length === PIN_LENGTH) {
          setTimeout(() => setStep('confirm'), 200);
        }
      }
    } else {
      if (confirmPin.length < PIN_LENGTH) {
        const newConfirm = confirmPin + digit;
        setConfirmPin(newConfirm);
        if (newConfirm.length === PIN_LENGTH) {
          setTimeout(() => submitMPIN(pin, newConfirm), 200);
        }
      }
    }
  };

  const handleDelete = () => {
    Vibration.vibrate(10);
    if (step === 'enter') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const submitMPIN = async (p: string, cp: string) => {
    if (p !== cp) {
      Alert.alert('Mismatch', 'PINs do not match. Try again.');
      setPin('');
      setConfirmPin('');
      setStep('enter');
      return;
    }
    setLoading(true);
    try {
      await api.post('/mpin/setup', { mpin: p });
      Alert.alert('Success', 'MPIN has been set successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to set MPIN');
      setPin('');
      setConfirmPin('');
      setStep('enter');
    } finally {
      setLoading(false);
    }
  };

  const disableMPIN = async () => {
    Alert.alert('Disable MPIN', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable', style: 'destructive', onPress: async () => {
          try {
            await api.post('/mpin/disable');
            setMpinEnabled(false);
            Alert.alert('Done', 'MPIN has been disabled');
          } catch (e) { Alert.alert('Error', 'Failed to disable MPIN'); }
        },
      },
    ]);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>MPIN Security</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>Setting up MPIN...</Text>
        </View>
      ) : (
        <View style={styles.pinContainer}>
          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: mpinEnabled ? '#22C55E20' : colors.card }]}>
            <Ionicons name={mpinEnabled ? 'shield-checkmark' : 'shield-outline'} size={20} color={mpinEnabled ? '#22C55E' : colors.textSecondary} />
            <Text style={[styles.statusLabel, { color: mpinEnabled ? '#22C55E' : colors.textSecondary }]}>
              MPIN is {mpinEnabled ? 'enabled' : 'not set'}
            </Text>
          </View>

          {/* Lock icon */}
          <View style={[styles.lockIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="lock-closed" size={36} color={colors.primary} />
          </View>

          {/* Instructions */}
          <Text style={[styles.pinTitle, { color: colors.text }]}>
            {step === 'enter' ? 'Set your 4-digit MPIN' : 'Confirm your MPIN'}
          </Text>
          <Text style={[styles.pinSubtitle, { color: colors.textSecondary }]}>
            {step === 'enter' ? 'This PIN will be used to unlock the app' : 'Re-enter your PIN to confirm'}
          </Text>

          {/* PIN Dots */}
          <View style={styles.dotsRow}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
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

          {/* Numpad */}
          <View style={styles.numpad}>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'del']].map((row, ri) => (
              <View key={ri} style={styles.numpadRow}>
                {row.map((digit, di) => (
                  <TouchableOpacity
                    key={di}
                    style={[
                      styles.numpadKey,
                      { backgroundColor: digit ? colors.card : 'transparent' },
                    ]}
                    onPress={() => {
                      if (digit === 'del') handleDelete();
                      else if (digit) handleDigit(digit);
                    }}
                    disabled={!digit}
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

          {/* Disable button */}
          {mpinEnabled && (
            <TouchableOpacity style={[styles.disableBtn, { borderColor: '#EF4444' }]} onPress={disableMPIN}>
              <Text style={[styles.disableBtnText, { color: '#EF4444' }]}>Disable MPIN</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  statusText: { marginTop: 12, fontSize: 14 },
  pinContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 24 },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  lockIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  pinTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  pinSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 28 },
  dotsRow: { flexDirection: 'row', gap: 18, marginBottom: 36 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  numpad: { width: '100%', maxWidth: 280 },
  numpadRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 14 },
  numpadKey: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  numpadDigit: { fontSize: 26, fontWeight: '600' },
  disableBtn: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  disableBtnText: { fontSize: 14, fontWeight: '600' },
});
