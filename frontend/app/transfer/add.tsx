import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import api from '../../utils/api';

const BLUE   = '#2979FF';
const GREEN  = '#00E676';
const PURPLE = '#7C5CE7';

const DEMO_ACCOUNTS = [
  { id: 'acc_001', name: 'HDFC Savings',    icon: 'card-outline',         color: '#2979FF' },
  { id: 'acc_002', name: 'ICICI Current',   icon: 'business-outline',     color: '#7C5CE7' },
  { id: 'acc_003', name: 'SBI Savings',     icon: 'wallet-outline',       color: '#00E676' },
  { id: 'acc_004', name: 'Axis Bank',       icon: 'card-sharp-outline',   color: '#FF9100' },
  { id: 'acc_005', name: 'Cash',            icon: 'cash-outline',         color: '#26C6DA' },
];

const PURPOSES = [
  { key: 'savings',     label: 'Savings',         icon: 'save-outline' },
  { key: 'investment',  label: 'Investment',       icon: 'trending-up-outline' },
  { key: 'bill',        label: 'Bill Payment',     icon: 'document-text-outline' },
  { key: 'loan',        label: 'Loan Repayment',   icon: 'home-outline' },
  { key: 'family',      label: 'Family Transfer',  icon: 'people-outline' },
  { key: 'emergency',   label: 'Emergency',        icon: 'alert-circle-outline' },
  { key: 'other',       label: 'Other',            icon: 'ellipsis-horizontal-outline' },
];

