import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SecurityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const securityItems = [
    { icon: 'person-outline', label: 'User ID', value: 'john doe123', route: '/security/user-id' },
    { icon: 'lock-closed-outline', label: 'Password', value: '••••••••', route: '/security/password' },
    { icon: 'mail-outline', label: 'Email ID', value: 'john.doe@email.com', route: '/security/email' },
    { icon: 'phone-portrait-outline', label: 'Mobile Number', value: '+91 98765 43210', route: '/security/mobile' },
    { icon: 'shield-outline', label: 'MPIN (App PIN)', value: '••••', route: '/security/mpin' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero Section */}
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons name="shield-checkmark" size={48} color="#FFF" />
          <Text style={styles.heroTitle}>Manage your account security and keep information safe</Text>
        </LinearGradient>

        {/* Security Settings */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>SECURITY SETTINGS</Text>

          {securityItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: idx < securityItems.length - 1 ? 1 : 0 }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{item.value}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Additional Security */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>ADDITIONAL SECURITY</Text>

          {[
            { icon: 'finger-print-outline', label: 'Biometric Login', desc: 'Use fingerprint or face ID', value: biometricEnabled, onChange: setBiometricEnabled },
            { icon: 'alert-circle-outline', label: 'Login Alerts', desc: 'Get notified on new logins', value: loginAlertsEnabled, onChange: setLoginAlertsEnabled },
            { icon: 'shield-outline', label: 'Two-Factor Authentication', desc: 'Add extra layer of security', value: twoFactorEnabled, onChange: setTwoFactorEnabled },
          ].map((item, idx) => (
            <View
              key={idx}
              style={[styles.toggleRow, { borderBottomColor: colors.border, borderBottomWidth: idx < 2 ? 1 : 0 }]}
            >
              <View style={styles.toggleLeft}>
                <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                </View>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          ))}
        </View>

        {/* Security Info Card */}
        <View style={[styles.infoCard, { backgroundColor: '#EF444415', borderColor: '#EF444430', borderWidth: 1 }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
          <Text style={[styles.infoText, { color: '#EF4444' }]}>Never share your MPIN, password or OTP with anyone. We will never ask for these details.</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: '#EF4444' }]}
          onPress={() => Alert.alert('Logout', 'Are you sure you want to logout?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout', style: 'destructive' }])}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={[styles.logoutBtnText, { color: '#EF4444' }]}>Logout</Text>
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

  heroCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, gap: 12 },
  heroTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', textAlign: 'center', lineHeight: 22 },

  section: { borderRadius: 16, padding: 0, marginBottom: 16, overflow: 'hidden' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 14, marginBottom: 0 },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  settingValue: { fontSize: 11, fontWeight: '400' },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  toggleDesc: { fontSize: 11, fontWeight: '400' },

  infoCard: { borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
  infoText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },

  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, gap: 8 },
  logoutBtnText: { fontSize: 14, fontWeight: '700' },
});
