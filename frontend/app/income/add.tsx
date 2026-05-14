import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format, addMonths, addWeeks, addYears } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR, INCOME_CATEGORIES, ACCOUNT_TYPE_META } from '../../utils/formatINR';

const PURPLE      = '#7C4DFF';
const PURPLE_DARK = '#5B2FBF';
const GREEN       = '#00E676';
const GREEN_DEEP  = '#00C853';
const RED         = '#FF5252';

const FREQUENCIES = [
  { key: 'monthly',  label: 'Monthly' },
  { key: 'weekly',   label: 'Weekly' },
  { key: 'biweekly', label: 'Bi-weekly' },
  { key: 'quarterly',label: 'Quarterly' },
  { key: 'yearly',   label: 'Yearly' },
];
const PAYMENT_MODES = [
  { key: 'bank_transfer', label: 'Bank Transfer' },
  { key: 'cash',          label: 'Cash' },
  { key: 'upi',           label: 'UPI' },
  { key: 'cheque',        label: 'Cheque' },
  { key: 'card',          label: 'Card' },
];
const INCOME_TYPES = [
  { key: 'salary',     label: 'Salary' },
  { key: 'freelance',  label: 'Freelance' },
  { key: 'business',   label: 'Business' },
  { key: 'investment', label: 'Investment' },
  { key: 'rental',     label: 'Rental' },
  { key: 'gift',       label: 'Gift' },
  { key: 'other',      label: 'Other' },
];

type PickerKind = 'member' | 'account' | 'category' | 'type' | 'mode' | 'frequency' | null;

function nextDate(d: Date, freq: string) {
  switch (freq) {
    case 'weekly':    return addWeeks(d, 1);
    case 'biweekly':  return addWeeks(d, 2);
    case 'quarterly': return addMonths(d, 3);
    case 'yearly':    return addYears(d, 1);
    default:          return addMonths(d, 1);
  }
}

