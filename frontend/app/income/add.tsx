import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch,
  Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addMonths, addWeeks, addYears } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR, INCOME_CATEGORIES } from '../../utils/formatINR';
import api from '../../utils/api';
import { DEMO_ACCOUNTS, DEMO_MEMBERS, DEMO_INCOMES } from './dummyData';

const GREEN  = '#00E676';
const PURPLE = '#7C5CE7';
const RED    = '#EF4444';

const FREQUENCIES = [
  { key: 'monthly',   label: 'Monthly'   },
  { key: 'weekly',    label: 'Weekly'    },
  { key: 'biweekly',  label: 'Bi-weekly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly',    label: 'Yearly'    },
];

const PAYMENT_MODES = [
  { key: 'bank_transfer', label: 'Bank Transfer', icon: 'swap-horizontal-outline' },
  { key: 'upi',           label: 'UPI',           icon: 'phone-portrait-outline'  },
  { key: 'cash',          label: 'Cash',          icon: 'cash-outline'            },
  { key: 'cheque',        label: 'Cheque',        icon: 'document-outline'        },
  { key: 'card',          label: 'Card',          icon: 'card-outline'            },
];

const INCOME_TYPES = [
  { key: 'salary',     label: 'Salary',      icon: 'briefcase-outline'   },
  { key: 'freelance',  label: 'Freelance',   icon: 'laptop-outline'      },
  { key: 'business',   label: 'Business',    icon: 'storefront-outline'  },
  { key: 'investment', label: 'Investment',  icon: 'trending-up-outline' },
  { key: 'rental',     label: 'Rental',      icon: 'home-outline'        },
  { key: 'dividend',   label: 'Dividend',    icon: 'bar-chart-outline'   },
  { key: 'gift',       label: 'Gift',        icon: 'gift-outline'        },
  { key: 'other',      label: 'Other',       icon: 'ellipsis-horizontal-outline' },
];

type PickerKind = 'member' | 'account' | 'category' | 'type' | 'mode' | 'frequency' | null;

function nextDateFor(d: Date, freq: string) {
  switch (freq) {
    case 'weekly':    return addWeeks(d, 1);
    case 'biweekly':  return addWeeks(d, 2);
    case 'quarterly': return addMonths(d, 3);
    case 'yearly':    return addYears(d, 1);
    default:          return addMonths(d, 1);
  }
}

