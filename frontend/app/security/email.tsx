import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Step = 'email' | 'otp' | 'confirm';

export default function ChangeEmailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [currentEmail, setCurrentEmail] = useState('john.doe@email.com');
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = emailRegex.test(newEmail);
  const emailsMatch = newEmail === confirmEmail && confirmEmail.length > 0;

  const handleSendOTP = () => {
    if (!isValidEmail) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    setStep('otp');
    Alert.alert('Success', 'OTP sent to your email', [{ text: 'OK' }]);
  };

  const handleVerifyOTP = () => {
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    setStep('confirm');
  };

  const handleUpdate = () => {
    if (!emailsMatch) {
      Alert.alert('Error', 'Emails do not match');
      return;
    }
    Alert.alert('Success', 'Email updated successfully', [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Change Email</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons name="mail" size={48} color="#FFF" />
          <Text style={styles.heroTitle}>Change Email Address</Text>
          <Text style={styles.heroSubtitle}>Update your email to receive important notifications</Text>
        </LinearGradient>

        {/* Current Email */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Current Email</Text>
          <View style={[styles.displayField, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.displayValue, { color: colors.text }]}>{currentEmail}</Text>
          </View>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {['email', 'otp', 'confirm'].map((s, idx) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.stepDot, { backgroundColor: (step === s || (['otp', 'confirm'].includes(step) && ['email'].includes(s))) ? colors.primary : colors.border }]} />
              {idx < 2 && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        {/* New Email */}
        {(step === 'email' || step === 'otp' || step === 'confirm') && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>New Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter new email"
              placeholderTextColor={colors.textSecondary}
              value={newEmail}
              onChangeText={setNewEmail}
              editable={step === 'email'}
              keyboardType="email-address"
            />
            {newEmail && (
              <View style={styles.ruleItem}>
                <Ionicons name={(isValidEmail ? 'checkmark-circle' : 'close-circle') as any} size={16} color={isValidEmail ? '#22C55E' : '#EF4444'} />
                <Text style={[styles.ruleText, { color: isValidEmail ? '#22C55E' : '#EF4444' }]}>Valid email format</Text>
              </View>
            )}
          </View>
        )}

        {/* OTP Verification */}
        {(step === 'otp' || step === 'confirm') && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Enter OTP</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>We sent a 6-digit OTP to your new email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor={colors.textSecondary}
              value={otp}
              onChangeText={setOtp}
              editable={step === 'otp'}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
        )}

        {/* Confirm Email */}
        {step === 'confirm' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Re-enter new email"
              placeholderTextColor={colors.textSecondary}
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              keyboardType="email-address"
            />
            {confirmEmail && (
              <View style={styles.ruleItem}>
                <Ionicons name={(emailsMatch ? 'checkmark-circle' : 'close-circle') as any} size={16} color={emailsMatch ? '#22C55E' : '#EF4444'} />
                <Text style={[styles.ruleText, { color: emailsMatch ? '#22C55E' : '#EF4444' }]}>Emails match</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Button */}
        {step === 'email' && (
          <TouchableOpacity style={[styles.updateBtn, { backgroundColor: colors.primary }]} onPress={handleSendOTP}>
            <Text style={styles.updateBtnText}>Send OTP</Text>
          </TouchableOpacity>
        )}
        {step === 'otp' && (
          <TouchableOpacity style={[styles.updateBtn, { backgroundColor: colors.primary }]} onPress={handleVerifyOTP}>
            <Text style={styles.updateBtnText}>Verify OTP</Text>
          </TouchableOpacity>
        )}
        {step === 'confirm' && (
          <TouchableOpacity style={[styles.updateBtn, { backgroundColor: colors.primary }]} onPress={handleUpdate}>
            <Text style={styles.updateBtnText}>Update Email</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },

  heroCard: { borderRadius: 16, paddingVertical: 30, alignItems: 'center', marginBottom: 20, gap: 8 },
  heroTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '400', textAlign: 'center' },

  card: { borderRadius: 14, padding: 16, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  hint: { fontSize: 12, fontWeight: '400', marginBottom: 8 },

  displayField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  displayValue: { fontSize: 14, fontWeight: '500' },

  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontWeight: '500', marginBottom: 12 },

  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 20, gap: 0 },
  stepDot: { width: 12, height: 12, borderRadius: 6 },
  stepLine: { width: 40, height: 2, marginHorizontal: 0 },

  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 12, fontWeight: '400' },

  updateBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  updateBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