// ─── List row primitive ──────────────────────────────────────────────────────
function Row({ icon, title, subtitle, value, valueColor, onPress, last, colors, isDark, testID, right }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[s.row, !last && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}
      activeOpacity={onPress ? 0.7 : 1}
      testID={testID}
    >
      <View style={[s.rowIcon, { backgroundColor: GREEN + '1A' }]}>
        <Ionicons name={icon} size={18} color={GREEN_DEEP} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', letterSpacing: -0.1 }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
      </View>
      {right || (
        <>
          <Text style={{ color: valueColor || PURPLE, fontSize: 13, fontWeight: '700', maxWidth: 130, textAlign: 'right' }} numberOfLines={1}>
            {value}
          </Text>
          {!!onPress && <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} />}
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Bottom-sheet style picker ────────────────────────────────────────────────
function Picker({ visible, title, items, selected, onClose, onSelect, colors, isDark }: any) {
  const CARD_BG = isDark ? '#1C1C2E' : colors.card;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={s.modalBg}>
        <View />
      </TouchableOpacity>
      <View style={[s.sheet, { backgroundColor: CARD_BG }]}>
        <View style={s.sheetHandle} />
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: -0.2, marginBottom: 10 }}>{title}</Text>
        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
          {items.map((it: any, i: number) => {
            const active = it.key === selected;
            return (
              <TouchableOpacity
                key={it.key}
                onPress={() => { onSelect(it); onClose(); }}
                style={[s.sheetRow, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}
                activeOpacity={0.7}
                testID={`picker-item-${it.key}`}
              >
                {it.icon && (
                  <View style={[s.sheetIcon, { backgroundColor: (it.color || PURPLE) + '22' }]}>
                    <Ionicons name={it.icon as any} size={18} color={it.color || PURPLE} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{it.label}</Text>
                  {!!it.subtitle && <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{it.subtitle}</Text>}
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={GREEN_DEEP} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function AddIncomeScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id;
  const isEdit = !!editId;

  const [loading, setLoading]   = useState(isEdit);
  const [saving, setSaving]     = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [members, setMembers]   = useState<any[]>([]);

  // Form state
  const [amount, setAmount]         = useState('');
  const [source, setSource]         = useState('');
  const [memberId, setMemberId]     = useState<string | null>(null);
  const [accountId, setAccountId]   = useState<string>('');
  const [category, setCategory]     = useState<string>('salary');
  const [date, setDate]             = useState(new Date());
  const [notes, setNotes]           = useState('');
  const [location, setLocation]     = useState('');
  const [incomeType, setIncomeType] = useState<string>('salary');
  const [paymentMode, setPaymentMode] = useState<string>('bank_transfer');
  const [taxable, setTaxable]       = useState(false);
  const [recurring, setRecurring]   = useState(false);
  const [frequency, setFrequency]   = useState('monthly');
  const [nextExpected, setNextExpected] = useState<Date | null>(null);

  // Picker state
  const [picker, setPicker] = useState<PickerKind>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [dateInput, setDateInput] = useState('');

  const CARD_BG = isDark ? '#1C1C2E' : colors.card;
  const SOFT_BG = isDark ? '#0F0F1E' : colors.background;

  const loadRefs = useCallback(async () => {
    try {
      const [accRes, memRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/family-members').catch(() => ({ data: [] })),
      ]);
      setAccounts(accRes.data || []);
      setMembers(memRes.data || []);
    } catch {}
  }, []);

  const loadIncome = useCallback(async () => {
    if (!isEdit) return;
    try {
      const res = await api.get(`/income/${editId}`);
      const it = res.data;
      setAmount(String(it.amount || ''));
      setSource(it.source || '');
      setCategory(it.category || 'salary');
      setIncomeType(it.category || 'salary');
      setAccountId(it.account_id || '');
      setMemberId(it.family_member_id || null);
      if (it.date) setDate(new Date(it.date));
      setNotes(it.notes || '');
      const labels: string[] = it.labels || [];
      setRecurring(labels.includes('recurring'));
      setTaxable(labels.includes('taxable'));
      const freqLabel = labels.find(l => l.startsWith('freq:'));
      if (freqLabel) setFrequency(freqLabel.replace('freq:', ''));
      const modeLabel = labels.find(l => l.startsWith('mode:'));
      if (modeLabel) setPaymentMode(modeLabel.replace('mode:', ''));
      const locLabel  = labels.find(l => l.startsWith('loc:'));
      if (locLabel) setLocation(locLabel.replace('loc:', ''));
      const nextLabel = labels.find(l => l.startsWith('next:'));
      if (nextLabel) setNextExpected(new Date(nextLabel.replace('next:', '')));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to load income');
    } finally { setLoading(false); }
  }, [isEdit, editId]);

  useEffect(() => { loadRefs(); }, [loadRefs]);
  useEffect(() => { if (isEdit) loadIncome(); }, [loadIncome, isEdit]);

  // Auto-suggest next expected when recurring + frequency change (and not set yet)
  useEffect(() => {
    if (recurring && !nextExpected) setNextExpected(nextDate(date, frequency));
    if (!recurring) setNextExpected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring, frequency]);

  const selectedAccount = accounts.find(a => a.account_id === accountId);
  const selectedMember  = members.find(m => m.family_member_id === memberId);
  const selectedCat     = INCOME_CATEGORIES.find(c => c.key === category);
  const selectedMode    = PAYMENT_MODES.find(p => p.key === paymentMode);
  const selectedType    = INCOME_TYPES.find(t => t.key === incomeType);
  const selectedFreq    = FREQUENCIES.find(f => f.key === frequency);

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0)  { Alert.alert('Required', 'Enter a valid amount'); return; }
    if (!accountId)        { Alert.alert('Required', 'Select an account'); return; }
    if (!category)         { Alert.alert('Required', 'Select a category'); return; }

    const labels: string[] = [];
    if (recurring) { labels.push('recurring'); labels.push(`freq:${frequency}`); }
    if (taxable)   labels.push('taxable');
    if (paymentMode) labels.push(`mode:${paymentMode}`);
    if (location.trim()) labels.push(`loc:${location.trim()}`);
    if (nextExpected)    labels.push(`next:${nextExpected.toISOString()}`);

    setSaving(true);
    try {
      const payload = {
        account_id: accountId,
        amount: amt,
        category,
        source: source.trim() || (selectedCat?.label ?? 'Income'),
        date: date.toISOString(),
        notes: notes.trim() || null,
        family_member_id: memberId || null,
        labels: labels.length ? labels : null,
      };
      if (isEdit) await api.put(`/income/${editId}`, payload);
      else        await api.post('/income', payload);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save income');
    } finally { setSaving(false); }
  };

  const remove = () => {
    if (!isEdit) return;
    Alert.alert('Delete Income', 'Delete this entry? Account balance will be reversed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/income/${editId}`); router.back(); }
        catch (e: any) { Alert.alert('Error', e?.response?.data?.detail || 'Failed to delete'); }
      }},
    ]);
  };

  if (loading) return (
    <SafeAreaView style={[s.root, { backgroundColor: SOFT_BG, alignItems: 'center', justifyContent: 'center' }]} edges={['top']}>
      <ActivityIndicator size="large" color={PURPLE} />
    </SafeAreaView>
  );

  // Build picker config
  let pickerCfg: any = null;
  if (picker === 'member')   pickerCfg = { title: 'Select Member',  items: [{ key: '', label: 'Self', icon: 'people-outline' }, ...members.map(m => ({ key: m.family_member_id, label: m.name, icon: 'person-outline' }))], selected: memberId || '', onSelect: (it: any) => setMemberId(it.key || null) };
  if (picker === 'account')  pickerCfg = { title: 'Select Account', items: accounts.map(a => { const meta = ACCOUNT_TYPE_META[a.account_type] || ACCOUNT_TYPE_META.bank; return { key: a.account_id, label: a.name, icon: meta.icon, color: meta.color, subtitle: `${meta.label} · ${formatINR(a.balance || 0)}` }; }), selected: accountId, onSelect: (it: any) => setAccountId(it.key) };
  if (picker === 'category') pickerCfg = { title: 'Select Category', items: INCOME_CATEGORIES.map(c => ({ key: c.key, label: c.label, icon: c.icon })), selected: category, onSelect: (it: any) => { setCategory(it.key); setIncomeType(it.key); } };
  if (picker === 'type')     pickerCfg = { title: 'Select Income Type', items: INCOME_TYPES, selected: incomeType, onSelect: (it: any) => setIncomeType(it.key) };
  if (picker === 'mode')     pickerCfg = { title: 'Select Payment Mode', items: PAYMENT_MODES, selected: paymentMode, onSelect: (it: any) => setPaymentMode(it.key) };
  if (picker === 'frequency')pickerCfg = { title: 'Select Frequency', items: FREQUENCIES, selected: frequency, onSelect: (it: any) => setFrequency(it.key) };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: SOFT_BG }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="add-income-back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>{isEdit ? 'Edit Income' : 'Add Income'}</Text>
        <TouchableOpacity onPress={save} disabled={saving} testID="add-income-save-top">
          {saving ? <ActivityIndicator color={PURPLE} /> : <Text style={{ color: PURPLE, fontSize: 15, fontWeight: '800', letterSpacing: 0.2 }}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {/* Amount + camera */}
          <View style={[s.card, { backgroundColor: CARD_BG }]} testID="add-income-amount-card">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '700' }}>Amount</Text>
              <TouchableOpacity style={[s.cameraBtn, { backgroundColor: GREEN_DEEP }]} testID="add-income-attach-receipt" onPress={() => Alert.alert('Attach', 'Receipt attachment coming soon')}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: GREEN_DEEP, fontSize: 32, fontWeight: '800', letterSpacing: -0.6 }}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                style={{ flex: 1, color: colors.text, fontSize: 38, fontWeight: '800', letterSpacing: -1, marginLeft: 6, padding: 0 }}
                testID="add-income-amount-input"
              />
            </View>
          </View>

          {/* BASIC DETAILS */}
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>BASIC DETAILS</Text>
          <View style={[s.groupCard, { backgroundColor: CARD_BG }]}>
            <Row
              icon="person-outline" title="Member" subtitle="Who received this income?"
              value={selectedMember?.name || 'Select Member'} valueColor={selectedMember ? colors.text : PURPLE}
              onPress={() => setPicker('member')} colors={colors} isDark={isDark} testID="add-income-member-row"
            />
            <Row
              icon="card-outline" title="Account" subtitle="Where this income is received?"
              value={selectedAccount?.name || 'Select Account'} valueColor={selectedAccount ? colors.text : PURPLE}
              onPress={() => setPicker('account')} colors={colors} isDark={isDark} testID="add-income-account-row"
            />
            <Row
              icon="grid-outline" title="Category" subtitle="What is the source of income?"
              value={selectedCat?.label || 'Select Category'} valueColor={selectedCat ? colors.text : PURPLE}
              onPress={() => setPicker('category')} colors={colors} isDark={isDark} testID="add-income-category-row"
            />
            <Row
              icon="calendar-outline" title="Date" subtitle="When did you receive this?"
              value={format(date, 'dd MMM yyyy')} valueColor={colors.text}
              onPress={() => { setDateInput(format(date, 'yyyy-MM-dd')); setShowDate(true); }}
              colors={colors} isDark={isDark} last testID="add-income-date-row"
            />
          </View>

          {/* MORE DETAILS */}
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>MORE DETAILS (OPTIONAL)</Text>
          <View style={[s.groupCard, { backgroundColor: CARD_BG }]}>
            <Row
              icon="document-text-outline" title="Notes" subtitle={notes ? notes.slice(0, 36) : 'Add a note (optional)'}
              value={notes ? 'Edit' : 'Add Note'} valueColor={PURPLE}
              onPress={() => setShowNotes(true)} colors={colors} isDark={isDark} testID="add-income-notes-row"
            />
            <Row
              icon="location-outline" title="Location" subtitle={location ? location : 'Add location (optional)'}
              value={location ? 'Edit' : 'Add Location'} valueColor={PURPLE}
              onPress={() => setShowLocation(true)} colors={colors} isDark={isDark} testID="add-income-location-row"
            />
            <Row
              icon="attach-outline" title="Attach File" subtitle="Upload receipt or document"
              value="Upload" valueColor={PURPLE}
              onPress={() => Alert.alert('Upload', 'File attachment coming soon')} colors={colors} isDark={isDark} last testID="add-income-attach-row"
            />
          </View>

          {/* ADDITIONAL DETAILS */}
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>ADDITIONAL DETAILS (OPTIONAL)</Text>
          <View style={[s.groupCard, { backgroundColor: CARD_BG }]}>
            <Row
              icon="briefcase-outline" title="Income Type" subtitle="Salary, Freelance, Business, etc."
              value={selectedType?.label || 'Select Type'} valueColor={PURPLE}
              onPress={() => setPicker('type')} colors={colors} isDark={isDark} testID="add-income-type-row"
            />
            <Row
              icon="card-outline" title="Payment Mode" subtitle="Bank Transfer, Cash, UPI, etc."
              value={selectedMode?.label || 'Select Mode'} valueColor={PURPLE}
              onPress={() => setPicker('mode')} colors={colors} isDark={isDark} testID="add-income-mode-row"
            />
            <Row
              icon="receipt-outline" title="Taxable Income" subtitle="Is this income taxable?"
              colors={colors} isDark={isDark}
              right={<Switch value={taxable} onValueChange={setTaxable} trackColor={{ false: '#444', true: GREEN_DEEP }} thumbColor="#FFF" testID="add-income-taxable-toggle" />}
              testID="add-income-taxable-row"
            />
            <Row
              icon="repeat-outline" title="Recurring Income" subtitle="Is this a recurring income?"
              colors={colors} isDark={isDark}
              right={<Switch value={recurring} onValueChange={setRecurring} trackColor={{ false: '#444', true: PURPLE }} thumbColor="#FFF" testID="add-income-recurring-toggle" />}
              testID="add-income-recurring-row"
            />
            <Row
              icon="time-outline" title="Frequency" subtitle="How often do you receive this?"
              value={recurring ? (selectedFreq?.label || 'Monthly') : 'Select Frequency'}
              valueColor={recurring ? colors.text : PURPLE}
              onPress={recurring ? () => setPicker('frequency') : undefined}
              colors={colors} isDark={isDark} testID="add-income-frequency-row"
            />
            <Row
              icon="calendar-clear-outline" title="Next Expected Date" subtitle="When is the next income expected?"
              value={nextExpected ? format(nextExpected, 'dd MMM yyyy') : 'Select Date'}
              valueColor={nextExpected ? colors.text : PURPLE}
              onPress={recurring ? () => { setDateInput(nextExpected ? format(nextExpected, 'yyyy-MM-dd') : format(nextDate(date, frequency), 'yyyy-MM-dd')); setShowDate(true); } : undefined}
              colors={colors} isDark={isDark} last testID="add-income-next-date-row"
            />
          </View>

          {/* Trust banner */}
          <View style={[s.trustCard, { backgroundColor: PURPLE + '15', borderColor: PURPLE + '40' }]} testID="add-income-trust-banner">
            <View style={[s.trustIcon, { backgroundColor: PURPLE + '33' }]}>
              <Ionicons name="shield-checkmark" size={20} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>Keep your data secure</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 3, lineHeight: 16 }}>
                Your income details are encrypted and 100% secure.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Save Income */}
        <View style={[s.saveBar, { backgroundColor: SOFT_BG, borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85} style={{ flex: 1 }} testID="add-income-save-btn">
            <LinearGradient colors={[PURPLE_DARK, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 }}>{isEdit ? 'Update Income' : 'Save Income'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          {isEdit && (
            <TouchableOpacity onPress={remove} style={[s.deleteBtn, { borderColor: RED + '55' }]} testID="add-income-delete-btn">
              <Ionicons name="trash-outline" size={18} color={RED} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Pickers */}
      {pickerCfg && (
        <Picker
          visible={picker !== null}
          title={pickerCfg.title}
          items={pickerCfg.items}
          selected={pickerCfg.selected}
          onClose={() => setPicker(null)}
          onSelect={pickerCfg.onSelect}
          colors={colors} isDark={isDark}
        />
      )}

      {/* Notes modal */}
      <Modal transparent visible={showNotes} animationType="fade" onRequestClose={() => setShowNotes(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowNotes(false)} style={s.modalBg} />
        <View style={[s.sheet, { backgroundColor: CARD_BG }]}>
          <View style={s.sheetHandle} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Q1 bonus, rental payment, freelance gig…"
            placeholderTextColor={colors.textSecondary}
            multiline
            style={{ color: colors.text, fontSize: 14, minHeight: 100, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, borderRadius: 12, padding: 12, textAlignVertical: 'top' }}
            testID="add-income-notes-input"
            autoFocus
          />
          <TouchableOpacity onPress={() => setShowNotes(false)} style={[s.modalDone, { backgroundColor: PURPLE }]} testID="add-income-notes-done">
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Location modal */}
      <Modal transparent visible={showLocation} animationType="fade" onRequestClose={() => setShowLocation(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowLocation(false)} style={s.modalBg} />
        <View style={[s.sheet, { backgroundColor: CARD_BG }]}>
          <View style={s.sheetHandle} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>Location</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Mumbai, Office, Online"
            placeholderTextColor={colors.textSecondary}
            style={{ color: colors.text, fontSize: 14, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, borderRadius: 12, padding: 12 }}
            testID="add-income-location-input"
            autoFocus
          />
          <TouchableOpacity onPress={() => setShowLocation(false)} style={[s.modalDone, { backgroundColor: PURPLE }]} testID="add-income-location-done">
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Date modal (text input — simple, RN doesn't ship a date picker for web) */}
      <Modal transparent visible={showDate} animationType="fade" onRequestClose={() => setShowDate(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowDate(false)} style={s.modalBg} />
        <View style={[s.sheet, { backgroundColor: CARD_BG }]}>
          <View style={s.sheetHandle} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>Pick Date</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 8 }}>Format: YYYY-MM-DD</Text>
          <TextInput
            value={dateInput}
            onChangeText={setDateInput}
            placeholder="2026-02-15"
            placeholderTextColor={colors.textSecondary}
            style={{ color: colors.text, fontSize: 14, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, borderRadius: 12, padding: 12 }}
            testID="add-income-date-input"
            autoFocus
          />
          <TouchableOpacity
            onPress={() => {
              const parsed = new Date(dateInput);
              if (!isNaN(parsed.getTime())) {
                // Decide which date: if "Next Expected Date" was triggered, update nextExpected; else update date
                if (nextExpected !== null || (recurring && dateInput !== format(date, 'yyyy-MM-dd'))) {
                  // Heuristic: if dateInput differs significantly we update nextExpected
                  setNextExpected(parsed);
                } else {
                  setDate(parsed);
                }
              }
              setShowDate(false);
            }}
            style={[s.modalDone, { backgroundColor: PURPLE }]}
            testID="add-income-date-done"
          >
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle:{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  iconBtn:    { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  card:       { borderRadius: 16, padding: 18, marginBottom: 14 },
  cameraBtn:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
  groupCard:  { borderRadius: 16, paddingHorizontal: 16, marginBottom: 18 },

  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowIcon:    { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  trustCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 8 },
  trustIcon:  { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  saveBar:    { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, borderTopWidth: 1, flexDirection: 'row', gap: 10 },
  saveBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  deleteBtn:  { width: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1 },

  modalBg:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:      { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 30, maxHeight: '75%' },
  sheetHandle:{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 14 },
  sheetRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sheetIcon:  { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  modalDone:  { alignItems: 'center', paddingVertical: 13, borderRadius: 12, marginTop: 16 },
});

// width filler for save button when not editing
const _saveBtnFlex = { flex: 1 };
// @ts-ignore — attach to style at runtime if needed (silenced)
(s as any).saveBtnFlex = _saveBtnFlex;
