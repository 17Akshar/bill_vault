import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordRules = {
    length: newPassword.length >= 8 && newPassword.length <= 20,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[!@#$%^&*]/.test(newPassword),
  };

  const allRulesMet = Object.values(passwordRules).every(r => r);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const validate = () => {
    if (!currentPassword.trim()) { Alert.alert('Error', 'Please enter current password'); return false; }
    if (!allRulesMet) { Alert.alert('Error', 'Password does not meet all requirements'); return false; }
    if (!passwordsMatch) { Alert.alert('Error', 'Passwords do not match'); return false; }
    return true;
  };

  const handleUpdate = () => {
    if (!validate()) return;
    Alert.alert('Success', 'Password updated successfully', [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons name="lock-closed" size={48} color="#FFF" />
          <Text style={styles.heroTitle}>Change Password</Text>
          <Text style={styles.heroSubtitle}>Create a strong password to keep your account secure</Text>
        </LinearGradient>

        {/* Current Password */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Current Password</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
              <Ionicons name={showCurrent ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>New Password</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
              <Ionicons name={showNew ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Rules */}
          <View style={styles.rules}>
            {[
              { label: '8 to 20 characters', pass: passwordRules.length, icon: 'lock-closed-outline' },
              { label: 'Uppercase letter', pass: passwordRules.uppercase, icon: 'text-outline' },
              { label: 'Lowercase letter', pass: passwordRules.lowercase, icon: 'text-outline' },
              { label: 'Number', pass: passwordRules.number, icon: 'numbers-outline' },
              { label: 'Special character', pass: passwordRules.special, icon: 'key-outline' },
            ].map((rule, idx) => (
              <View key={idx} style={styles.ruleItem}>
                <Ionicons name={(rule.pass ? 'checkmark-circle' : 'circle-outline') as any} size={16} color={rule.pass ? '#22C55E' : colors.textSecondary} />
                <Text style={[styles.ruleText, { color: rule.pass ? '#22C55E' : colors.textSecondary }]}>{rule.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Confirm Password */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm New Password</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {confirmPassword && (
            <View style={{ marginTop: 8 }}>
              <View style={styles.ruleItem}>
                <Ionicons name={passwordsMatch ? 'checkmark-circle' : 'close-circle'} size={16} color={passwordsMatch ? '#22C55E' : '#EF4444'} />
                <Text style={[styles.ruleText, { color: passwordsMatch ? '#22C55E' : '#EF4444' }]}>Passwords match</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={[styles.updateBtn, { backgroundColor: colors.primary }]} onPress={handleUpdate}>
          <Text style={styles.updateBtnText}>Update Password</Text>
        </TouchableOpacity>

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

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, gap: 10, marginBottom: 12 },
  input: { flex: 1, fontSize: 14, fontWeight: '500', color: '#FFF' },

  rules: { gap: 8 },
  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 12, fontWeight: '400' },

  updateBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  updateBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
