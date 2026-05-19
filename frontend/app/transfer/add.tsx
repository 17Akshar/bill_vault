import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList, Switch, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import api from '../../utils/api';

const PURPLE = '#7C5CE7';
const GREEN  = '#00E676';
const RED    = '#EF4444';
const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEMO_ACCOUNTS = [
  { id: 'acc_001', name: 'HDFC Bank',    last4: '1234', balance: 125000, icon: 'business-outline',  color: '#2979FF' },
  { id: 'acc_002', name: 'ICICI Bank',   last4: '5678', balance: 85000,  icon: 'card-outline',      color: '#7C5CE7' },
  { id: 'acc_003', name: 'SBI Bank',     last4: '4321', balance: 62000,  icon: 'wallet-outline',    color: '#00E676' },
  { id: 'acc_004', name: 'Axis Bank',    last4: '7890', balance: 43000,  icon: 'card-sharp-outline',color: '#FF9100' },
  { id: 'acc_005', name: 'Cash',         last4: '',     balance: 15000,  icon: 'cash-outline',      color: '#26C6DA' },
];

const PURPOSES = [
  'Rent Payment', 'Savings', 'Investment', 'Bill Payment', 'Loan Repayment',
  'Family Transfer', 'Emergency', 'Other',
];

const FREQUENCIES = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Yearly'];

type PickerKind = 'from' | 'to' | 'purpose' | 'frequency' | null;