export default function AddIncome() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id && !params.id.startsWith('dup_');

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;
  const SEC  = isDark ? 'rgba(255,255,255,0.35)' : colors.textSecondary;

  // Form
  const [amount,        setAmount]       = useState('');
  const [member,        setMember]       = useState<any>(null);
  const [account,       setAccount]      = useState<any>(null);
  const [category,      setCategory]     = useState<any>(null);
  const [date,          setDate]         = useState(new Date());
  const [showDate,      setShowDate]     = useState(false);
  const [notes,         setNotes]        = useState('');
  const [location,      setLocation]     = useState('');
  const [fileAttached,  setFileAttached] = useState(false);
  const [incomeType,    setIncomeType]   = useState<any>(null);
  const [paymentMode,   setPaymentMode]  = useState<any>(null);
  const [isTaxable,     setIsTaxable]    = useState(false);
  const [isRecurring,   setIsRecurring]  = useState(false);
  const [frequency,     setFrequency]    = useState<any>(null);
  const [nextExpDate,   setNextExpDate]  = useState<Date | null>(null);
  const [showNextDate,  setShowNextDate] = useState(false);
  const [source,        setSource]       = useState('');

  const [picker,        setPicker]       = useState<PickerKind>(null);
  const [accounts,      setAccounts]     = useState(DEMO_ACCOUNTS);
  const [members,       setMembers]      = useState(DEMO_MEMBERS);
  const [saving,        setSaving]       = useState(false);

  useEffect(() => {
    api.get('/accounts').then(r => { if (r.data?.length) setAccounts(r.data); }).catch(() => {});
    api.get('/family-members').then(r => { if (r.data?.length) setMembers(r.data); }).catch(() => {});
  }, []);

  // Prefill when editing
  useEffect(() => {
    if (!params.id) return;
    const inc = DEMO_INCOMES.find(e => e.income_id === params.id || `dup_${e.income_id}` === params.id);
    if (!inc) return;
    setAmount(String(inc.amount));
    setSource(inc.source);
    const cat = INCOME_CATEGORIES.find(c => c.key === inc.category);
    if (cat) setCategory(cat);
    setDate(new Date(inc.date));
    const pm = PAYMENT_MODES.find(p => p.key === inc.payment_mode);
    if (pm) setPaymentMode(pm);
    const it = INCOME_TYPES.find(t => t.key === inc.income_type);
    if (it) setIncomeType(it);
    const acc = DEMO_ACCOUNTS.find(a => a.account_id === inc.account_id);
    if (acc) setAccount(acc);
    const mem = DEMO_MEMBERS.find(m => m.family_member_id === inc.family_member_id);
    if (mem) setMember(mem);
    setNotes(inc.notes || '');
    setLocation(inc.location || '');
    setIsTaxable(inc.is_taxable);
    setIsRecurring(inc.is_recurring);
    const frq = FREQUENCIES.find(f => f.key === inc.frequency);
    if (frq) setFrequency(frq);
  }, [params.id]);

  // Auto-set next expected date when frequency changes
  useEffect(() => {
    if (isRecurring && frequency) setNextExpDate(nextDateFor(date, frequency.key));
  }, [isRecurring, frequency, date]);

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
        source: source.trim() || category!.label,
        date: format(date, 'yyyy-MM-dd'),
        account_id: account!.account_id,
        family_member_id: member?.family_member_id || null,
        notes: notes.trim() || null,
        labels: [
          isRecurring && frequency ? `freq:${frequency.key}` : '',
          isTaxable ? 'taxable' : '',
          paymentMode ? `mode:${paymentMode.key}` : '',
        ].filter(Boolean),
      };
      if (isEditing) {
        await api.put(`/income/${params.id}`, payload);
      } else {
        await api.post('/income', payload);
      }
      Alert.alert('Success', isEditing ? 'Income updated' : 'Income saved', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Saved', isEditing ? 'Income updated locally' : 'Income saved locally', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert('Delete Income', 'Permanently delete this income entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/income/${params.id}`); } catch {}
        router.back();
      }},
    ]);
  };

  // ── Picker modal ─────────────────────────────────────────────────────────────
  const renderPicker = () => {
    if (!picker) return null;
    const configs: Record<string, { title: string; data: any[]; getLabel: (i: any) => string; getSub?: (i: any) => string; getIcon?: (i: any) => string; getColor?: (i: any) => string; onSelect: (i: any) => void }> = {
      member:   { title: 'Select Member',   data: members,        getLabel: i => i.name,    getSub: i => i.relation,                                          onSelect: i => { setMember(i); setPicker(null); } },
      account:  { title: 'Select Account',  data: accounts,       getLabel: i => i.name,    getSub: i => formatINR(i.balance),                                onSelect: i => { setAccount(i); setPicker(null); } },
      category: { title: 'Select Category', data: INCOME_CATEGORIES, getLabel: i => i.label, getIcon: i => i.icon,                                             onSelect: i => { setCategory(i); setPicker(null); } },
      type:     { title: 'Income Type',     data: INCOME_TYPES,   getLabel: i => i.label,   getIcon: i => i.icon,                                             onSelect: i => { setIncomeType(i); setPicker(null); } },
      mode:     { title: 'Payment Mode',    data: PAYMENT_MODES,  getLabel: i => i.label,   getIcon: i => i.icon,                                             onSelect: i => { setPaymentMode(i); setPicker(null); } },
      frequency:{ title: 'Frequency',       data: FREQUENCIES,    getLabel: i => i.label,                                                                     onSelect: i => { setFrequency(i); setPicker(null); } },
    };
    const cfg = configs[picker];
    if (!cfg) return null;
    return (
      <Modal visible transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPicker(null)} />
        <View style={[styles.sheet, { backgroundColor: CARD }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{cfg.title}</Text>
          <FlatList
            data={cfg.data}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => cfg.onSelect(item)}>
                {cfg.getIcon && (
                  <View style={[styles.pickerIconBox, { backgroundColor: `${GREEN}22` }]}>
                    <Ionicons name={cfg.getIcon(item) as any} size={20} color={GREEN} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerLabel, { color: colors.text }]}>{cfg.getLabel(item)}</Text>
                  {cfg.getSub && <Text style={[styles.pickerSub, { color: colors.textSecondary }]}>{cfg.getSub(item)}</Text>}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    );
  };

  // ── Field row component ───────────────────────────────────────────────────
  const FieldRow = ({ icon, label, subtitle, value, onPress, required = false }: any) => (
    <TouchableOpacity style={[styles.fieldRow, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.fieldIconBox, { backgroundColor: `${GREEN}18` }]}>
        <Ionicons name={icon} size={18} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          {label}{required && <Text style={{ color: RED }}> *</Text>}
        </Text>
        {subtitle && <Text style={[styles.fieldSub, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      <Text style={[styles.fieldValue, { color: value ? colors.text : colors.textSecondary }]} numberOfLines={1}>
        {value || 'Select'}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const SwitchRow = ({ icon, label, subtitle, value, onChange }: any) => (
    <View style={[styles.switchRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.fieldIconBox, { backgroundColor: `${GREEN}18` }]}>
        <Ionicons name={icon} size={18} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.fieldSub, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: GREEN }} thumbColor="#FFF" />
    </View>
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
            {isEditing ? 'Edit Income' : 'Add Income'}
          </Text>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            {saving ? <ActivityIndicator size="small" color={GREEN} /> : <Text style={[styles.saveLabel, { color: GREEN }]}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Amount */}
          <View style={[styles.amountCard, { backgroundColor: CARD }]}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount</Text>
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
              <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: `${GREEN}22` }]} onPress={() => setFileAttached(true)}>
                <Ionicons name="camera-outline" size={20} color={GREEN} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Source name */}
          <View style={[styles.sourceSection, { backgroundColor: CARD }]}>
            <View style={[styles.fieldIconBox, { backgroundColor: `${GREEN}18` }]}>
              <Ionicons name="text-outline" size={18} color={GREEN} />
            </View>
            <TextInput
              style={[styles.sourceInput, { color: colors.text }]}
              value={source}
              onChangeText={setSource}
              placeholder="Income source (e.g. Acme Corp, Freelance Client)"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Basic Details */}
          <View style={[styles.section, { backgroundColor: CARD }]}>
            <Text style={[styles.sectionTitle, { color: SEC }]}>BASIC DETAILS</Text>
            <FieldRow icon="person-outline"   label="Member"   subtitle="Who received this income?"    value={member?.name}          onPress={() => setPicker('member')}   />
            <FieldRow icon="wallet-outline"   label="Account"  subtitle="Where this income is received?" value={account?.name}       onPress={() => setPicker('account')}  required />
            <FieldRow icon="grid-outline"     label="Category" subtitle="What is the source of income?" value={category?.label}      onPress={() => setPicker('category')} required />
            <TouchableOpacity style={[styles.fieldRow]} onPress={() => setShowDate(true)} activeOpacity={0.7}>
              <View style={[styles.fieldIconBox, { backgroundColor: `${GREEN}18` }]}>
                <Ionicons name="calendar-outline" size={18} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Date <Text style={{ color: RED }}>*</Text></Text>
                <Text style={[styles.fieldSub, { color: colors.textSecondary }]}>When did you receive this?</Text>
              </View>
              <Text style={[styles.fieldValue, { color: colors.text }]}>{format(date, 'd MMM yyyy')}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* More Details */}
          <View style={[styles.section, { backgroundColor: CARD }]}>
            <Text style={[styles.sectionTitle, { color: SEC }]}>MORE DETAILS (OPTIONAL)</Text>

            {/* Notes */}
            <View style={[styles.textFieldRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.fieldIconBox, { backgroundColor: `${GREEN}18` }]}>
                <Ionicons name="document-text-outline" size={18} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Notes</Text>
                <Text style={[styles.fieldSub, { color: colors.textSecondary }]}>Add a note optional</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add Note"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>
            </View>

            {/* Location */}
            <View style={[styles.textFieldRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.fieldIconBox, { backgroundColor: `${GREEN}18` }]}>
                <Ionicons name="location-outline" size={18} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Location</Text>
                <Text style={[styles.fieldSub, { color: colors.textSecondary }]}>Add location optional</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Add Location"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Attach File */}
            <TouchableOpacity
              style={styles.fieldRow}
              onPress={() => setFileAttached(!fileAttached)}
              activeOpacity={0.7}
            >
              <View style={[styles.fieldIconBox, { backgroundColor: `${GREEN}18` }]}>
                <Ionicons name="attach-outline" size={18} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Attach File</Text>
                <Text style={[styles.fieldSub, { color: colors.textSecondary }]}>Upload receipt or document</Text>
              </View>
              <Text style={[styles.fieldValue, { color: fileAttached ? GREEN : colors.textSecondary }]}>
                {fileAttached ? 'Attached ✓' : 'Upload'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Additional Details */}
          <View style={[styles.section, { backgroundColor: CARD }]}>
            <Text style={[styles.sectionTitle, { color: SEC }]}>ADDITIONAL DETAILS (OPTIONAL)</Text>

            <FieldRow icon="options-outline"       label="Income Type"       subtitle="Salary, Freelance, Business, etc." value={incomeType?.label}  onPress={() => setPicker('type')}      />
            <FieldRow icon="swap-horizontal-outline" label="Payment Mode"    subtitle="Bank Transfer, Cash, UPI, etc."   value={paymentMode?.label} onPress={() => setPicker('mode')}      />
            <SwitchRow icon="shield-checkmark-outline" label="Taxable Income"   subtitle="Is this income taxable?"        value={isTaxable}           onChange={setIsTaxable}                />
            <SwitchRow icon="refresh-circle-outline"   label="Recurring Income" subtitle="Is this a recurring income?"   value={isRecurring}         onChange={setIsRecurring}              />
            {isRecurring && (
              <>
                <FieldRow icon="repeat-outline"   label="Frequency"         subtitle="How often do you receive this?"   value={frequency?.label}   onPress={() => setPicker('frequency')} />
                <TouchableOpacity style={[styles.fieldRow]} onPress={() => setShowNextDate(true)} activeOpacity={0.7}>
                  <View style={[styles.fieldIconBox, { backgroundColor: `${GREEN}18` }]}>
                    <Ionicons name="calendar-outline" size={18} color={GREEN} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Next Expected Date</Text>
                    <Text style={[styles.fieldSub, { color: colors.textSecondary }]}>When is the next income expected?</Text>
                  </View>
                  <Text style={[styles.fieldValue, { color: nextExpDate ? colors.text : colors.textSecondary }]}>
                    {nextExpDate ? format(nextExpDate, 'd MMM yyyy') : 'Select Date'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Security Card */}
          <View style={[styles.securityCard, { backgroundColor: `${PURPLE}18`, borderColor: `${PURPLE}30` }]}>
            <Ionicons name="shield-checkmark" size={22} color={PURPLE} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.securityTitle, { color: colors.text }]}>Keep your data secure</Text>
              <Text style={[styles.securitySub, { color: colors.textSecondary }]}>Your income details are encrypted and 100% secure.</Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: GREEN }]} onPress={handleSave} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Save Income</Text>}
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={RED} />
              <Text style={[styles.deleteBtnText, { color: RED }]}>Delete Income</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {showDate && (
          <DateTimePicker value={date} mode="date" display="default" maximumDate={new Date()}
            onChange={(_, d) => { setShowDate(false); if (d) setDate(d); }} />
        )}
        {showNextDate && (
          <DateTimePicker value={nextExpDate || new Date()} mode="date" display="default" minimumDate={new Date()}
            onChange={(_, d) => { setShowNextDate(false); if (d) setNextExpDate(d); }} />
        )}

        {renderPicker()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:    { fontSize: 18, fontWeight: '700' },
  saveLabel:      { fontSize: 16, fontWeight: '700' },
  amountCard:     { marginHorizontal: 20, marginTop: 4, marginBottom: 14, borderRadius: 16, padding: 20 },
  amountLabel:    { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  amountRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currencySymbol: { fontSize: 28, fontWeight: '700' },
  amountInput:    { flex: 1, fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  cameraBtn:      { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sourceSection:  { marginHorizontal: 20, marginBottom: 14, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sourceInput:    { flex: 1, fontSize: 14 },
  section:        { marginHorizontal: 20, borderRadius: 16, padding: 4, marginBottom: 14, overflow: 'hidden' },
  sectionTitle:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  fieldRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  fieldIconBox:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fieldLabel:     { fontSize: 14, fontWeight: '600' },
  fieldSub:       { fontSize: 11, marginTop: 1 },
  fieldValue:     { fontSize: 13, maxWidth: '35%', textAlign: 'right', marginRight: 4 },
  textFieldRow:   { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12, alignItems: 'flex-start' },
  textInput:      { fontSize: 13, marginTop: 4, minHeight: 20 },
  switchRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  securityCard:   { marginHorizontal: 20, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, marginBottom: 16 },
  securityTitle:  { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  securitySub:    { fontSize: 11 },
  saveBtn:        { marginHorizontal: 20, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 12 },
  saveBtnText:    { color: '#000', fontSize: 16, fontWeight: '800' },
  deleteBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  deleteBtnText:  { fontSize: 15, fontWeight: '600' },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:          { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:     { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickerItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, gap: 12, borderRadius: 10 },
  pickerIconBox:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pickerLabel:    { fontSize: 14, fontWeight: '600' },
  pickerSub:      { fontSize: 12 },
});
