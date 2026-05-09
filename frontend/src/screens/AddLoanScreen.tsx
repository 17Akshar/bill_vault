import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  FONT_WEIGHTS,
  SHADOWS,
} from '../constants/theme';
import { CurrencyInput } from '../components/CurrencyInput';
import { api } from '../services/api';

interface AddLoanScreenProps {
  navigation: any;
  route?: any;
}

const PURPOSES = [
  'Personal Loan',
  'Family Help',
  'Business Loan',
  'Friend Help',
  'Emergency',
  'Other',
];

export const AddLoanScreen: React.FC<AddLoanScreenProps> = ({ navigation, route }) => {
  const editLoan = route?.params?.loan;
  const isEdit = !!editLoan;
  const defaultType = route?.params?.defaultType || (editLoan?.type ?? 'lent');

  const [type, setType] = useState<'lent' | 'borrowed'>(defaultType);
  const [personName, setPersonName] = useState<string>(editLoan?.person_name || '');
  const [purpose, setPurpose] = useState<string>(editLoan?.purpose || 'Personal Loan');
  const [showPurposeMenu, setShowPurposeMenu] = useState(false);
  const [amount, setAmount] = useState<number>(editLoan?.amount || 0);
  const [startDate, setStartDate] = useState<Date>(
    editLoan?.start_date ? new Date(editLoan.start_date) : new Date()
  );
  const [dueDate, setDueDate] = useState<Date | null>(
    editLoan?.due_date ? new Date(editLoan.due_date) : null
  );
  const [interestRate, setInterestRate] = useState<string>(
    editLoan?.interest_rate ? String(editLoan.interest_rate) : '0'
  );
  const [notes, setNotes] = useState<string>(editLoan?.notes || '');
  const [currency, setCurrency] = useState<string>('USD');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const b = await api.getBudget();
        if (b?.currency) setCurrency(b.currency);
      } catch {}
    })();
  }, []);

  const handleSave = async () => {
    if (!personName.trim()) {
      Alert.alert('Validation', 'Please enter a person name.');
      return;
    }
    if (!amount || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount.');
      return;
    }

    const payload: any = {
      person_name: personName.trim(),
      type,
      purpose: purpose,
      amount: Number(amount),
      start_date: startDate.toISOString(),
      due_date: dueDate ? dueDate.toISOString() : null,
      interest_rate: parseFloat(interestRate) || 0,
      notes: notes.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.updateLoan(editLoan._id, payload);
        Alert.alert('Updated!', 'Loan updated successfully.', [
          { text: 'OK', onPress: () => navigation?.goBack?.() },
        ]);
      } else {
        await api.createLoan(payload);
        Alert.alert('Saved!', 'New loan recorded.', [
          { text: 'OK', onPress: () => navigation?.goBack?.() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save loan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Entry' : 'Add New'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs Lent | Borrowed */}
      {!isEdit && (
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, type === 'lent' && styles.tabActiveLent]}
            onPress={() => setType('lent')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, type === 'lent' && styles.tabTextActiveLent]}>
              Lent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, type === 'borrowed' && styles.tabActiveBorrowed]}
            onPress={() => setType('borrowed')}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, type === 'borrowed' && styles.tabTextActiveBorrowed]}
            >
              Borrowed
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Person Name */}
          <Text style={styles.label}>Person Name*</Text>
          <View style={styles.inputRow}>
            <Feather name="user" size={18} color={COLORS.textSecondary} />
            <TextInput
              value={personName}
              onChangeText={setPersonName}
              placeholder="Enter name"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.input}
            />
          </View>

          {/* Purpose */}
          <Text style={styles.label}>Purpose</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowPurposeMenu((p) => !p)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>{purpose}</Text>
            <Feather
              name={showPurposeMenu ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
          {showPurposeMenu && (
            <View style={styles.dropdownMenu}>
              {PURPOSES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setPurpose(p);
                    setShowPurposeMenu(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{p}</Text>
                  {purpose === p && (
                    <Feather name="check" size={16} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Amount */}
          <Text style={styles.label}>Amount*</Text>
          <CurrencyInput
            value={amount}
            onChangeValue={(v) => v >= 0 && setAmount(v)}
            currency={currency}
          />

          {/* Start Date */}
          <Text style={styles.label}>Start Date*</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowStartPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>
              {startDate.toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            <Feather name="calendar" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (d) setStartDate(d);
              }}
            />
          )}

          {/* Due Date + Interest */}
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Due Date</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowDuePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownText}>
                  {dueDate
                    ? dueDate.toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Select date'}
                </Text>
                <Feather name="calendar" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {showDuePicker && (
                <DateTimePicker
                  value={dueDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => {
                    setShowDuePicker(Platform.OS === 'ios');
                    if (d) setDueDate(d);
                  }}
                />
              )}
            </View>
            <View style={{ width: 100 }}>
              <Text style={styles.label}>Interest</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={interestRate}
                  onChangeText={setInterestRate}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  style={[styles.input, { paddingLeft: 0 }]}
                />
                <Text style={{ color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.semibold }}>
                  %
                </Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          <Text style={styles.label}>Notes (Optional)</Text>
          <View style={[styles.inputRow, { alignItems: 'flex-start', minHeight: 80 }]}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              style={[styles.input, { minHeight: 64, textAlignVertical: 'top', paddingTop: 8 }]}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Feather name="save" size={18} color={COLORS.white} />
                <Text style={styles.saveBtnText}>{isEdit ? 'Update' : 'Save'}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: SPACING.xs },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActiveLent: { borderBottomColor: COLORS.success },
  tabActiveBorrowed: { borderBottomColor: COLORS.error },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  tabTextActiveLent: { color: COLORS.success, fontWeight: FONT_WEIGHTS.bold },
  tabTextActiveBorrowed: { color: COLORS.error, fontWeight: FONT_WEIGHTS.bold },
  formContent: { padding: SPACING.md },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  dropdownText: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    marginTop: 4,
    ...SHADOWS.sm,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemText: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  row2: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-end' },
  saveBtn: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    ...SHADOWS.md,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});
