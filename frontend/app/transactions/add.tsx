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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_TYPES,
} from '../../utils/formatINR';
import DateTimePicker from '@react-native-community/datetimepicker';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';
import { FamilyMemberPicker } from '../../components/FamilyMemberSelector';
import LabelsInput from '../../components/LabelsInput';
import AttachmentPicker from '../../components/AttachmentPicker';
import {
  CategoryGrid,
  SubCategoryChips,
  AccountPickerButton,
  AccountPickerModal,
  PaymentTypeRow,
} from '../../components/transactions/atoms';

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const { colors, isDark } = useTheme();

  const [txType, setTxType] = useState<'income' | 'expense' | 'transfer'>(
    (params.type as 'income' | 'expense' | 'transfer') || 'expense'
  );
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [familyMemberId, setFamilyMemberId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  // Transfer-only: destination account
  const [toAccountId, setToAccountId] = useState('');
  const [showToAccountPicker, setShowToAccountPicker] = useState(false);
  const [paymentType, setPaymentType] = useState('bank');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subCategory, setSubCategory] = useState('');

  // Optional UI fields per design spec — Income/Expense/Transfer
  const [labels, setLabels] = useState<string[]>([]);
  const [payee, setPayee] = useState('');
  const [location, setLocation] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
      if (res.data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(res.data[0].account_id);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const categories = txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Required', 'Please enter a valid amount');
      return;
    }
    // Transfer has its own validation set
    if (txType === 'transfer') {
      if (!selectedAccountId) {
        Alert.alert('Required', 'Please select a From Account');
        return;
      }
      if (!toAccountId) {
        Alert.alert('Required', 'Please select a To Account');
        return;
      }
      if (selectedAccountId === toAccountId) {
        Alert.alert('Invalid Transfer', 'From Account and To Account must be different');
        return;
      }
    } else {
      if (!category) {
        Alert.alert('Required', 'Please select a category');
        return;
      }
      if (!selectedAccountId) {
        Alert.alert('Required', 'Please select an account. Create one first if you haven\'t.');
        return;
      }
      if (!description.trim()) {
        Alert.alert('Required', 'Please enter a description');
        return;
      }
    }

    setSaving(true);
    try {
      if (txType === 'income') {
        await api.post('/income', {
          account_id: selectedAccountId,
          amount: parseFloat(amount),
          category,
          sub_category: subCategory || null,
          source: description.trim(),
          date: date.toISOString(),
          notes: notes.trim() || null,
          family_member_id: familyMemberId,
          labels: labels.length ? labels : null,
          location: location.trim() || null,
          attachment_url: attachmentUrl || null,
        });
      } else if (txType === 'expense') {
        await api.post('/expenses', {
          account_id: selectedAccountId,
          amount: parseFloat(amount),
          category,
          sub_category: subCategory || null,
          payment_type: paymentType,
          description: description.trim(),
          date: date.toISOString(),
          notes: notes.trim() || null,
          family_member_id: familyMemberId,
          labels: labels.length ? labels : null,
          payee: payee.trim() || null,
          location: location.trim() || null,
          attachment_url: attachmentUrl || null,
        });
      } else {
        // Transfer
        await api.post('/transfers', {
          amount: parseFloat(amount),
          from_account_id: selectedAccountId,
          to_account_id: toAccountId,
          date: date.toISOString(),
          notes: notes.trim() || null,
          family_member_id: familyMemberId,
          labels: labels.length ? labels : null,
          payee: payee.trim() || null,
          payment_type: paymentType,
          location: location.trim() || null,
          attachment_url: attachmentUrl || null,
        });
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const selectedAccount = accounts.find(a => a.account_id === selectedAccountId);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {txType === 'income' ? 'Add Income' : txType === 'expense' ? 'Add Expense' : 'New Transfer'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Type Toggle */}
          <View style={[styles.typeToggle, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                txType === 'income' && { backgroundColor: '#00E676' },
              ]}
              onPress={() => { setTxType('income'); setCategory(''); setSubCategory(''); }}
            >
              <Ionicons
                name="arrow-up-circle"
                size={20}
                color={txType === 'income' ? '#000' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: txType === 'income' ? '#000' : colors.textSecondary },
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                txType === 'expense' && { backgroundColor: '#FF5252' },
              ]}
              onPress={() => { setTxType('expense'); setCategory(''); setSubCategory(''); }}
            >
              <Ionicons
                name="arrow-down-circle"
                size={20}
                color={txType === 'expense' ? '#FFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: txType === 'expense' ? '#FFF' : colors.textSecondary },
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="tx-type-transfer"
              style={[
                styles.typeBtn,
                txType === 'transfer' && { backgroundColor: '#4D9EFF' },
              ]}
              onPress={() => { setTxType('transfer'); setCategory(''); setSubCategory(''); }}
            >
              <Ionicons
                name="swap-horizontal"
                size={20}
                color={txType === 'transfer' ? '#FFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: txType === 'transfer' ? '#FFF' : colors.textSecondary },
                ]}
              >
                Transfer
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <Text style={[styles.label, { color: colors.text }]}>Amount</Text>
          <View style={[styles.amountWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.rupeeSymbol, { color: txType === 'income' ? '#00E676' : '#FF5252' }]}>
              ₹
            </Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Description / Source */}
          {/* Source / Description / Category / SubCategory — NOT shown in Transfer mode */}
          {txType !== 'transfer' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>
                {txType === 'income' ? 'Source' : 'Description'}
              </Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={txType === 'income' ? 'e.g., Company Ltd' : 'e.g., Groceries at BigBazar'}
                  placeholderTextColor={colors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* Category */}
              <Text style={[styles.label, { color: colors.text }]}>Category</Text>
              <CategoryGrid
                categories={categories}
                selectedKey={category}
                onSelect={(key) => { setCategory(key); setSubCategory(''); }}
                accentColor={txType === 'income' ? '#00E676' : '#FF5252'}
                colors={colors}
              />

              {/* Sub-Category Picker */}
              {category && (() => {
                const selectedCat = categories.find(c => c.key === category);
                const subs = (selectedCat as any)?.subs || [];
                if (subs.length === 0) return null;
                const accentColor = txType === 'income' ? '#00E676' : '#FF5252';
                return (
                  <>
                    <Text style={[styles.label, { color: colors.text }]}>Sub-Category (Optional)</Text>
                    <SubCategoryChips
                      options={subs}
                      selected={subCategory}
                      onToggle={setSubCategory}
                      accentColor={accentColor}
                      colors={colors}
                    />
                  </>
                );
              })()}
            </>
          )}

          {/* Account Picker — labeled "From Account" in Transfer mode */}
          <Text style={[styles.label, { color: colors.text }]}>
            {txType === 'transfer' ? 'From Account' : 'Account'}
          </Text>
          <AccountPickerButton
            account={selectedAccount}
            onPress={() => setShowAccountPicker(true)}
            placeholder="Select account"
            colors={colors}
            testID="tx-from-account-picker"
          />

          {/* To Account picker — Transfer mode only */}
          {txType === 'transfer' && (() => {
            const toAccount = accounts.find(a => a.account_id === toAccountId);
            return (
              <>
                <Text style={[styles.label, { color: colors.text }]}>To Account</Text>
                <AccountPickerButton
                  account={toAccount}
                  onPress={() => setShowToAccountPicker(true)}
                  placeholder="Select destination account"
                  colors={colors}
                  testID="tx-to-account-picker"
                />
                {selectedAccountId && toAccountId && selectedAccountId === toAccountId && (
                  <Text style={{ color: '#FF5252', fontSize: 12, marginTop: -4, marginBottom: 8 }}>
                    From and To accounts must be different
                  </Text>
                )}
              </>
            );
          })()}

          {/* Payment Type (Expense + Transfer) */}
          {(txType === 'expense' || txType === 'transfer') && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Payment Type</Text>
              <PaymentTypeRow
                paymentTypes={PAYMENT_TYPES}
                selected={paymentType}
                onSelect={setPaymentType}
                colors={colors}
              />
            </>
          )}

          {/* For Whom */}
          <FamilyMemberPicker
            selectedId={familyMemberId}
            onSelect={(id) => setFamilyMemberId(id)}
            colors={colors}
            label="For whom?"
          />

          {/* Date */}
          <Text style={[styles.label, { color: colors.text }]}>Date</Text>
          <CrossPlatformPicker
            value={date}
            onChange={(d) => setDate(d)}
            mode="date"
            label="Select Date"
            colors={colors}
          />

          {/* Notes */}
          <Text style={[styles.label, { color: colors.text }]}>Notes (Optional)</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card, height: 80 }]}>
            <TextInput
              style={[styles.input, { color: colors.text, textAlignVertical: 'top' }]}
              placeholder="Add notes..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Payee — Expense + Transfer */}
          {(txType === 'expense' || txType === 'transfer') && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Payee (Optional)</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  testID="tx-payee-input"
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g., Amazon, John Doe"
                  placeholderTextColor={colors.textSecondary}
                  value={payee}
                  onChangeText={setPayee}
                />
              </View>
            </>
          )}

          {/* Labels — all types */}
          <Text style={[styles.label, { color: colors.text }]}>Labels (Optional)</Text>
          <LabelsInput value={labels} onChange={setLabels} colors={colors} />

          {/* Location — all types */}
          <Text style={[styles.label, { color: colors.text }]}>Location (Optional)</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons
              name="location-outline"
              size={18}
              color={colors.textSecondary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              testID="tx-location-input"
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g., Big Bazaar, Mumbai"
              placeholderTextColor={colors.textSecondary}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Attachment — all types */}
          <Text style={[styles.label, { color: colors.text }]}>Attachment (Optional)</Text>
          <AttachmentPicker
            value={attachmentUrl}
            onChange={setAttachmentUrl}
            colors={colors}
          />

          {/* Save */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: txType === 'income' ? '#00E676' : '#FF5252' },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.saveButtonText, { color: txType === 'income' ? '#000' : '#FFF' }]}>
                {txType === 'income' ? 'Add Income' :
                 txType === 'expense' ? 'Add Expense' : 'Save Transfer'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Picker Modal */}
      <AccountPickerModal
        visible={showAccountPicker}
        title="Select Account"
        accounts={accounts}
        selectedId={selectedAccountId}
        onSelect={(id) => { setSelectedAccountId(id); setShowAccountPicker(false); }}
        onClose={() => setShowAccountPicker(false)}
        emptyMessage="No accounts found. Create one first."
        emptyAction={{
          label: 'Create Account',
          onPress: () => { setShowAccountPicker(false); router.push('/accounts/add' as any); },
        }}
        colors={colors}
      />

      {/* To Account picker modal — Transfer mode */}
      <AccountPickerModal
        visible={showToAccountPicker}
        title="Select Destination Account"
        accounts={accounts.filter(a => a.account_id !== selectedAccountId)}
        selectedId={toAccountId}
        onSelect={(id) => { setToAccountId(id); setShowToAccountPicker(false); }}
        onClose={() => setShowToAccountPicker(false)}
        emptyMessage={
          accounts.length < 2
            ? 'You need at least 2 accounts to transfer. Create another one first.'
            : 'Pick a different From Account first.'
        }
        itemTestIdPrefix="to-account-item-"
        colors={colors}
      />
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
    marginBottom: 20,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 11,
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 16,
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 64,
  },
  rupeeSymbol: {
    fontSize: 28,
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
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
    fontSize: 17,
    fontWeight: '700',
  },
});
