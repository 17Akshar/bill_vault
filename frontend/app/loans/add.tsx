/**
 * AddLoanScreen — matches reference design exactly
 * Supports: Add, Edit (loan_id param), Delete
 * Validation: EMI required, no negative amounts or rates
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOAN_TYPES = [
  { key: 'home',     label: 'Home Loan',           icon: 'home-outline',     color: '#5B4FFF' },
  { key: 'car',      label: 'Car Loan',             icon: 'car-outline',      color: '#22C55E' },
  { key: 'personal', label: 'Personal Loan',        icon: 'person-outline',   color: '#F97316' },
  { key: 'education',label: 'Education Loan',       icon: 'school-outline',   color: '#3B82F6' },
  { key: 'gold',     label: 'Gold Loan',            icon: 'diamond-outline',  color: '#EAB308' },
  { key: 'business', label: 'Business Loan',        icon: 'briefcase-outline',color: '#0EA5E9' },
  { key: 'property', label: 'Loan Against Property',icon: 'business-outline', color: '#EC4899' },
  { key: 'vehicle',  label: 'Two-Wheeler Loan',     icon: 'bicycle-outline',  color: '#14B8A6' },
  { key: 'other',    label: 'Other',                icon: 'cash-outline',     color: '#8B5CF6' },
];

const BANKS = [
  'HDFC Bank','SBI','ICICI Bank','Axis Bank','Kotak Mahindra Bank',
  'Bank of Baroda','Punjab National Bank','Canara Bank','Union Bank',
  'Indian Bank','Yes Bank','IDFC First Bank','IndusInd Bank',
  'Federal Bank','RBL Bank','Bajaj Finserv','Tata Capital',
  'LIC Housing Finance','PNB Housing Finance','Other',
];

const TENURES = [
  { label:'1 Year',  months:12 },{ label:'2 Years', months:24 },
  { label:'3 Years', months:36 },{ label:'5 Years', months:60 },
  { label:'7 Years', months:84 },{ label:'10 Years',months:120 },
  { label:'12 Years',months:144},{ label:'15 Years',months:180 },
  { label:'20 Years',months:240},{ label:'25 Years',months:300 },
  { label:'30 Years',months:360},
];

const EMI_DAYS = [1,3,5,7,10,15,18,20,25,28];

const RATE_TYPES = [
  { key:'fixed',    label:'Fixed',    icon:'lock-closed-outline' },
  { key:'floating', label:'Floating', icon:'trending-up-outline' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Bottom Sheet Picker ──────────────────────────────────────────────────────

interface PickerItem { key: string; label: string; icon?: string; iconColor?: string }

function SheetPicker({
  visible, title, items, selectedKey, onSelect, onClose, colors,
}: {
  visible: boolean; title: string; items: PickerItem[];
  selectedKey: string; onSelect: (key: string, label: string) => void;
  onClose: () => void; colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sp.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[sp.sheet, { backgroundColor: colors.card }]}>
        <View style={[sp.handle, { backgroundColor: colors.border }]} />
        <View style={[sp.header, { borderBottomColor: colors.border }]}>
          <Text style={[sp.title, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={i => i.key}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = selectedKey === item.key;
            return (
              <TouchableOpacity
                style={[sp.row, isSelected && { backgroundColor: '#5B4FFF0D' }]}
                onPress={() => { onSelect(item.key, item.label); onClose(); }}
              >
                {item.icon && (
                  <View style={[sp.rowIcon, { backgroundColor: (item.iconColor || '#5B4FFF') + '18' }]}>
                    <Ionicons name={item.icon as any} size={16} color={item.iconColor || '#5B4FFF'} />
                  </View>
                )}
                <Text style={[sp.rowText, { color: colors.text }, isSelected && { color: '#5B4FFF', fontWeight: '700' }]}>
                  {item.label}
                </Text>
                {isSelected && <Ionicons name="checkmark-circle" size={18} color="#5B4FFF" />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const sp = StyleSheet.create({
  overlay:  { position:'absolute', top:0,left:0,right:0,bottom:0, backgroundColor:'rgba(0,0,0,0.45)' },
  sheet:    { borderTopLeftRadius:22, borderTopRightRadius:22, maxHeight:'72%', paddingBottom:36 },
  handle:   { width:36, height:4, borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 },
  header:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingVertical:16, borderBottomWidth:1 },
  title:    { fontSize:16, fontWeight:'700' },
  row:      { flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingVertical:14, gap:12 },
  rowIcon:  { width:32, height:32, borderRadius:10, alignItems:'center', justifyContent:'center' },
  rowText:  { flex:1, fontSize:15 },
});

// ─── Reusable Field Components ────────────────────────────────────────────────

function FieldLabel({ label, required, colors }: { label: string; required?: boolean; colors: any }) {
  return (
    <Text style={[fl.label, { color: colors.textSecondary }]}>
      {label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}
    </Text>
  );
}
const fl = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', marginBottom: 7, letterSpacing: 0.1 },
});

interface InputBoxProps {
  icon: string; iconColor?: string; placeholder: string;
  value: string; onChangeText: (t: string) => void;
  keyboardType?: any; prefix?: string;
  multiline?: boolean; error?: string; colors: any; testID?: string;
}
function InputBox({ icon, iconColor='#5B4FFF', placeholder, value, onChangeText, keyboardType='default', prefix, multiline, error, colors, testID }: InputBoxProps) {
  return (
    <>
      <View style={[ib.wrap, { borderColor: error ? '#EF4444' : colors.border, backgroundColor: colors.card }, multiline && { alignItems:'flex-start', paddingTop:12 }]}>
        <Ionicons name={icon as any} size={16} color={iconColor} style={ib.icon} />
        {prefix && <Text style={[ib.prefix, { color: colors.textSecondary }]}>{prefix}</Text>}
        <TextInput
          testID={testID}
          style={[ib.input, { color: colors.text }, multiline && { height: 72, textAlignVertical:'top' }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
        />
      </View>
      {!!error && <Text style={ib.errorText}>{error}</Text>}
    </>
  );
}
const ib = StyleSheet.create({
  wrap:      { flexDirection:'row', alignItems:'center', borderWidth:1.2, borderRadius:12, paddingHorizontal:12, paddingVertical:11, minHeight:48 },
  icon:      { marginRight:8 },
  prefix:    { fontSize:14, fontWeight:'600', marginRight:4 },
  input:     { flex:1, fontSize:15 },
  errorText: { color:'#EF4444', fontSize:11, marginTop:4, marginLeft:2 },
});

interface SelectBoxProps {
  icon: string; iconColor?: string; placeholder: string;
  value: string; onPress: () => void; error?: string; colors: any; testID?: string;
}
function SelectBox({ icon, iconColor='#5B4FFF', placeholder, value, onPress, error, colors, testID }: SelectBoxProps) {
  return (
    <>
      <TouchableOpacity
        testID={testID}
        style={[sb.wrap, { borderColor: error ? '#EF4444' : colors.border, backgroundColor: colors.card }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons name={icon as any} size={16} color={iconColor} style={sb.icon} />
        <Text style={[sb.text, { color: value ? colors.text : colors.textSecondary }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={15} color={colors.textSecondary} />
      </TouchableOpacity>
      {!!error && <Text style={sb.errorText}>{error}</Text>}
    </>
  );
}
const sb = StyleSheet.create({
  wrap:      { flexDirection:'row', alignItems:'center', borderWidth:1.2, borderRadius:12, paddingHorizontal:12, paddingVertical:11, minHeight:48 },
  icon:      { marginRight:8 },
  text:      { flex:1, fontSize:15 },
  errorText: { color:'#EF4444', fontSize:11, marginTop:4, marginLeft:2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddLoanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { loan_id } = useLocalSearchParams<{ loan_id?: string }>();
  const isEdit = !!loan_id;

  // ── form state ──
  const [loanType,       setLoanType]       = useState('home');
  const [lender,         setLender]         = useState('');
  const [accountNumber,  setAccountNumber]  = useState('');
  const [loanDate,       setLoanDate]       = useState(new Date());
  const [tenureMonths,   setTenureMonths]   = useState(240);
  const [tenureLabel,    setTenureLabel]    = useState('20 Years');
  const [principalAmt,   setPrincipalAmt]   = useState('');
  const [interestRate,   setInterestRate]   = useState('');
  const [rateType,       setRateType]       = useState<'fixed'|'floating'>('fixed');
  const [emiAmount,      setEmiAmount]      = useState('');
  const [emiDay,         setEmiDay]         = useState(5);
  const [processingFee,  setProcessingFee]  = useState('');
  const [otherCharges,   setOtherCharges]   = useState('');
  const [linkedAccount,  setLinkedAccount]  = useState('');
  const [notes,          setNotes]          = useState('');

  // ── ui state ──
  const [errors,        setErrors]        = useState<Record<string,string>>({});
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingEdit,   setLoadingEdit]   = useState(isEdit);
  const [accounts,      setAccounts]      = useState<any[]>([]);

  // ── pickers ──
  const [activePicker, setActivePicker] = useState<
    'loanType'|'lender'|'tenure'|'rateType'|'emiDay'|'account'|null
  >(null);

  // ── derived ──
  const selectedType  = LOAN_TYPES.find(t => t.key === loanType)!;
  const selectedRate  = RATE_TYPES.find(r => r.key === rateType)!;
  const emiDayLabel   = emiDay ? `${ordinal(emiDay)} of every month` : '';
  const selectedAcct  = accounts.find(a => a.account_id === linkedAccount);

  // Load accounts
  useEffect(() => {
    api.get('/accounts').then(r => setAccounts(r.data || [])).catch(() => {});
  }, []);

  // Load existing loan for edit mode
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/loans/${loan_id}`)
      .then(r => {
        const l = r.data;
        setLoanType(l.loan_type || 'home');
        setLender(l.lender || '');
        setAccountNumber(l.account_number || '');
        if (l.start_date) setLoanDate(new Date(l.start_date));
        const tm = l.tenure_months || 240;
        setTenureMonths(tm);
        const found = TENURES.find(t => t.months === tm);
        setTenureLabel(found ? found.label : `${Math.round(tm/12)} Years`);
        setPrincipalAmt(l.principal_amount ? String(l.principal_amount) : '');
        setInterestRate(l.interest_rate != null ? String(l.interest_rate) : '');
        setRateType(l.interest_type || 'fixed');
        setEmiAmount(l.emi_amount ? String(l.emi_amount) : '');
        setEmiDay(l.emi_day || 5);
        setProcessingFee(l.processing_fee ? String(l.processing_fee) : '');
        setOtherCharges(l.other_charges ? String(l.other_charges) : '');
        setLinkedAccount(l.linked_account_id || '');
        setNotes(l.notes || '');
      })
      .catch(() => Alert.alert('Error', 'Failed to load loan'))
      .finally(() => setLoadingEdit(false));
  }, [loan_id]);

  // ─── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string,string> = {};
    const emi  = parseFloat(emiAmount);
    const amt  = parseFloat(principalAmt.replace(/,/g,''));
    const rate = parseFloat(interestRate);
    const fee  = parseFloat(processingFee);
    const oth  = parseFloat(otherCharges);

    if (!emiAmount.trim())      e.emi = 'EMI amount is required';
    else if (isNaN(emi))        e.emi = 'Enter a valid number';
    else if (emi <= 0)          e.emi = 'EMI must be greater than 0';

    if (principalAmt && !isNaN(amt) && amt < 0) e.principal = 'Amount cannot be negative';

    if (interestRate && !isNaN(rate) && rate < 0) e.interest = 'Interest rate cannot be negative';

    if (processingFee && !isNaN(fee) && fee < 0) e.fee = 'Fee cannot be negative';

    if (otherCharges  && !isNaN(oth) && oth < 0) e.other = 'Charges cannot be negative';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ─── Save / Update ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const emi  = parseFloat(emiAmount);
      const amt  = parseFloat(principalAmt.replace(/,/g,'') || '0');
      const rate = parseFloat(interestRate || '0');
      const fee  = parseFloat(processingFee || '0');
      const oth  = parseFloat(otherCharges  || '0');

      const loanName = `${selectedType.label}${lender ? ` - ${lender}` : ''}`;

      const nextEmi = (() => {
        const d = new Date(loanDate);
        d.setDate(emiDay); d.setMonth(d.getMonth() + 1);
        return d.toISOString();
      })();

      const payload = {
        name: loanName, loan_type: loanType, lender: lender || null,
        account_number: accountNumber || null,
        principal_amount: amt, outstanding_amount: isEdit ? undefined : amt,
        interest_rate: rate, interest_type: rateType,
        emi_amount: emi, emi_day: emiDay,
        tenure_months: tenureMonths, tenure_years: tenureMonths / 12,
        start_date: loanDate.toISOString(), next_emi_date: nextEmi,
        processing_fee: fee, other_charges: oth,
        linked_account_id: linkedAccount || null,
        notes: notes || null, status: 'active',
      };

      if (isEdit) {
        await api.put(`/loans/${loan_id}`, payload);
      } else {
        await api.post('/loans', payload);
      }
      if (router.canGoBack()) router.back();
      else router.replace('/loans' as any);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to save loan');
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.delete(`/loans/${loan_id}`);
      setShowDeleteConfirm(false);
      router.replace('/loans' as any);
    } catch {
      setShowDeleteConfirm(false);
      Alert.alert('Error', 'Failed to delete loan');
    } finally {
      setDeleting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loadingEdit) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#5B4FFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* ══ Header ══ */}
        <View style={s.header}>
          <TouchableOpacity
            testID="add-loan-back"
            onPress={() => router.back()}
            style={s.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            {isEdit ? 'Edit Loan' : 'Add Loan'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          {/* ── Section title ── */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>Loan Details</Text>
          <Text style={[s.sectionSub,   { color: colors.textSecondary }]}>
            Enter the details of your loan
          </Text>

          {/* ── 1. Loan Type ── */}
          <View style={s.field}>
            <FieldLabel label="Loan Type" colors={colors} />
            <SelectBox
              testID="select-loan-type"
              icon={selectedType.icon}
              iconColor={selectedType.color}
              placeholder="Select Loan Type"
              value={selectedType.label}
              onPress={() => setActivePicker('loanType')}
              colors={colors}
            />
          </View>

          {/* ── 2. Lender / Bank ── */}
          <View style={s.field}>
            <FieldLabel label="Lender / Bank" colors={colors} />
            <SelectBox
              testID="select-lender"
              icon="business-outline"
              placeholder="Select Bank / Lender"
              value={lender}
              onPress={() => setActivePicker('lender')}
              colors={colors}
            />
          </View>

          {/* ── 3. Loan Account Number ── */}
          <View style={s.field}>
            <FieldLabel label="Loan Account Number (Optional)" colors={colors} />
            <InputBox
              testID="input-account-number"
              icon="document-text-outline"
              placeholder="Enter loan account number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              colors={colors}
            />
          </View>

          {/* ── 4. Date + Tenure ── */}
          <View style={s.twoCol}>
            <View style={s.col}>
              <FieldLabel label="Date of Loan Taken" colors={colors} />
              <CrossPlatformPicker
                value={loanDate}
                onChange={setLoanDate}
                mode="date"
                label="Select Date"
                colors={colors}
              />
            </View>
            <View style={s.col}>
              <FieldLabel label="Loan Tenure" colors={colors} />
              <SelectBox
                testID="select-tenure"
                icon="timer-outline"
                placeholder="Select Tenure"
                value={tenureLabel}
                onPress={() => setActivePicker('tenure')}
                colors={colors}
              />
            </View>
          </View>

          {/* ── 5. Total Loan Amount ── */}
          <View style={s.field}>
            <FieldLabel label="Total Loan Amount" colors={colors} />
            <InputBox
              testID="input-principal"
              icon="cash-outline"
              placeholder="15,00,000"
              value={principalAmt}
              onChangeText={setPrincipalAmt}
              keyboardType="decimal-pad"
              prefix="₹"
              error={errors.principal}
              colors={colors}
            />
          </View>

          {/* ── 6. Interest Rate + Rate Type ── */}
          <View style={s.twoCol}>
            <View style={s.col}>
              <FieldLabel label="Interest Rate (p.a.)" colors={colors} />
              <InputBox
                testID="input-interest-rate"
                icon="trending-up-outline"
                placeholder="8.50"
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="decimal-pad"
                prefix="%"
                error={errors.interest}
                colors={colors}
              />
            </View>
            <View style={s.col}>
              <FieldLabel label="Loan Type" colors={colors} />
              <SelectBox
                testID="select-rate-type"
                icon={selectedRate.icon}
                placeholder="Fixed / Floating"
                value={selectedRate.label}
                onPress={() => setActivePicker('rateType')}
                colors={colors}
              />
            </View>
          </View>

          {/* ── 7. EMI Amount + EMI Date ── */}
          <View style={s.twoCol}>
            <View style={s.col}>
              <FieldLabel label="EMI Amount" required colors={colors} />
              <InputBox
                testID="input-emi-amount"
                icon="repeat-outline"
                placeholder="32,750"
                value={emiAmount}
                onChangeText={t => { setEmiAmount(t); if (errors.emi) setErrors(prev => ({...prev, emi:''})); }}
                keyboardType="decimal-pad"
                prefix="₹"
                error={errors.emi}
                colors={colors}
              />
            </View>
            <View style={s.col}>
              <FieldLabel label="EMI Date" colors={colors} />
              <SelectBox
                testID="select-emi-day"
                icon="calendar-outline"
                placeholder="Select Day"
                value={emiDayLabel}
                onPress={() => setActivePicker('emiDay')}
                colors={colors}
              />
            </View>
          </View>

          {/* ── 8. Processing Fee + Other Charges ── */}
          <View style={s.twoCol}>
            <View style={s.col}>
              <FieldLabel label="Processing Fee (Optional)" colors={colors} />
              <InputBox
                icon="pricetag-outline"
                placeholder="0"
                value={processingFee}
                onChangeText={setProcessingFee}
                keyboardType="decimal-pad"
                prefix="₹"
                error={errors.fee}
                colors={colors}
              />
            </View>
            <View style={s.col}>
              <FieldLabel label="Other Charges (Optional)" colors={colors} />
              <InputBox
                icon="receipt-outline"
                placeholder="0"
                value={otherCharges}
                onChangeText={setOtherCharges}
                keyboardType="decimal-pad"
                prefix="₹"
                error={errors.other}
                colors={colors}
              />
            </View>
          </View>

          {/* ── 9. Linked Account ── */}
          <View style={s.field}>
            <FieldLabel label="Linked Account (Optional)" colors={colors} />
            <SelectBox
              testID="select-linked-account"
              icon="wallet-outline"
              placeholder="Select Account"
              value={selectedAcct ? (selectedAcct.name || selectedAcct.bank_name || 'Account') : ''}
              onPress={() => setActivePicker('account')}
              colors={colors}
            />
          </View>

          {/* ── 10. Notes ── */}
          <View style={s.field}>
            <FieldLabel label="Notes (Optional)" colors={colors} />
            <InputBox
              icon="document-text-outline"
              placeholder="Add any notes about this loan"
              value={notes}
              onChangeText={setNotes}
              multiline
              colors={colors}
            />
          </View>

          {/* ── Info Banner ── */}
          <View style={[s.banner, { backgroundColor: '#5B4FFF0D', borderColor: '#5B4FFF28' }]}>
            <View style={s.bannerIcon}>
              <Ionicons name="time-outline" size={18} color="#5B4FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>EMI will be tracked automatically</Text>
              <Text style={s.bannerSub}>
                You will get reminders and EMI tracking based on the details above.
              </Text>
            </View>
          </View>

          {/* ── Delete (edit mode only) ── */}
          {isEdit && (
            <TouchableOpacity
              testID="delete-loan-btn"
              style={[s.deleteBtn, deleting && { opacity: 0.6 }]}
              onPress={() => setShowDeleteConfirm(true)}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator color="#EF4444" size="small" />
                : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={s.deleteBtnText}>Delete Loan</Text>
                  </>
                )}
            </TouchableOpacity>
          )}

          {/* ── Save / Update button ── */}
          <TouchableOpacity
            testID="save-loan-btn"
            style={[s.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.saveBtnText}>{isEdit ? 'Update Loan' : 'Save Loan'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ══ Pickers ══ */}

      {/* Loan Type */}
      <SheetPicker
        visible={activePicker === 'loanType'}
        title="Select Loan Type"
        items={LOAN_TYPES.map(t => ({ key: t.key, label: t.label, icon: t.icon, iconColor: t.color }))}
        selectedKey={loanType}
        onSelect={(key) => setLoanType(key)}
        onClose={() => setActivePicker(null)}
        colors={colors}
      />

      {/* Lender */}
      <SheetPicker
        visible={activePicker === 'lender'}
        title="Select Bank / Lender"
        items={BANKS.map(b => ({ key: b, label: b, icon: 'business-outline', iconColor: '#5B4FFF' }))}
        selectedKey={lender}
        onSelect={(key) => setLender(key)}
        onClose={() => setActivePicker(null)}
        colors={colors}
      />

      {/* Tenure */}
      <SheetPicker
        visible={activePicker === 'tenure'}
        title="Select Loan Tenure"
        items={TENURES.map(t => ({ key: String(t.months), label: t.label, icon: 'timer-outline', iconColor: '#5B4FFF' }))}
        selectedKey={String(tenureMonths)}
        onSelect={(key, label) => { setTenureMonths(parseInt(key)); setTenureLabel(label); }}
        onClose={() => setActivePicker(null)}
        colors={colors}
      />

      {/* Rate Type */}
      <SheetPicker
        visible={activePicker === 'rateType'}
        title="Select Rate Type"
        items={RATE_TYPES.map(r => ({ key: r.key, label: r.label, icon: r.icon, iconColor: '#5B4FFF' }))}
        selectedKey={rateType}
        onSelect={(key) => setRateType(key as 'fixed' | 'floating')}
        onClose={() => setActivePicker(null)}
        colors={colors}
      />

      {/* EMI Day */}
      <SheetPicker
        visible={activePicker === 'emiDay'}
        title="EMI Date (Day of Month)"
        items={EMI_DAYS.map(d => ({ key: String(d), label: `${ordinal(d)} of every month`, icon: 'calendar-outline', iconColor: '#5B4FFF' }))}
        selectedKey={String(emiDay)}
        onSelect={(key) => setEmiDay(parseInt(key))}
        onClose={() => setActivePicker(null)}
        colors={colors}
      />

      {/* Linked Account */}
      <SheetPicker
        visible={activePicker === 'account'}
        title="Select Linked Account"
        items={[
          { key: '', label: 'None', icon: 'close-circle-outline', iconColor: '#9CA3AF' },
          ...accounts.map(a => ({
            key:      a.account_id,
            label:    a.name || a.bank_name || 'Account',
            icon:     'wallet-outline',
            iconColor:'#5B4FFF',
          })),
        ]}
        selectedKey={linkedAccount}
        onSelect={(key) => setLinkedAccount(key)}
        onClose={() => setActivePicker(null)}
        colors={colors}
      />

      {/* Custom Delete Confirmation */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteConfirm(false)}
      >
        <View style={dc.overlay}>
          <View style={[dc.box, { backgroundColor: colors.card }]}>
            <View style={dc.iconCircle}>
              <Ionicons name="trash" size={26} color="#EF4444" />
            </View>
            <Text style={[dc.title, { color: colors.text }]}>Delete Loan?</Text>
            <Text style={[dc.body, { color: colors.textSecondary }]}>
              This will permanently remove this loan and all related data. This action cannot be undone.
            </Text>
            <View style={dc.actions}>
              <TouchableOpacity
                testID="delete-cancel-btn"
                style={[dc.btn, { borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                <Text style={[dc.btnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="delete-confirm-btn"
                style={[dc.btn, dc.confirmBtn, deleting && { opacity: 0.6 }]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={[dc.btnText, { color: '#FFF' }]}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  center:    { flex:1, justifyContent:'center', alignItems:'center' },
  container: { flex:1 },

  header: {
    flexDirection:'row', alignItems:'center',
    paddingHorizontal:16, paddingVertical:14,
  },
  backBtn:     { padding:4, marginRight:8 },
  headerTitle: { flex:1, fontSize:20, fontWeight:'700', textAlign:'center', marginRight:40 },

  scroll:       { paddingHorizontal:16, paddingBottom:48 },
  sectionTitle: { fontSize:22, fontWeight:'800', marginTop:8, marginBottom:4 },
  sectionSub:   { fontSize:13, marginBottom:22, lineHeight:18 },

  field:  { marginBottom:18 },
  twoCol: { flexDirection:'row', gap:12, marginBottom:18 },
  col:    { flex:1 },

  banner: {
    flexDirection:'row', alignItems:'flex-start', gap:12,
    padding:14, borderRadius:14, borderWidth:1, marginBottom:20,
  },
  bannerIcon:  { marginTop:1 },
  bannerTitle: { color:'#5B4FFF', fontWeight:'700', fontSize:13, marginBottom:3 },
  bannerSub:   { color:'#5B4FFF99', fontSize:11, lineHeight:16 },

  deleteBtn: {
    flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
    borderWidth:1.5, borderColor:'#EF444440', borderRadius:14,
    paddingVertical:14, marginBottom:12,
  },
  deleteBtnText: { color:'#EF4444', fontWeight:'700', fontSize:15 },

  saveBtn:     { backgroundColor:'#5B4FFF', borderRadius:14, paddingVertical:16, alignItems:'center', marginBottom:12 },
  saveBtnText: { color:'#FFF', fontSize:16, fontWeight:'700' },
});

const dc = StyleSheet.create({
  overlay:    { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center', padding:24 },
  box:        { width:'100%', maxWidth:340, borderRadius:20, padding:24, alignItems:'center' },
  iconCircle: { width:60, height:60, borderRadius:30, backgroundColor:'#FEE2E2', alignItems:'center', justifyContent:'center', marginBottom:14 },
  title:      { fontSize:18, fontWeight:'800', marginBottom:6 },
  body:       { fontSize:13, textAlign:'center', lineHeight:19, marginBottom:18 },
  actions:    { flexDirection:'row', gap:10, width:'100%' },
  btn:        { flex:1, paddingVertical:13, borderRadius:11, alignItems:'center' },
  confirmBtn: { backgroundColor:'#EF4444' },
  btnText:    { fontSize:14, fontWeight:'700' },
});
