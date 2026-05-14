import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR, INCOME_CATEGORIES, ACCOUNT_TYPE_META } from '../../utils/formatINR';

const PURPLE      = '#8E2DE2';
const PURPLE_DARK = '#4A00E0';
const GREEN       = '#51DB7A';
const RED         = '#FF4A4A';
const GREY        = '#8B8B8B';

const FREQUENCIES = [
  { key: 'monthly',  label: 'Monthly' },
  { key: 'weekly',   label: 'Weekly' },
  { key: 'biweekly', label: 'Bi-weekly' },
  { key: 'quarterly',label: 'Quarterly' },
  { key: 'yearly',   label: 'Yearly' },
];

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

  const [amount, setAmount]         = useState('');
  const [source, setSource]         = useState('');
  const [category, setCategory]     = useState<string>('salary');
  const [subCategory, setSubCategory] = useState<string>('');
  const [accountId, setAccountId]   = useState<string>('');
  const [memberId, setMemberId]     = useState<string | null>(null);
  const [date, setDate]             = useState(new Date());
  const [notes, setNotes]           = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency]     = useState('monthly');

  const CARD_BG = isDark ? '#1C1C2E' : colors.card;

  const loadRefs = useCallback(async () => {
    try {
      const [accRes, memRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/family-members').catch(() => ({ data: [] })),
      ]);
      const accList = accRes.data || [];
      setAccounts(accList);
      setMembers(memRes.data || []);
      if (!accountId && accList.length > 0) setAccountId(accList[0].account_id);
    } catch {}
  }, [accountId]);

  const loadIncome = useCallback(async () => {
    if (!isEdit) return;
    try {
      const res = await api.get(`/income/${editId}`);
      const it = res.data;
      setAmount(String(it.amount || ''));
      setSource(it.source || '');
      setCategory(it.category || 'salary');
      setSubCategory(it.sub_category || '');
      setAccountId(it.account_id || '');
      setMemberId(it.family_member_id || null);
      if (it.date) setDate(new Date(it.date));
      setNotes(it.notes || '');
      const labels: string[] = it.labels || [];
      setIsRecurring(labels.includes('recurring'));
      const freqLabel = labels.find(l => l.startsWith('freq:'));
      if (freqLabel) setFrequency(freqLabel.replace('freq:', ''));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to load income');
    } finally { setLoading(false); }
  }, [isEdit, editId]);

  useEffect(() => { loadRefs(); }, [loadRefs]);
  useEffect(() => { if (isEdit) loadIncome(); }, [loadIncome, isEdit]);

  const selectedCat = INCOME_CATEGORIES.find(c => c.key === category) || INCOME_CATEGORIES[0];

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('Required', 'Enter a valid amount'); return; }
    if (!source.trim()) { Alert.alert('Required', 'Enter a source / payer name'); return; }
    if (!accountId) { Alert.alert('Required', 'Select an account'); return; }

    const labels: string[] = [];
    if (isRecurring) { labels.push('recurring'); labels.push(`freq:${frequency}`); }

    setSaving(true);
    try {
      const payload = {
        account_id: accountId,
        amount: amt,
        category,
        sub_category: subCategory || null,
        source: source.trim(),
        date: date.toISOString(),
        notes: notes.trim() || null,
        family_member_id: memberId || null,
        labels: labels.length ? labels : null,
      };
      if (isEdit) {
        await api.put(`/income/${editId}`, payload);
      } else {
        await api.post('/income', payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save income');
    } finally { setSaving(false); }
  };

  const remove = () => {
    if (!isEdit) return;
    Alert.alert('Delete Income', 'Are you sure you want to delete this entry? Account balance will be reversed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/income/${editId}`); router.back(); }
        catch (e: any) { Alert.alert('Error', e?.response?.data?.detail || 'Failed to delete'); }
      }},
    ]);
  };

  if (loading) return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]} edges={['top']}>
      <ActivityIndicator size="large" color={PURPLE} />
    </SafeAreaView>
  );

  const selectedAccount = accounts.find(a => a.account_id === accountId);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="add-income-back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>{isEdit ? 'Edit Income' : 'Add Income'}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>Log money you received</Text>
        </View>
        {isEdit ? (
          <TouchableOpacity onPress={remove} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="add-income-delete">
            <Ionicons name="trash-outline" size={18} color={RED} />
          </TouchableOpacity>
        ) : <View style={[s.iconBtn, { backgroundColor: 'transparent' }]} />}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {/* Amount hero */}
          <LinearGradient colors={[PURPLE_DARK, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.amtHero} testID="add-income-amount-hero">
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }}>Amount Received</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }}>
              <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.6 }}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="decimal-pad"
                style={{ flex: 1, color: '#FFF', fontSize: 38, fontWeight: '800', letterSpacing: -1, marginLeft: 6, padding: 0 }}
                testID="add-income-amount-input"
              />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 4 }}>{amount ? formatINR(parseFloat(amount) || 0) : '—'}</Text>
          </LinearGradient>

          {/* Source */}
          <View style={[s.card, { backgroundColor: CARD_BG }]}>
            <Text style={[s.label, { color: colors.textSecondary }]}>SOURCE / PAYER</Text>
            <TextInput
              value={source}
              onChangeText={setSource}
              placeholder="e.g. Acme Corp, John Doe, Tenant"
              placeholderTextColor={colors.textSecondary}
              style={[s.textInput, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}
              testID="add-income-source-input"
            />
          </View>

          {/* Category */}
          <View style={[s.card, { backgroundColor: CARD_BG }]}>
            <Text style={[s.label, { color: colors.textSecondary }]}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              {INCOME_CATEGORIES.map(c => {
                const active = category === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => { setCategory(c.key); setSubCategory(''); }}
                    style={[s.catChip, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }, active && { borderColor: PURPLE, backgroundColor: PURPLE + '22' }]}
                    testID={`add-income-cat-${c.key}`}
                  >
                    <Ionicons name={c.icon as any} size={14} color={active ? PURPLE : colors.textSecondary} />
                    <Text style={{ color: active ? colors.text : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sub-category */}
            {selectedCat.subs.length > 0 && (
              <>
                <Text style={[s.label, { color: colors.textSecondary, marginTop: 14 }]}>SUB-CATEGORY (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {selectedCat.subs.map(sub => {
                    const active = subCategory === sub;
                    return (
                      <TouchableOpacity
                        key={sub}
                        onPress={() => setSubCategory(active ? '' : sub)}
                        style={[s.subChip, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }, active && { borderColor: PURPLE, backgroundColor: PURPLE + '15' }]}
                        testID={`add-income-sub-${sub}`}
                      >
                        <Text style={{ color: active ? colors.text : colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>

          {/* Account */}
          <View style={[s.card, { backgroundColor: CARD_BG }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[s.label, { color: colors.textSecondary }]}>DEPOSIT TO ACCOUNT</Text>
              {selectedAccount && (
                <Text style={{ color: GREEN, fontSize: 12, fontWeight: '800' }}>Bal: {formatINR(selectedAccount.balance || 0)}</Text>
              )}
            </View>
            {accounts.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, paddingVertical: 14 }}>No accounts yet — create one to track income.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {accounts.map(a => {
                  const active = accountId === a.account_id;
                  const meta = ACCOUNT_TYPE_META[a.account_type] || ACCOUNT_TYPE_META.bank;
                  return (
                    <TouchableOpacity
                      key={a.account_id}
                      onPress={() => setAccountId(a.account_id)}
                      style={[s.accChip, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }, active && { borderColor: meta.color, backgroundColor: meta.color + '22' }]}
                      testID={`add-income-account-${a.account_id}`}
                    >
                      <Ionicons name={meta.icon as any} size={14} color={active ? meta.color : colors.textSecondary} />
                      <View>
                        <Text style={{ color: active ? colors.text : colors.textSecondary, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{a.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{meta.label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Family member */}
          {members.length > 0 && (
            <View style={[s.card, { backgroundColor: CARD_BG }]}>
              <Text style={[s.label, { color: colors.textSecondary }]}>FOR MEMBER (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setMemberId(null)}
                  style={[s.memChip, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }, !memberId && { borderColor: PURPLE, backgroundColor: PURPLE + '22' }]}
                  testID="add-income-member-none"
                >
                  <Ionicons name="people-outline" size={14} color={!memberId ? PURPLE : colors.textSecondary} />
                  <Text style={{ color: !memberId ? colors.text : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>Self</Text>
                </TouchableOpacity>
                {members.map(m => {
                  const active = memberId === m.family_member_id;
                  return (
                    <TouchableOpacity
                      key={m.family_member_id}
                      onPress={() => setMemberId(m.family_member_id)}
                      style={[s.memChip, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }, active && { borderColor: PURPLE, backgroundColor: PURPLE + '22' }]}
                      testID={`add-income-member-${m.family_member_id}`}
                    >
                      <Ionicons name="person-outline" size={14} color={active ? PURPLE : colors.textSecondary} />
                      <Text style={{ color: active ? colors.text : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{m.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Recurring */}
          <View style={[s.card, { backgroundColor: CARD_BG }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { color: colors.text, fontSize: 13 }]}>Recurring Income</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 3 }}>
                  Mark this as a regular receipt (salary, rent, dividends)
                </Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: '#444', true: PURPLE }}
                thumbColor="#FFF"
                testID="add-income-recurring-toggle"
              />
            </View>
            {isRecurring && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {FREQUENCIES.map(f => {
                  const active = frequency === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setFrequency(f.key)}
                      style={[s.subChip, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }, active && { borderColor: PURPLE, backgroundColor: PURPLE + '15' }]}
                      testID={`add-income-freq-${f.key}`}
                    >
                      <Text style={{ color: active ? colors.text : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Notes */}
          <View style={[s.card, { backgroundColor: CARD_BG }]}>
            <Text style={[s.label, { color: colors.textSecondary }]}>NOTES (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Bonus for Q1 performance"
              placeholderTextColor={colors.textSecondary}
              multiline
              style={[s.textInput, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, minHeight: 70, textAlignVertical: 'top' }]}
              testID="add-income-notes-input"
            />
          </View>
        </ScrollView>

        {/* Sticky save button */}
        <View style={[s.saveBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85} testID="add-income-save-btn">
            <LinearGradient colors={[PURPLE_DARK, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 }}>{isEdit ? 'Update Income' : 'Save Income'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  iconBtn:     { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  amtHero:     { borderRadius: 20, padding: 22, marginBottom: 14 },

  card:        { borderRadius: 16, padding: 16, marginBottom: 12 },
  label:       { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  textInput:   { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },

  catChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  subChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  accChip:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, marginRight: 8, maxWidth: 200 },
  memChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, marginRight: 8 },

  saveBar:     { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, borderTopWidth: 1 },
  saveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
});
