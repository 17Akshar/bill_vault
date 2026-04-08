import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import { format, parseISO } from 'date-fns';

const LOAN_TYPES = [
  { key: 'home', label: 'Home Loan', icon: 'home-outline', color: '#448AFF' },
  { key: 'car', label: 'Car Loan', icon: 'car-outline', color: '#00E676' },
  { key: 'personal', label: 'Personal', icon: 'person-outline', color: '#7C4DFF' },
  { key: 'education', label: 'Education', icon: 'school-outline', color: '#FFB300' },
  { key: 'gold', label: 'Gold Loan', icon: 'diamond-outline', color: '#FF9100' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#8E8EA0' },
];

export default function LoansScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', loan_type: 'home', principal_amount: '', outstanding_amount: '', interest_rate: '', emi_amount: '', tenure_months: '', start_date: new Date().toISOString(), notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const res = await api.get('/loans'); setLoans(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.principal_amount || !form.emi_amount) { Alert.alert('Required', 'Fill all required fields'); return; }
    setSaving(true);
    try {
      await api.post('/loans', {
        name: form.name.trim(), loan_type: form.loan_type,
        principal_amount: parseFloat(form.principal_amount), outstanding_amount: parseFloat(form.outstanding_amount) || parseFloat(form.principal_amount),
        interest_rate: parseFloat(form.interest_rate) || 0, emi_amount: parseFloat(form.emi_amount),
        tenure_months: parseInt(form.tenure_months) || 12, start_date: form.start_date, notes: form.notes || null
      });
      setShowAdd(false); load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = (loan: any) => {
    Alert.alert('Delete Loan', `Remove "${loan.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/loans/${loan.loan_id}`); load(); } catch { Alert.alert('Error', 'Failed'); } } }
    ]);
  };

  const totalOutstanding = loans.reduce((s, l) => s + l.outstanding_amount, 0);
  const totalEMI = loans.reduce((s, l) => s + l.emi_amount, 0);

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Loans & EMIs</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={colors.primary} /></TouchableOpacity>
      </View>

      <View style={[styles.summaryRow, { backgroundColor: colors.card }]}>
        <View style={styles.summaryItem}><Text style={[styles.sLabel, { color: colors.textSecondary }]}>Outstanding</Text><Text style={[styles.sVal, { color: '#FF5252' }]}>{formatINR(totalOutstanding)}</Text></View>
        <View style={styles.summaryItem}><Text style={[styles.sLabel, { color: colors.textSecondary }]}>Monthly EMI</Text><Text style={[styles.sVal, { color: '#FFB300' }]}>{formatINR(totalEMI)}</Text></View>
      </View>

      <FlatList data={loans} keyExtractor={i => i.loan_id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const lt = LOAN_TYPES.find(t => t.key === item.loan_type) || LOAN_TYPES[5];
          const paid = item.principal_amount - item.outstanding_amount;
          const paidPct = item.principal_amount > 0 ? (paid / item.principal_amount) * 100 : 0;
          return (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: lt.color + '20' }]}><Ionicons name={lt.icon as any} size={22} color={lt.color} /></View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{lt.label} · {item.interest_rate}% · {item.tenure_months}mo</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item)}><Ionicons name="trash-outline" size={18} color={colors.danger} /></TouchableOpacity>
              </View>
              <View style={styles.cardBottom}>
                <View><Text style={[styles.cl, { color: colors.textSecondary }]}>Outstanding</Text><Text style={[styles.cv, { color: '#FF5252' }]}>{formatINR(item.outstanding_amount)}</Text></View>
                <View style={{ alignItems: 'center' }}><Text style={[styles.cl, { color: colors.textSecondary }]}>EMI</Text><Text style={[styles.cv, { color: '#FFB300' }]}>{formatINR(item.emi_amount)}</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={[styles.cl, { color: colors.textSecondary }]}>Principal</Text><Text style={[styles.cv, { color: colors.text }]}>{formatINR(item.principal_amount)}</Text></View>
              </View>
              <View style={[styles.pBg, { backgroundColor: colors.border }]}><View style={[styles.pFill, { width: `${Math.min(paidPct, 100)}%`, backgroundColor: '#00E676' }]} /></View>
              <Text style={[styles.pText, { color: colors.textSecondary }]}>{paidPct.toFixed(0)}% paid</Text>
              <View style={styles.cardActionsRow}>
                <TouchableOpacity style={[styles.reminderBtn, { backgroundColor: 'rgba(68,138,255,0.12)' }]} onPress={() => router.push({ pathname: '/reminders', params: { type: 'loan_emi', related_id: item.loan_id, title: `${item.name} EMI Due`, description: `EMI payment of ${item.emi_amount} for ${item.name}` } } as any)}>
                  <Ionicons name="notifications-outline" size={14} color="#448AFF" />
                  <Text style={{ color: '#448AFF', fontSize: 11, fontWeight: '600' }}>Remind</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="document-text-outline" size={64} color={colors.textSecondary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No loans added</Text></View>}
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.mHeader}><Text style={[styles.mTitle, { color: colors.text }]}>Add Loan</Text><TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.fl, { color: colors.text }]}>Loan Type</Text>
              <View style={styles.typeRow}>
                {LOAN_TYPES.map(lt => (
                  <TouchableOpacity key={lt.key} style={[styles.typeChip, { borderColor: colors.border }, form.loan_type === lt.key && { borderColor: lt.color, borderWidth: 2 }]} onPress={() => setForm(p => ({ ...p, loan_type: lt.key }))}>
                    <Ionicons name={lt.icon as any} size={16} color={form.loan_type === lt.key ? lt.color : colors.textSecondary} />
                    <Text style={[styles.typeLabel, { color: form.loan_type === lt.key ? colors.text : colors.textSecondary }]}>{lt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {[{ l: 'Loan Name', k: 'name', ph: 'e.g., SBI Home Loan' }, { l: 'Principal Amount', k: 'principal_amount', ph: '5000000', kb: 'decimal-pad', pre: '₹' }, { l: 'Outstanding Amount', k: 'outstanding_amount', ph: 'Same as principal if new', kb: 'decimal-pad', pre: '₹' }, { l: 'Interest Rate (%)', k: 'interest_rate', ph: '8.5', kb: 'decimal-pad' }, { l: 'EMI Amount', k: 'emi_amount', ph: '45000', kb: 'decimal-pad', pre: '₹' }, { l: 'Tenure (months)', k: 'tenure_months', ph: '240', kb: 'numeric' }].map(f => (
                <View key={f.k} style={{ marginBottom: 12 }}>
                  <Text style={[styles.fl, { color: colors.text }]}>{f.l}</Text>
                  <View style={[styles.fi, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    {f.pre && <Text style={[styles.fp, { color: colors.textSecondary }]}>{f.pre}</Text>}
                    <TextInput style={[styles.ft, { color: colors.text }]} placeholder={f.ph} placeholderTextColor={colors.textSecondary} value={(form as any)[f.k]} onChangeText={v => setForm(p => ({ ...p, [f.k]: v }))} keyboardType={(f.kb || 'default') as any} />
                  </View>
                </View>
              ))}
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Add Loan</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  summaryRow: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 14, padding: 16, marginBottom: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  sLabel: { fontSize: 12, marginBottom: 4 },
  sVal: { fontSize: 15, fontWeight: 'bold' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cl: { fontSize: 11, marginBottom: 2 },
  cv: { fontSize: 14, fontWeight: 'bold' },
  pBg: { height: 6, borderRadius: 3, marginBottom: 4 },
  pFill: { height: 6, borderRadius: 3 },
  pText: { fontSize: 11 },
  cardActionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { fontSize: 18, fontWeight: 'bold' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  typeLabel: { fontSize: 12, fontWeight: '500' },
  fl: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  fi: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46 },
  fp: { fontSize: 16, fontWeight: '600', marginRight: 6 },
  ft: { flex: 1, fontSize: 15 },
  saveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