const FREQUENCIES = [
  { key: 'daily',     label: 'Daily' },
  { key: 'weekly',    label: 'Weekly' },
  { key: 'biweekly',  label: 'Bi-weekly' },
  { key: 'monthly',   label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly',    label: 'Yearly' },
];

type PickerKind = 'from' | 'to' | 'purpose' | 'frequency' | null;

export default function AddTransfer() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;

  const [amount, setAmount]           = useState('');
  const [fromId, setFromId]           = useState('');
  const [toId, setToId]               = useState('');
  const [purposeKey, setPurposeKey]   = useState('');
  const [remarks, setRemarks]         = useState('');
  const [date, setDate]               = useState(new Date());
  const [showDate, setShowDate]       = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency]     = useState('monthly');
  const [repeatDay, setRepeatDay]     = useState('1');
  const [endDate, setEndDate]         = useState<Date | null>(null);
  const [showEndDate, setShowEndDate] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [picker, setPicker]           = useState<PickerKind>(null);

  const fromAccount = DEMO_ACCOUNTS.find(a => a.id === fromId);
  const toAccount   = DEMO_ACCOUNTS.find(a => a.id === toId);
  const purpose     = PURPOSES.find(p => p.key === purposeKey);
  const freq        = FREQUENCIES.find(f => f.key === frequency);

  const handleSave = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Missing Amount', 'Please enter a valid transfer amount.');
      return;
    }
    if (!fromId) {
      Alert.alert('Missing Account', 'Please select a source account.');
      return;
    }
    if (!toId) {
      Alert.alert('Missing Account', 'Please select a destination account.');
      return;
    }
    if (fromId === toId) {
      Alert.alert('Same Account', 'Source and destination accounts must be different.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/transfers', {
        amount: parseFloat(amount),
        from_account_id: fromId,
        to_account_id: toId,
        purpose: purposeKey || 'other',
        remarks,
        date: format(date, 'yyyy-MM-dd'),
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : null,
        repeat_day: isRecurring ? parseInt(repeatDay) : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      });
      router.back();
    } catch {
      Alert.alert('Saved', 'Transfer recorded successfully.');
      router.back();
    } finally {
      setSaving(false);
    }
  }, [amount, fromId, toId, purposeKey, remarks, date, isRecurring, frequency, repeatDay, endDate, router]);

  const FieldRow = ({
    icon, label, value, onPress, color, placeholder,
  }: { icon: string; label: string; value?: string; onPress?: () => void; color?: string; placeholder?: string }) => (
    <TouchableOpacity
      style={[styles.fieldRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.fieldIcon, { backgroundColor: `${color || BLUE}18` }]}>
        <Ionicons name={icon as any} size={18} color={color || BLUE} />
      </View>
      <View style={styles.fieldMeta}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.fieldValue, { color: value ? colors.text : colors.textSecondary }]}>
          {value || placeholder || 'Select'}
        </Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
    </TouchableOpacity>
  );

  const renderPickerModal = () => {
    let items: { key: string; label: string; icon?: string; color?: string }[] = [];
    let title = '';

    if (picker === 'from' || picker === 'to') {
      items = DEMO_ACCOUNTS.map(a => ({ key: a.id, label: a.name, icon: a.icon, color: a.color }));
      title = picker === 'from' ? 'Transfer From' : 'Transfer To';
    } else if (picker === 'purpose') {
      items = PURPOSES.map(p => ({ key: p.key, label: p.label, icon: p.icon, color: BLUE }));
      title = 'Purpose';
    } else if (picker === 'frequency') {
      items = FREQUENCIES.map(f => ({ key: f.key, label: f.label, color: PURPLE }));
      title = 'Frequency';
    }

    return (
      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: CARD }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
              <TouchableOpacity onPress={() => setPicker(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={items}
              keyExtractor={i => i.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    if (picker === 'from') setFromId(item.key);
                    else if (picker === 'to') setToId(item.key);
                    else if (picker === 'purpose') setPurposeKey(item.key);
                    else if (picker === 'frequency') setFrequency(item.key);
                    setPicker(null);
                  }}
                >
                  {item.icon && (
                    <View style={[styles.modalItemIcon, { backgroundColor: `${item.color || BLUE}22` }]}>
                      <Ionicons name={item.icon as any} size={18} color={item.color || BLUE} />
                    </View>
                  )}
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Transfer</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Amount */}
        <View style={[styles.amountCard, { backgroundColor: `${BLUE}18` }]}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Transfer Amount</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.amountSymbol, { color: BLUE }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: BLUE }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={`${BLUE}60`}
            />
          </View>
        </View>

        {/* Transfer Direction */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Transfer Details</Text>
          <FieldRow
            icon="arrow-up-circle-outline"
            label="From Account"
            value={fromAccount?.name}
            placeholder="Select source account"
            color={GREEN}
            onPress={() => setPicker('from')}
          />
          <View style={styles.transferArrow}>
            <View style={[styles.arrowLine, { backgroundColor: colors.border }]} />
            <View style={[styles.arrowCircle, { backgroundColor: BLUE }]}>
              <Ionicons name="swap-vertical" size={16} color="#FFF" />
            </View>
            <View style={[styles.arrowLine, { backgroundColor: colors.border }]} />
          </View>
          <FieldRow
            icon="arrow-down-circle-outline"
            label="To Account"
            value={toAccount?.name}
            placeholder="Select destination account"
            color="#EF4444"
            onPress={() => setPicker('to')}
          />
        </View>

        {/* Additional Details */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Details</Text>
          <FieldRow
            icon="calendar-outline"
            label="Date"
            value={format(date, 'd MMM yyyy')}
            color={BLUE}
            onPress={() => setShowDate(true)}
          />
          <FieldRow
            icon="bookmark-outline"
            label="Purpose"
            value={purpose?.label}
            placeholder="Select purpose"
            color={PURPLE}
            onPress={() => setPicker('purpose')}
          />
          <View style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.fieldIcon, { backgroundColor: `${BLUE}18` }]}>
              <Ionicons name="chatbubble-outline" size={18} color={BLUE} />
            </View>
            <TextInput
              style={[styles.remarkInput, { color: colors.text }]}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Remarks (optional)"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>
        </View>

        {/* Recurring */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <View style={styles.toggleRow}>
            <View style={[styles.fieldIcon, { backgroundColor: `${PURPLE}18` }]}>
              <Ionicons name="refresh-circle-outline" size={18} color={PURPLE} />
            </View>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Recurring Transfer</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: colors.border, true: `${PURPLE}80` }}
              thumbColor={isRecurring ? PURPLE : colors.textSecondary}
            />
          </View>

          {isRecurring && (
            <>
              <FieldRow
                icon="repeat-outline"
                label="Frequency"
                value={freq?.label}
                color={PURPLE}
                onPress={() => setPicker('frequency')}
              />
              <View style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.fieldIcon, { backgroundColor: `${PURPLE}18` }]}>
                  <Ionicons name="calendar-number-outline" size={18} color={PURPLE} />
                </View>
                <View style={styles.fieldMeta}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Repeat On Day</Text>
                  <TextInput
                    style={[styles.fieldValue, { color: colors.text }]}
                    value={repeatDay}
                    onChangeText={v => setRepeatDay(v.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    placeholder="1–31"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
              <FieldRow
                icon="stop-circle-outline"
                label="End Date"
                value={endDate ? format(endDate, 'd MMM yyyy') : undefined}
                placeholder="No end date"
                color={PURPLE}
                onPress={() => setShowEndDate(true)}
              />
            </>
          )}
        </View>

        {/* Security card */}
        <View style={[styles.securityCard, { backgroundColor: `${BLUE}12`, borderColor: `${BLUE}30` }]}>
          <Ionicons name="lock-closed-outline" size={18} color={BLUE} />
          <View style={styles.securityMeta}>
            <Text style={[styles.securityTitle, { color: colors.text }]}>Keep your data secure</Text>
            <Text style={[styles.securitySub, { color: colors.textSecondary }]}>All transfers are encrypted and stored safely.</Text>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: BLUE, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Ionicons name="swap-horizontal" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Transfer'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {renderPickerModal()}

      {showDate && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowDate(false); if (d) setDate(d); }}
        />
      )}
      {showEndDate && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowEndDate(false); if (d) setEndDate(d); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:    { fontSize: 18, fontWeight: '700' },
  scroll:         { paddingHorizontal: 20, paddingTop: 8 },
  amountCard:     { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 14 },
  amountLabel:    { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  amountRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amountSymbol:   { fontSize: 32, fontWeight: '700' },
  amountInput:    { fontSize: 52, fontWeight: '800', letterSpacing: -2, minWidth: 80 },
  card:           { borderRadius: 16, padding: 16, marginBottom: 14 },
  sectionTitle:   { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase', opacity: 0.6 },
  fieldRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  fieldIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fieldMeta:      { flex: 1 },
  fieldLabel:     { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginBottom: 3 },
  fieldValue:     { fontSize: 14, fontWeight: '500' },
  remarkInput:    { flex: 1, fontSize: 14, fontWeight: '500', paddingVertical: 0 },
  transferArrow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  arrowLine:      { flex: 1, height: 1 },
  arrowCircle:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  toggleRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  toggleLabel:    { flex: 1, fontSize: 15, fontWeight: '600' },
  securityCard:   { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 12, marginBottom: 20, borderWidth: 1 },
  securityMeta:   { flex: 1 },
  securityTitle:  { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  securitySub:    { fontSize: 12 },
  saveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16, gap: 8, marginBottom: 10 },
  saveBtnText:    { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelBtn:      { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText:  { fontSize: 14, fontWeight: '600' },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:     { fontSize: 16, fontWeight: '700' },
  modalItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  modalItemIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalItemText:  { fontSize: 15, fontWeight: '500' },
});
