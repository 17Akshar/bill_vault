import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Step = 'mobile' | 'otp' | 'confirm';

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
];

export default function ChangeMobileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('mobile');
  const [currentMobile, setCurrentMobile] = useState('+91 98765 43210');
  const [countryCode, setCountryCode] = useState('+91');
  const [newMobile, setNewMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmMobile, setConfirmMobile] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const isValidMobile = /^\d{10}$/.test(newMobile.replace(/\s/g, ''));
  const mobilesMatch = newMobile === confirmMobile && confirmMobile.length > 0;

  const handleSendOTP = () => {
    if (!isValidMobile) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }
    setStep('otp');
    Alert.alert('Success', `OTP sent to ${countryCode} ${newMobile}`, [{ text: 'OK' }]);
  };

  const handleVerifyOTP = () => {
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    setStep('confirm');
  };

  const handleUpdate = () => {
    if (!mobilesMatch) {
      Alert.alert('Error', 'Mobile numbers do not match');
      return;
    }
    Alert.alert('Success', 'Mobile number updated successfully', [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Change Mobile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons name="phone-portrait" size={48} color="#FFF" />
          <Text style={styles.heroTitle}>Change Mobile Number</Text>
          <Text style={styles.heroSubtitle}>Update your mobile to receive OTP and notifications</Text>
        </LinearGradient>

        {/* Current Mobile */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Current Mobile Number</Text>
          <View style={[styles.displayField, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="phone-portrait-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.displayValue, { color: colors.text }]}>{currentMobile}</Text>
          </View>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {['mobile', 'otp', 'confirm'].map((s, idx) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.stepDot, { backgroundColor: (step === s || (['otp', 'confirm'].includes(step) && ['mobile'].includes(s))) ? colors.primary : colors.border }]} />
              {idx < 2 && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        {/* New Mobile */}
        {(step === 'mobile' || step === 'otp' || step === 'confirm') && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>New Mobile Number</Text>

            {/* Country Code Selector */}
            <TouchableOpacity
              style={[styles.countryCodeBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowCountryDropdown(!showCountryDropdown)}
              disabled={step !== 'mobile'}
            >
              <Text style={[styles.countryCodeText, { color: colors.text }]}>
                {COUNTRY_CODES.find(c => c.code === countryCode)?.flag} {countryCode}
              </Text>
              <Ionicons name={showCountryDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Country Dropdown */}
            {showCountryDropdown && step === 'mobile' && (
              <View style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {COUNTRY_CODES.map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setCountryCode(item.code);
                      setShowCountryDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                      {item.flag} {item.code} ({item.country})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Phone Number Input */}
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter 10-digit number"
              placeholderTextColor={colors.textSecondary}
              value={newMobile}
              onChangeText={setNewMobile}
              editable={step === 'mobile'}
              keyboardType="phone-pad"
              maxLength={10}
            />

            {newMobile && (
              <View style={styles.ruleItem}>
                <Ionicons name={(isValidMobile ? 'checkmark-circle' : 'close-circle') as any} size={16} color={isValidMobile ? '#22C55E' : '#EF4444'} />
                <Text style={[styles.ruleText, { color: isValidMobile ? '#22C55E' : '#EF4444' }]}>10-digit number required</Text>
              </View>
            )}
          </View>
        )}

        {/* OTP Verification */}
        {(step === 'otp' || step === 'confirm') && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Enter OTP</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>We sent a 6-digit OTP to {countryCode} {newMobile}</Text>
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

        {/* Confirm Mobile */}
        {step === 'confirm' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Mobile Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Re-enter mobile number"
              placeholderTextColor={colors.textSecondary}
              value={confirmMobile}
              onChangeText={setConfirmMobile}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {confirmMobile && (
              <View style={styles.ruleItem}>
                <Ionicons name={(mobilesMatch ? 'checkmark-circle' : 'close-circle') as any} size={16} color={mobilesMatch ? '#22C55E' : '#EF4444'} />
                <Text style={[styles.ruleText, { color: mobilesMatch ? '#22C55E' : '#EF4444' }]}>Numbers match</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Button */}
        {step === 'mobile' && (
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
            <Text style={styles.updateBtnText}>Update Mobile</Text>
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

  countryCodeBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  countryCodeText: { fontSize: 14, fontWeight: '500' },

  dropdown: { borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  dropdownItemText: { fontSize: 13, fontWeight: '400' },

  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontWeight: '500', marginBottom: 12 },

  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 20, gap: 0 },
  stepDot: { width: 12, height: 12, borderRadius: 6 },
  stepLine: { width: 40, height: 2, marginHorizontal: 0 },

  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 12, fontWeight: '400' },

  updateBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  updateBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
