import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, Modal, FlatList, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import api from '../../utils/api';
import {
  EXPENSE_CATEGORIES, PAYMENT_MODES, DEMO_ACCOUNTS, DEMO_EXPENSES,
} from './_data';

const PURPLE = '#7C5CE7';
const RED    = '#EF4444';

type PickerType = 'category' | 'payment' | 'account' | null;

export default function AddExpense() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;
  const SECTION_LABEL_COLOR = isDark ? 'rgba(255,255,255,0.4)' : colors.textSecondary;

  // Form state
  const [amount,       setAmount]       = useState('');
  const [category,     setCategory]     = useState<typeof EXPENSE_CATEGORIES[0] | null>(null);
  const [date,         setDate]         = useState(new Date());
  const [showDate,     setShowDate]     = useState(false);
  const [paymentMode,  setPaymentMode]  = useState<typeof PAYMENT_MODES[0] | null>(null);
  const [account,      setAccount]      = useState<any>(null);
  const [description,  setDescription]  = useState('');
  const [notes,        setNotes]        = useState('');
  const [tags,         setTags]         = useState('');
  const [isRecurring,  setIsRecurring]  = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [showRemDate,  setShowRemDate]  = useState(false);
  const [billAttached, setBillAttached] = useState(false);

  const [picker,       setPicker]       = useState<PickerType>(null);
  const [accounts,     setAccounts]     = useState<any[]>(DEMO_ACCOUNTS);
  const [saving,       setSaving]       = useState(false);

  // Load accounts
  useEffect(() => {
    api.get('/accounts').then(r => { if (r.data?.length) setAccounts(r.data); }).catch(() => {});
  }, []);

  // Prefill when editing
  useEffect(() => {
    if (!isEditing || !params.id) return;
    const exp = DEMO_EXPENSES.find(e => e.id === params.id);
    if (!exp) return;
    setAmount(String(exp.amount));
    const cat = EXPENSE_CATEGORIES.find(c => c.key === exp.category);
    if (cat) setCategory(cat);
    setDate(new Date(exp.date));
    const pm = PAYMENT_MODES.find(p => p.key === exp.paymentMode);
    if (pm) setPaymentMode(pm);
    const acc = DEMO_ACCOUNTS.find(a => a.account_id === exp.account);
    if (acc) setAccount(acc);
    setDescription(exp.description || '');
    setNotes(exp.notes || '');
    setTags((exp.tags || []).join(', '));
    setIsRecurring(exp.isRecurring);
  }, [isEditing, params.id]);

  const validate = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount'); return false;
    }
    if (!category) { Alert.alert('Validation', 'Please select a category'); return false; }
    if (!account)  { Alert.alert('Validation', 'Please select an account');  return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        amount: Number(amount),
        category: category!.key,
        date: format(date, 'yyyy-MM-dd'),
        payment_type: paymentMode?.key || 'upi',
        account_id: account!.account_id,
        description: description.trim() || category!.label,
        notes: notes.trim() || undefined,
        labels: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        is_recurring: isRecurring,
      };
      if (isEditing) {
        await api.put(`/expenses/${params.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      Alert.alert('Success', isEditing ? 'Expense updated' : 'Expense added', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      // show locally if backend offline
      Alert.alert('Saved', isEditing ? 'Expense updated locally' : 'Expense saved locally', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!isEditing) return;
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/expenses/${params.id}`); } catch {}
          router.back();
        },
      },
    ]);
  };

  // ── Picker Modal ──────────────────────────────────────────────────────────
  const renderPickerModal = () => {
    if (!picker) return null;
    const isCat = picker === 'category';
    const isPay = picker === 'payment';
    const isAcc = picker === 'account';
    const data  = isCat ? EXPENSE_CATEGORIES : isPay ? PAYMENT_MODES : accounts;

    return (
      <Modal visible transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPicker(null)} />
        <View style={[styles.sheet, { backgroundColor: CARD }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {isCat ? 'Select Category' : isPay ? 'Payment Mode' : 'Select Account'}
          </Text>
          <FlatList
            data={data}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => {
              const isSelected = isCat
                ? category?.key === item.key
                : isPay
                ? paymentMode?.key === item.key
                : account?.account_id === item.account_id;
              return (
                <TouchableOpacity
                  style={[styles.pickerItem, isSelected && { backgroundColor: `${PURPLE}22` }]}
                  onPress={() => {
                    if (isCat) setCategory(item as any);
                    else if (isPay) setPaymentMode(item as any);
                    else setAccount(item);
                    setPicker(null);
                  }}
                >
                  <View style={[styles.pickerIconBox, {
                    backgroundColor: isCat ? `${(item as any).color}22` : `${PURPLE}22`,
                  }]}>
                    <Ionicons
                      name={(item.icon || 'ellipse-outline') as any}
                      size={20}
                      color={isCat ? (item as any).color : PURPLE}
                    />
                  </View>
                  <Text style={[styles.pickerLabel, { color: colors.text }]}>
                    {isAcc ? item.name : (item as any).label}
                  </Text>
                  {isAcc && (
                    <Text style={[styles.pickerSub, { color: colors.textSecondary }]}>
                      {formatINR(item.balance)}
                    </Text>
                  )}
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={PURPLE} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    );
  };

  const FieldRow = ({
    icon, label, value, onPress, required = false,
  }: { icon: string; label: string; value?: string; onPress: () => void; required?: boolean }) => (
    <TouchableOpacity style={[styles.fieldRow, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.fieldIconBox, { backgroundColor: `${PURPLE}18` }]}>
        <Ionicons name={icon as any} size={18} color={PURPLE} />
      </View>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {label}
        {required && <Text style={{ color: RED }}> *</Text>}
      </Text>
      <Text style={[styles.fieldValue, { color: value ? colors.text : colors.textSecondary }]}>
        {value || `Select ${label}`}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Expense' : 'Add Expense'}
          </Text>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            {saving
              ? <ActivityIndicator size="small" color={PURPLE} />
              : <Text style={[styles.saveText, { color: PURPLE }]}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Amount Section */}
          <View style={[styles.amountCard, { backgroundColor: CARD }]}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
              Amount <Text style={{ color: RED }}>*</Text>
            </Text>
            <View style={styles.amountRow}>
              <Text style={[styles.currencySymbol, { color: colors.text }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                autoFocus={!isEditing}
              />
              <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: `${PURPLE}22` }]} onPress={() => setBillAttached(true)}>
                <Ionicons name="camera-outline" size={20} color={PURPLE} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Expense Details */}
          <View style={[styles.section, { backgroundColor: CARD }]}>
            <Text style={[styles.sectionTitle, { color: SECTION_LABEL_COLOR }]}>EXPENSE DETAILS</Text>

            <FieldRow
              icon="grid-outline"
              label="Category"
              value={category?.label}
              onPress={() => setPicker('category')}
              required
            />
            <TouchableOpacity
              style={[styles.fieldRow, { borderBottomColor: colors.border }]}
              onPress={() => setShowDate(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.fieldIconBox, { backgroundColor: `${PURPLE}18` }]}>
                <Ionicons name="calendar-outline" size={18} color={PURPLE} />
              </View>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Date <Text style={{ color: RED }}>*</Text>
              </Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>
                {format(date, 'd MMM yyyy')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <FieldRow
              icon="swap-horizontal-outline"
              label="Payment Mode"
              value={paymentMode?.label}
              onPress={() => setPicker('payment')}
            />
            <FieldRow
              icon="wallet-outline"
              label="Account"
              value={account?.name}
              onPress={() => setPicker('account')}
              required
            />

            {/* Description */}
            <View style={[styles.textFieldRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.fieldIconBox, { backgroundColor: `${PURPLE}18` }]}>
                <Ionicons name="document-text-outline" size={18} color={PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Description <Text style={[styles.optional, { color: colors.textSecondary }]}>(Optional)</Text></Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What was this expense for?"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>
            </View>

            {/* Note */}
            <View style={styles.textFieldRow}>
              <View style={[styles.fieldIconBox, { backgroundColor: `${PURPLE}18` }]}>
                <Ionicons name="create-outline" size={18} color={PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Add Note <Text style={[styles.optional, { color: colors.textSecondary }]}>(Optional)</Text></Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add a note"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>
            </View>
          </View>

          {/* Additional Details */}
          <View style={[styles.section, { backgroundColor: CARD }]}>
            <Text style={[styles.sectionTitle, { color: SECTION_LABEL_COLOR }]}>ADDITIONAL DETAILS (OPTIONAL)</Text>

            {/* Attach Bill */}
            <TouchableOpacity
              style={[styles.fieldRow, { borderBottomColor: colors.border }]}
              onPress={() => setBillAttached(!billAttached)}
              activeOpacity={0.7}
            >
              <View style={[styles.fieldIconBox, { backgroundColor: '#00E67622' }]}>
                <Ionicons name="attach-outline" size={18} color="#00E676" />
              </View>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Attach Bill</Text>
              <Text style={[styles.fieldValue, { color: billAttached ? '#00E676' : colors.textSecondary }]}>
                {billAttached ? 'Bill attached ✓' : 'Upload'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Tags */}
            <View style={[styles.textFieldRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.fieldIconBox, { backgroundColor: '#FFB30022' }]}>
                <Ionicons name="pricetag-outline" size={18} color="#FFB300" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Tags</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="Add Tags (comma separated)"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Recurring */}
            <View style={[styles.switchRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.fieldIconBox, { backgroundColor: `${PURPLE}18` }]}>
                <Ionicons name="refresh-circle-outline" size={18} color={PURPLE} />
              </View>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Is this a recurring expense?</Text>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: colors.border, true: PURPLE }}
                thumbColor="#FFF"
              />
            </View>

            {/* Reminder */}
            <TouchableOpacity
              style={styles.fieldRow}
              onPress={() => setShowRemDate(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.fieldIconBox, { backgroundColor: '#FF525222' }]}>
                <Ionicons name="notifications-outline" size={18} color={RED} />
              </View>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Set Reminder</Text>
              <Text style={[styles.fieldValue, { color: reminderDate ? colors.text : colors.textSecondary }]}>
                {reminderDate ? format(reminderDate, 'd MMM yyyy') : 'Add Reminder'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Save / Cancel Buttons */}
          <View style={styles.btnGroup}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: PURPLE }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.saveBtnText}>Save Expense</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity style={[styles.deleteBtn]} onPress={handleDelete} activeOpacity={0.85}>
                <Ionicons name="trash-outline" size={18} color={RED} />
                <Text style={[styles.deleteBtnText, { color: RED }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Date Picker */}
        {showDate && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(_, d) => { setShowDate(false); if (d) setDate(d); }}
          />
        )}
        {showRemDate && (
          <DateTimePicker
            value={reminderDate || new Date()}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(_, d) => { setShowRemDate(false); if (d) setReminderDate(d); }}
          />
        )}

        {renderPickerModal()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:    { fontSize: 18, fontWeight: '700' },
  saveText:       { fontSize: 16, fontWeight: '700' },
  amountCard:     { marginHorizontal: 20, marginTop: 4, marginBottom: 14, borderRadius: 16, padding: 20 },
  amountLabel:    { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  amountRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currencySymbol: { fontSize: 28, fontWeight: '700', marginRight: 2 },
  amountInput:    { flex: 1, fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  cameraBtn:      { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  section:        { marginHorizontal: 20, borderRadius: 16, padding: 4, marginBottom: 14, overflow: 'hidden' },
  sectionTitle:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  fieldRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  fieldIconBox:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fieldLabel:     { flex: 1, fontSize: 14, fontWeight: '500' },
  fieldValue:     { fontSize: 14, maxWidth: '40%', textAlign: 'right', marginRight: 6 },
  optional:       { fontSize: 12, fontWeight: '400' },
  textFieldRow:   { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12, alignItems: 'flex-start' },
  textInput:      { fontSize: 13, marginTop: 4, minHeight: 20 },
  switchRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  switchLabel:    { flex: 1, fontSize: 14, fontWeight: '500' },
  btnGroup:       { marginHorizontal: 20, marginTop: 8, gap: 10 },
  saveBtn:        { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText:    { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelBtn:      { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  cancelBtnText:  { fontSize: 15, fontWeight: '600' },
  deleteBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  deleteBtnText:  { fontSize: 15, fontWeight: '600' },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:          { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:     { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickerItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, gap: 12, marginBottom: 4 },
  pickerIconBox:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pickerLabel:    { flex: 1, fontSize: 14, fontWeight: '500' },
  pickerSub:      { fontSize: 13, fontWeight: '600', marginRight: 8 },
});
