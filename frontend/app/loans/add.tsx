/**
 * AddLoanScreen
 * Form to add a new loan — matches the reference design.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';

// ─── Data ─────────────────────────────────────────────────────────────────────
const LOAN_TYPES = [
  { key: 'home',      label: 'Home Loan',          icon: 'home-outline' },
  { key: 'car',       label: 'Car Loan',            icon: 'car-outline' },
  { key: 'personal',  label: 'Personal Loan',       icon: 'person-outline' },
  { key: 'education', label: 'Education Loan',      icon: 'school-outline' },
  { key: 'gold',      label: 'Gold Loan',           icon: 'diamond-outline' },
  { key: 'business',  label: 'Business Loan',       icon: 'briefcase-outline' },
  { key: 'property',  label: 'Loan vs Property',    icon: 'business-outline' },
  { key: 'vehicle',   label: 'Two-Wheeler Loan',    icon: 'bicycle-outline' },
  { key: 'other',     label: 'Other',               icon: 'cash-outline' },
];

const BANKS = [
  'HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank',
  'Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'Union Bank',
  'Indian Bank', 'Yes Bank', 'IDFC First Bank', 'IndusInd Bank',
  'Federal Bank', 'RBL Bank', 'Bajaj Finserv', 'Tata Capital',
  'LIC Housing Finance', 'PNB Housing Finance', 'Other',
];

const TENURES = [
  { label: '1 Year', months: 12 }, { label: '2 Years', months: 24 },
  { label: '3 Years', months: 36 }, { label: '5 Years', months: 60 },
  { label: '7 Years', months: 84 }, { label: '10 Years', months: 120 },
  { label: '12 Years', months: 144 }, { label: '15 Years', months: 180 },
  { label: '20 Years', months: 240 }, { label: '25 Years', months: 300 },
  { label: '30 Years', months: 360 },
];

const EMI_DAYS = [1, 3, 5, 7, 10, 15, 18, 20, 25, 28];

// ─── Picker Modal ─────────────────────────────────────────────────────────────
function PickerModal({
  visible, title, items, selectedKey, onSelect, onClose, colors,
}: {
  visible: boolean; title: string; items: { key: string; label: string }[];
  selectedKey: string; onSelect: (key: string, label: string) => void;
  onClose: () => void; colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pm.overlay}>
        <View style={[pm.sheet, { backgroundColor: colors.card }]}>
          <View style={[pm.header, { borderBottomColor: colors.border }]}>
            <Text style={[pm.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={i => i.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[pm.row, selectedKey === item.key && { backgroundColor: '#6C47FF12' }]}
                onPress={() => { onSelect(item.key, item.label); onClose(); }}
              >
                <Text style={[pm.rowText, { color: colors.text }, selectedKey === item.key && { color: '#6C47FF', fontWeight: '700' }]}>
                  {item.label}
                </Text>
                {selectedKey === item.key && (
                  <Ionicons name="checkmark" size={18} color="#6C47FF" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  rowText: { fontSize: 15 },
});

// ─── Field Row ─────────────────────────────────────────────────────────────────
function FieldLabel({ label, icon, colors }: { label: string; icon: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <Ionicons name={icon as any} size={14} color="#6C47FF" />
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function InputRow({
  icon, placeholder, value, onChangeText, keyboardType = 'default', prefix, colors, multiline = false,
}: any) {
  return (
    <View style={[f.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Ionicons name={icon} size={16} color="#6C47FF" style={{ marginRight: 8 }} />
      {prefix && <Text style={[f.prefix, { color: colors.textSecondary }]}>{prefix}</Text>}
      <TextInput
        style={[f.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

function SelectRow({ icon, label, value, onPress, colors }: any) {
  return (
    <TouchableOpacity
      style={[f.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color="#6C47FF" style={{ marginRight: 8 }} />
      <Text style={[f.selectText, { color: value ? colors.text : colors.textSecondary }]}>
        {value || label}
      </Text>
      <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const f = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 46,
  },
  prefix: { fontSize: 15, fontWeight: '600', marginRight: 4 },
  input: { flex: 1, fontSize: 15 },
  selectText: { flex: 1, fontSize: 15 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddLoanScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [loanType, setLoanType] = useState('home');
  const [lender, setLender] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loanDate, setLoanDate] = useState(new Date());
  const [tenureMonths, setTenureMonths] = useState(240);
  const [tenureLabel, setTenureLabel] = useState('20 Years');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [interestType, setInterestType] = useState<'fixed' | 'floating'>('fixed');
  const [emiAmount, setEmiAmount] = useState('');
  const [emiDay, setEmiDay] = useState<number>(5);
  const [processingFee, setProcessingFee] = useState('0');
  const [otherCharges, setOtherCharges] = useState('0');
  const [linkedAccount, setLinkedAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [showLenderPicker, setShowLenderPicker] = useState(false);
  const [showTenurePicker, setShowTenurePicker] = useState(false);
  const [showEmiDayPicker, setShowEmiDayPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  useEffect(() => {
    api.get('/accounts').then(r => setAccounts(r.data)).catch(() => {});
  }, []);

  // Auto-compute next EMI date from loan date and EMI day
  function computeNextEmiDate(): string {
    const d = new Date(loanDate);
    d.setDate(emiDay);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  }

  const handleSave = async () => {
    if (!principalAmount || !emiAmount) {
      Alert.alert('Required', 'Please enter Loan Amount and EMI Amount');
      return;
    }
    const principal = parseFloat(principalAmount.replace(/,/g, ''));
    const emi = parseFloat(emiAmount.replace(/,/g, ''));
    const rate = parseFloat(interestRate || '0');

    if (isNaN(principal) || principal <= 0) {
      Alert.alert('Invalid', 'Enter a valid Loan Amount'); return;
    }
    if (isNaN(emi) || emi <= 0) {
      Alert.alert('Invalid', 'Enter a valid EMI Amount'); return;
    }

    setSaving(true);
    try {
      const selectedType = LOAN_TYPES.find(t => t.key === loanType);
      const loanName = `${selectedType?.label}${lender ? ` - ${lender}` : ''}`;

      await api.post('/loans', {
        name: loanName,
        loan_type: loanType,
        lender: lender || null,
        account_number: accountNumber || null,
        principal_amount: principal,
        outstanding_amount: principal,
        interest_rate: rate,
        interest_type: interestType,
        emi_amount: emi,
        emi_day: emiDay,
        tenure_months: tenureMonths,
        tenure_years: tenureMonths / 12,
        start_date: loanDate.toISOString(),
        next_emi_date: computeNextEmiDate(),
        processing_fee: parseFloat(processingFee || '0'),
        other_charges: parseFloat(otherCharges || '0'),
        linked_account_id: linkedAccount || null,
        notes: notes || null,
        status: 'active',
      });
      if (router.canGoBack()) router.back();
      else router.replace('/loans' as any);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to save loan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity testID="add-loan-back" onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Add Loan</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section Header */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>Loan Details</Text>
          <Text style={[s.sectionSubtitle, { color: colors.textSecondary }]}>
            Enter the details of your loan
          </Text>

          {/* Loan Type */}
          <View style={s.fieldGroup}>
            <FieldLabel label="Loan Type" icon="layers-outline" colors={colors} />
            <View style={s.loanTypeGrid}>
              {LOAN_TYPES.map(lt => (
                <TouchableOpacity
                  testID={`loan-type-${lt.key}`}
                  key={lt.key}
                  style={[s.typeChip, { borderColor: colors.border, backgroundColor: colors.card },
                    loanType === lt.key && { borderColor: '#6C47FF', backgroundColor: '#6C47FF12' }]}
                  onPress={() => setLoanType(lt.key)}
                >
                  <Ionicons name={lt.icon as any} size={14} color={loanType === lt.key ? '#6C47FF' : colors.textSecondary} />
                  <Text style={[s.typeChipText, { color: loanType === lt.key ? '#6C47FF' : colors.textSecondary },
                    loanType === lt.key && { fontWeight: '700' }]}>
                    {lt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Lender */}
          <View style={s.fieldGroup}>
            <FieldLabel label="Lender / Bank" icon="business-outline" colors={colors} />
            <SelectRow
              icon="business-outline" label="Select Bank / Lender"
              value={lender} onPress={() => setShowLenderPicker(true)} colors={colors}
            />
          </View>

          {/* Account Number */}
          <View style={s.fieldGroup}>
            <FieldLabel label="Loan Account Number (Optional)" icon="card-outline" colors={colors} />
            <InputRow
              icon="card-outline" placeholder="Enter loan account number"
              value={accountNumber} onChangeText={setAccountNumber} colors={colors}
            />
          </View>

          {/* Date + Tenure */}
          <View style={s.twoCol}>
            <View style={s.col}>
              <FieldLabel label="Date of Loan Taken" icon="calendar-outline" colors={colors} />
              <CrossPlatformPicker
                value={loanDate} onChange={setLoanDate} mode="date"
                label="Loan Date" colors={colors}
              />
            </View>
            <View style={s.col}>
              <FieldLabel label="Loan Tenure" icon="timer-outline" colors={colors} />
              <SelectRow
                icon="timer-outline" label="Select Tenure"
                value={tenureLabel} onPress={() => setShowTenurePicker(true)} colors={colors}
              />
            </View>
          </View>

          {/* Principal Amount */}
          <View style={s.fieldGroup}>
            <FieldLabel label="Total Loan Amount" icon="cash-outline" colors={colors} />
            <InputRow
              icon="cash-outline" placeholder="Enter loan amount"
              value={principalAmount} onChangeText={setPrincipalAmount}
              keyboardType="decimal-pad" prefix="₹" colors={colors}
            />
          </View>

          {/* Interest Rate + Type */}
          <View style={s.twoCol}>
            <View style={s.col}>
              <FieldLabel label="Interest Rate (p.a.)" icon="trending-up-outline" colors={colors} />
              <InputRow
                icon="trending-up-outline" placeholder="8.50"
                value={interestRate} onChangeText={setInterestRate}
                keyboardType="decimal-pad" prefix="%" colors={colors}
              />
            </View>
            <View style={s.col}>
              <FieldLabel label="Rate Type" icon="time-outline" colors={colors} />
              <View style={s.radioRow}>
                {(['fixed', 'floating'] as const).map(rt => (
                  <TouchableOpacity
                    testID={`rate-type-${rt}`}
                    key={rt}
                    style={[s.radioOption, { borderColor: colors.border },
                      interestType === rt && { borderColor: '#6C47FF', backgroundColor: '#6C47FF12' }]}
                    onPress={() => setInterestType(rt)}
                  >
                    <View style={[s.radioCircle, interestType === rt && { borderColor: '#6C47FF' }]}>
                      {interestType === rt && <View style={s.radioDot} />}
                    </View>
                    <Text style={[s.radioText, { color: colors.text }]}>
                      {rt.charAt(0).toUpperCase() + rt.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* EMI Amount + Day */}
          <View style={s.twoCol}>
            <View style={s.col}>
              <FieldLabel label="EMI Amount" icon="repeat-outline" colors={colors} />
              <InputRow
                icon="repeat-outline" placeholder="32,750"
                value={emiAmount} onChangeText={setEmiAmount}
                keyboardType="decimal-pad" prefix="₹" colors={colors}
              />
            </View>
            <View style={s.col}>
              <FieldLabel label="EMI Date" icon="calendar-outline" colors={colors} />
              <SelectRow
                icon="calendar-outline" label="Select Day"
                value={emiDay ? `${emiDay}th of every month` : undefined}
                onPress={() => setShowEmiDayPicker(true)} colors={colors}
              />
            </View>
          </View>

          {/* Processing Fee + Other Charges */}
          <View style={s.twoCol}>
            <View style={s.col}>
              <FieldLabel label="Processing Fee (Optional)" icon="pricetag-outline" colors={colors} />
              <InputRow
                icon="pricetag-outline" placeholder="0"
                value={processingFee} onChangeText={setProcessingFee}
                keyboardType="decimal-pad" prefix="₹" colors={colors}
              />
            </View>
            <View style={s.col}>
              <FieldLabel label="Other Charges (Optional)" icon="receipt-outline" colors={colors} />
              <InputRow
                icon="receipt-outline" placeholder="0"
                value={otherCharges} onChangeText={setOtherCharges}
                keyboardType="decimal-pad" prefix="₹" colors={colors}
              />
            </View>
          </View>

          {/* Linked Account */}
          <View style={s.fieldGroup}>
            <FieldLabel label="Linked Account (Optional)" icon="wallet-outline" colors={colors} />
            <SelectRow
              icon="wallet-outline" label="Select Account"
              value={accounts.find(a => a.account_id === linkedAccount)?.name || ''}
              onPress={() => setShowAccountPicker(true)} colors={colors}
            />
          </View>

          {/* Notes */}
          <View style={s.fieldGroup}>
            <FieldLabel label="Notes (Optional)" icon="document-text-outline" colors={colors} />
            <InputRow
              icon="document-text-outline" placeholder="Add any notes about this loan"
              value={notes} onChangeText={setNotes} colors={colors} multiline
            />
          </View>

          {/* Info Banner */}
          <View style={[s.infoBanner, { backgroundColor: '#6C47FF12', borderColor: '#6C47FF30' }]}>
            <Ionicons name="time-outline" size={18} color="#6C47FF" />
            <View style={{ flex: 1 }}>
              <Text style={s.infoTitle}>EMI will be tracked automatically</Text>
              <Text style={s.infoSubtitle}>
                You will get reminders and EMI tracking based on the details above.
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            testID="save-loan-btn"
            style={[s.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.saveBtnText}>Save Loan</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Lender Picker */}
      <PickerModal
        visible={showLenderPicker} title="Select Bank / Lender"
        items={BANKS.map(b => ({ key: b, label: b }))}
        selectedKey={lender}
        onSelect={(key) => setLender(key)}
        onClose={() => setShowLenderPicker(false)}
        colors={colors}
      />

      {/* Tenure Picker */}
      <PickerModal
        visible={showTenurePicker} title="Select Loan Tenure"
        items={TENURES.map(t => ({ key: String(t.months), label: t.label }))}
        selectedKey={String(tenureMonths)}
        onSelect={(key, label) => { setTenureMonths(parseInt(key)); setTenureLabel(label); }}
        onClose={() => setShowTenurePicker(false)}
        colors={colors}
      />

      {/* EMI Day Picker */}
      <PickerModal
        visible={showEmiDayPicker} title="EMI Date (Day of Month)"
        items={EMI_DAYS.map(d => ({ key: String(d), label: `${d}th of every month` }))}
        selectedKey={String(emiDay)}
        onSelect={(key) => setEmiDay(parseInt(key))}
        onClose={() => setShowEmiDayPicker(false)}
        colors={colors}
      />

      {/* Account Picker */}
      <PickerModal
        visible={showAccountPicker} title="Select Linked Account"
        items={[{ key: '', label: 'None' }, ...accounts.map(a => ({ key: a.account_id, label: a.name || a.bank_name || 'Account' }))]}
        selectedKey={linkedAccount}
        onSelect={(key) => setLinkedAccount(key)}
        onClose={() => setShowAccountPicker(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  sectionSubtitle: { fontSize: 13, marginBottom: 20 },
  fieldGroup: { marginBottom: 16 },
  twoCol: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  col: { flex: 1 },
  loanTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
  },
  typeChipText: { fontSize: 11, fontWeight: '500' },
  radioRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  radioOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
  },
  radioCircle: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#9CA3AF',
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6C47FF' },
  radioText: { fontSize: 13, fontWeight: '500' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20,
  },
  infoTitle: { color: '#6C47FF', fontWeight: '700', fontSize: 13 },
  infoSubtitle: { color: '#6C47FF99', fontSize: 11, marginTop: 2, lineHeight: 16 },
  saveBtn: {
    backgroundColor: '#6C47FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 20,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