export default function AddTransfer() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;
  const FIELD_BG = isDark ? '#13132A' : colors.background;

  const [amount, setAmount]           = useState('');
  const [fromId, setFromId]           = useState(DEMO_ACCOUNTS[0].id);
  const [toId, setToId]               = useState(DEMO_ACCOUNTS[1].id);
  const [purpose, setPurpose]         = useState('');
  const [remarks, setRemarks]         = useState('');
  const [date, setDate]               = useState(new Date());
  const [showDate, setShowDate]       = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency]     = useState('Monthly');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Wed']);
  const [endType, setEndType]         = useState<'never' | 'date'>('never');
  const [endDate, setEndDate]         = useState<Date | null>(null);
  const [showEndDate, setShowEndDate] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [picker, setPicker]           = useState<PickerKind>(null);

  const fromAccount = DEMO_ACCOUNTS.find(a => a.id === fromId)!;
  const toAccount   = DEMO_ACCOUNTS.find(a => a.id === toId)!;

  const toggleDay = (d: string) =>
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSave = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Missing Amount', 'Please enter a valid transfer amount.'); return;
    }
    if (fromId === toId) {
      Alert.alert('Same Account', 'Source and destination accounts must be different.'); return;
    }
    setSaving(true);
    try {
      await api.post('/transfers', {
        amount: parseFloat(amount),
        from_account_id: fromId,
        to_account_id: toId,
        purpose,
        remarks,
        date: format(date, 'yyyy-MM-dd'),
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency.toLowerCase() : null,
        repeat_days: isRecurring ? selectedDays : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      });
      router.back();
    } catch {
      Alert.alert('Saved', 'Transfer recorded successfully.');
      router.back();
    } finally { setSaving(false); }
  }, [amount, fromId, toId, purpose, remarks, date, isRecurring, frequency, selectedDays, endDate, router]);

  const AccountCard = ({
    label, account, onPress,
  }: { label: string; account: typeof DEMO_ACCOUNTS[0]; onPress: () => void }) => (
    <View style={styles.accountSection}>
      <Text style={[styles.accountSectionLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.accountCard, { backgroundColor: CARD }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.accountIcon, { backgroundColor: `${account.color}22` }]}>
          <Ionicons name={account.icon as any} size={22} color={account.color} />
        </View>
        <View style={styles.accountMeta}>
          <Text style={[styles.accountName, { color: colors.text }]}>
            {account.name}{account.last4 ? ` •••• ${account.last4}` : ''}
          </Text>
          <Text style={[styles.accountBalance, { color: colors.textSecondary }]}>
            Available Balance: {formatINR(account.balance)}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderPicker = () => {
    const isAccount = picker === 'from' || picker === 'to';
    const isPurpose  = picker === 'purpose';
    const isFreq     = picker === 'frequency';

    const title = picker === 'from' ? 'Transfer From' : picker === 'to' ? 'Transfer To'
      : picker === 'purpose' ? 'Purpose / Category' : 'Frequency';

    return (
      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: CARD }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
              <TouchableOpacity onPress={() => setPicker(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {isAccount && (
              <FlatList
                data={DEMO_ACCOUNTS}
                keyExtractor={a => a.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.sheetRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      if (picker === 'from') setFromId(item.id);
                      else setToId(item.id);
                      setPicker(null);
                    }}
                  >
                    <View style={[styles.sheetRowIcon, { backgroundColor: `${item.color}22` }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sheetRowTitle, { color: colors.text }]}>
                        {item.name}{item.last4 ? ` •••• ${item.last4}` : ''}
                      </Text>
                      <Text style={[styles.sheetRowSub, { color: colors.textSecondary }]}>
                        Available: {formatINR(item.balance)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
            {isPurpose && (
              <FlatList
                data={PURPOSES}
                keyExtractor={p => p}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.sheetRow, { borderBottomColor: colors.border }]}
                    onPress={() => { setPurpose(item); setPicker(null); }}
                  >
                    <Text style={[styles.sheetRowTitle, { color: colors.text }]}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            {isFreq && (
              <FlatList
                data={FREQUENCIES}
                keyExtractor={f => f}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.sheetRow, { borderBottomColor: colors.border }]}
                    onPress={() => { setFrequency(item); setPicker(null); }}
                  >
                    <Text style={[styles.sheetRowTitle, { color: colors.text }]}>{item}</Text>
                    {item === frequency && <Ionicons name="checkmark" size={18} color={PURPLE} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add New Transfer</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.headerSave, { opacity: saving ? 0.5 : 1 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Transfer From */}
        <AccountCard label="Transfer From" account={fromAccount} onPress={() => setPicker('from')} />

        {/* Transfer To */}
        <AccountCard label="Transfer To" account={toAccount} onPress={() => setPicker('to')} />

        {/* Amount */}
        <View style={[styles.formCard, { backgroundColor: CARD }]}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.amountRupee, { color: colors.text }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />
            <View style={[styles.amountIcon, { backgroundColor: `${GREEN}22` }]}>
              <Ionicons name="swap-vertical" size={20} color={GREEN} />
            </View>
          </View>
        </View>

        {/* Transfer Date */}
        <TouchableOpacity
          style={[styles.formCard, { backgroundColor: CARD }]}
          onPress={() => setShowDate(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Transfer Date</Text>
          <View style={styles.dateRow}>
            <Text style={[styles.dateValue, { color: colors.text }]}>{format(date, 'd MMM yyyy')}</Text>
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Purpose */}
        <TouchableOpacity
          style={[styles.formCard, { backgroundColor: CARD }]}
          onPress={() => setPicker('purpose')}
          activeOpacity={0.8}
        >
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Purpose / Category</Text>
          <View style={styles.dateRow}>
            <Text style={[styles.dateValue, { color: purpose ? colors.text : colors.textSecondary }]}>
              {purpose || 'Select purpose'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Remarks */}
        <View style={[styles.formCard, { backgroundColor: CARD }]}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Remarks (Optional)</Text>
          <View style={styles.remarksRow}>
            <TextInput
              style={[styles.remarksInput, { color: colors.text }]}
              value={remarks}
              onChangeText={v => setRemarks(v.slice(0, 100))}
              placeholder="Add remarks or notes"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Text style={[styles.remarksCount, { color: colors.textSecondary }]}>{remarks.length}/100</Text>
          </View>
        </View>

        {/* Recurring Transfer */}
        <View style={[styles.formCard, { backgroundColor: CARD }]}>
          <View style={styles.recurringRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.recurringTitle, { color: colors.text }]}>Recurring Transfer</Text>
              <Text style={[styles.recurringSubtitle, { color: colors.textSecondary }]}>Make this a recurring transfer</Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: colors.border, true: PURPLE }}
              thumbColor="#FFF"
            />
          </View>

          {isRecurring && (
            <>
              {/* Frequency */}
              <TouchableOpacity
                style={[styles.subRow, { borderTopColor: colors.border }]}
                onPress={() => setPicker('frequency')}
                activeOpacity={0.7}
              >
                <Text style={[styles.subRowLabel, { color: colors.text }]}>Frequency</Text>
                <View style={styles.subRowRight}>
                  <Text style={[styles.subRowValue, { color: PURPLE }]}>{frequency}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Repeat On */}
              <View style={[styles.subRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.subRowLabel, { color: colors.text }]}>Repeat On</Text>
              </View>
              <View style={styles.daysRow}>
                {DAYS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayChip, selectedDays.includes(d) && { backgroundColor: PURPLE }]}
                    onPress={() => toggleDay(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dayChipText, { color: selectedDays.includes(d) ? '#FFF' : colors.textSecondary }]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* End */}
              <TouchableOpacity
                style={[styles.subRow, { borderTopColor: colors.border }]}
                onPress={() => {
                  if (endType === 'never') { setEndType('date'); setShowEndDate(true); }
                  else { setEndType('never'); setEndDate(null); }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.subRowLabel, { color: colors.text }]}>End</Text>
                <View style={styles.subRowRight}>
                  <Text style={[styles.subRowValue, { color: colors.textSecondary }]}>
                    {endType === 'never' ? 'Never' : endDate ? format(endDate, 'd MMM yyyy') : 'Select date'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Transfer'}</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {renderPicker()}

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
  safe:               { flex: 1 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:        { fontSize: 17, fontWeight: '700' },
  headerSave:         { fontSize: 16, fontWeight: '700', color: PURPLE },
  scroll:             { paddingHorizontal: 16, paddingTop: 8 },

  accountSection:     { marginBottom: 12 },
  accountSectionLabel:{ fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  accountCard:        { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, gap: 12 },
  accountIcon:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accountMeta:        { flex: 1 },
  accountName:        { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  accountBalance:     { fontSize: 12 },

  formCard:           { borderRadius: 14, padding: 16, marginBottom: 12 },
  formLabel:          { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  amountRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountRupee:        { fontSize: 24, fontWeight: '700' },
  amountInput:        { flex: 1, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  amountIcon:         { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dateRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateValue:          { fontSize: 17, fontWeight: '600' },
  remarksRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  remarksInput:       { flex: 1, fontSize: 14, minHeight: 40, paddingVertical: 0 },
  remarksCount:       { fontSize: 11, marginTop: 4 },

  recurringRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  recurringTitle:     { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  recurringSubtitle:  { fontSize: 12 },
  subRow:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  subRowLabel:        { fontSize: 14, fontWeight: '600' },
  subRowRight:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subRowValue:        { fontSize: 14, fontWeight: '600' },
  daysRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 4 },
  dayChip:            { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(124,92,231,0.15)' },
  dayChipText:        { fontSize: 13, fontWeight: '600' },

  saveBtn:            { backgroundColor: PURPLE, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  saveBtnText:        { color: '#FFF', fontSize: 16, fontWeight: '700' },

  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:              { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  sheetHandle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  sheetHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle:         { fontSize: 16, fontWeight: '700' },
  sheetRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  sheetRowIcon:       { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sheetRowTitle:      { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  sheetRowSub:        { fontSize: 12 },
});
