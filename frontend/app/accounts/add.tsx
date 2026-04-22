import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { ACCOUNT_TYPE_META } from '../../utils/formatINR';

const ACCOUNT_TYPES = [
  { key: 'bank', label: 'Bank Account', icon: 'business-outline', color: '#448AFF' },
  { key: 'cash', label: 'Cash', icon: 'cash-outline', color: '#00E676' },
  { key: 'upi', label: 'UPI', icon: 'phone-portrait-outline', color: '#7C4DFF' },
  { key: 'credit_card', label: 'Credit Card', icon: 'card-outline', color: '#FF9100' },
  { key: 'wallet', label: 'Wallet', icon: 'wallet-outline', color: '#F59E0B' },
];

const OWNERSHIP_TYPES = [
  { key: 'individual', label: 'Individual', icon: 'person-outline', color: '#5B2FBF' },
  { key: 'joint', label: 'Joint', icon: 'people-outline', color: '#3B82F6' },
  { key: 'business', label: 'Business', icon: 'briefcase-outline', color: '#14B8A6' },
];

export default function AddAccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('bank');
  const [ownershipType, setOwnershipType] = useState('individual');
  const [institution, setInstitution] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter an account name');
      return;
    }

    setSaving(true);
    try {
      await api.post('/accounts', {
        name: name.trim(),
        account_type: accountType,
        ownership_type: ownershipType,
        institution: institution.trim() || null,
        initial_balance: parseFloat(initialBalance) || 0,
        account_number: accountNumber.trim() || null,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add Account</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Account Type */}
          <Text style={[styles.label, { color: colors.text }]}>Account Type</Text>
          <View style={styles.typeGrid}>
            {ACCOUNT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  accountType === type.key && { borderColor: type.color, borderWidth: 2 },
                ]}
                onPress={() => setAccountType(type.key)}
              >
                <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                  <Ionicons name={type.icon as any} size={24} color={type.color} />
                </View>
                <Text style={[styles.typeLabel, { color: colors.text }]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Ownership Type */}
          <Text style={[styles.label, { color: colors.text }]}>Ownership</Text>
          <View style={styles.ownershipRow}>
            {OWNERSHIP_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.ownershipChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  ownershipType === type.key && { borderColor: type.color, borderWidth: 2, backgroundColor: type.color + '10' },
                ]}
                onPress={() => setOwnershipType(type.key)}
              >
                <Ionicons name={type.icon as any} size={16} color={ownershipType === type.key ? type.color : colors.textSecondary} />
                <Text style={[styles.ownershipLabel, { color: ownershipType === type.key ? type.color : colors.text }]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Account Name */}
          <Text style={[styles.label, { color: colors.text }]}>Account Name</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g., HDFC Savings"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Initial Balance */}
          <Text style={[styles.label, { color: colors.text }]}>Current Balance</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>₹</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={initialBalance}
              onChangeText={setInitialBalance}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Account Number (Optional) */}
          <Text style={[styles.label, { color: colors.text }]}>Account Number (Optional)</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Last 4 digits"
              placeholderTextColor={colors.textSecondary}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
              maxLength={20}
            />
          </View>

          {/* Institution (Optional) */}
          <Text style={[styles.label, { color: colors.text }]}>Institution / Provider (Optional)</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g., HDFC Bank, Paytm"
              placeholderTextColor={colors.textSecondary}
              value={institution}
              onChangeText={setInstitution}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Add Account</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  ownershipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ownershipChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  ownershipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  saveButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
