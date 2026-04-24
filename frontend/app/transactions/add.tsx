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
  Modal,
  FlatList,
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
  ACCOUNT_TYPE_META,
  formatINR,
} from '../../utils/formatINR';
import DateTimePicker from '@react-native-community/datetimepicker';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';
import { FamilyMemberPicker } from '../../components/FamilyMemberSelector';

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const { colors, isDark } = useTheme();

  const [txType, setTxType] = useState<'income' | 'expense'>(
    (params.type as 'income' | 'expense') || 'expense'
  );
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [familyMemberId, setFamilyMemberId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [paymentType, setPaymentType] = useState('bank');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subCategory, setSubCategory] = useState('');

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
        });
      } else {
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
        });
      }
      router.back();
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add Transaction</Text>
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
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  category === cat.key && {
                    borderColor: txType === 'income' ? '#00E676' : '#FF5252',
                    borderWidth: 2,
                    backgroundColor: txType === 'income' ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)',
                  },
                ]}
                onPress={() => { setCategory(cat.key); setSubCategory(''); }}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={18}
                  color={category === cat.key ? (txType === 'income' ? '#00E676' : '#FF5252') : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: category === cat.key ? colors.text : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sub-Category Picker */}
          {category && (() => {
            const selectedCat = categories.find(c => c.key === category);
            const subs = (selectedCat as any)?.subs || [];
            if (subs.length === 0) return null;
            const accentColor = txType === 'income' ? '#00E676' : '#FF5252';
            return (
              <>
                <Text style={[styles.label, { color: colors.text }]}>Sub-Category (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {subs.map((sub: string) => (
                    <TouchableOpacity
                      key={sub}
                      style={[
                        styles.subCatChip,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        subCategory === sub && {
                          borderColor: accentColor,
                          borderWidth: 2,
                          backgroundColor: accentColor + '18',
                        },
                      ]}
                      onPress={() => setSubCategory(subCategory === sub ? '' : sub)}
                    >
                      <Text
                        style={{
                          color: subCategory === sub ? accentColor : colors.textSecondary,
                          fontSize: 12,
                          fontWeight: subCategory === sub ? '600' : '400',
                        }}
                      >
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            );
          })()}

          {/* Account Picker */}
          <Text style={[styles.label, { color: colors.text }]}>Account</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setShowAccountPicker(true)}
          >
            {selectedAccount ? (
              <View style={styles.pickerContent}>
                <Ionicons
                  name={(ACCOUNT_TYPE_META[selectedAccount.account_type]?.icon || 'business-outline') as any}
                  size={20}
                  color={ACCOUNT_TYPE_META[selectedAccount.account_type]?.color || colors.text}
                />
                <Text style={[styles.pickerText, { color: colors.text }]}>
                  {selectedAccount.name}
                </Text>
                <Text style={[styles.pickerBalance, { color: colors.textSecondary }]}>
                  {formatINR(selectedAccount.balance)}
                </Text>
              </View>
            ) : (
              <Text style={[styles.pickerText, { color: colors.textSecondary }]}>Select account</Text>
            )}
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Payment Type (Expense only) */}
          {txType === 'expense' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Payment Type</Text>
              <View style={styles.paymentTypeRow}>
                {PAYMENT_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt.key}
                    style={[
                      styles.paymentChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      paymentType === pt.key && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => setPaymentType(pt.key)}
                  >
                    <Ionicons name={pt.icon as any} size={16} color={paymentType === pt.key ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.paymentLabel, { color: paymentType === pt.key ? colors.text : colors.textSecondary }]}>
                      {pt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
                {txType === 'income' ? 'Add Income' : 'Add Expense'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Picker Modal */}
      <Modal visible={showAccountPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Account</Text>
              <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {accounts.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={[styles.modalEmptyText, { color: colors.textSecondary }]}>
                  No accounts found. Create one first.
                </Text>
                <TouchableOpacity
                  style={[styles.modalCreateBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setShowAccountPicker(false);
                    router.push('/accounts/add' as any);
                  }}
                >
                  <Text style={styles.modalCreateBtnText}>Create Account</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={accounts}
                keyExtractor={(item) => item.account_id}
                renderItem={({ item }) => {
                  const meta = ACCOUNT_TYPE_META[item.account_type] || ACCOUNT_TYPE_META.bank;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        { borderBottomColor: colors.border },
                        selectedAccountId === item.account_id && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => {
                        setSelectedAccountId(item.account_id);
                        setShowAccountPicker(false);
                      }}
                    >
                      <View style={[styles.modalItemIcon, { backgroundColor: meta.color + '20' }]}>
                        <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                      </View>
                      <View style={styles.modalItemInfo}>
                        <Text style={[styles.modalItemName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.modalItemType, { color: colors.textSecondary }]}>{meta.label}</Text>
                      </View>
                      <Text style={[styles.modalItemBalance, { color: colors.text }]}>
                        {formatINR(item.balance)}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerText: {
    fontSize: 16,
  },
  pickerBalance: {
    fontSize: 13,
  },
  paymentTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  subCatChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  modalEmptyText: {
    fontSize: 14,
  },
  modalCreateBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalCreateBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalItemType: {
    fontSize: 12,
  },
  modalItemBalance: {
    fontSize: 15,
    fontWeight: '600',
  },
});
