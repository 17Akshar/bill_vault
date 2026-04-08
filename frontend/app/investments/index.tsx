import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';

const INV_TYPES = [
  { key: 'stocks', label: 'Stocks', icon: 'trending-up-outline', color: '#00E676' },
  { key: 'mutual_fund', label: 'Mutual Fund', icon: 'pie-chart-outline', color: '#448AFF' },
  { key: 'fd', label: 'FD', icon: 'lock-closed-outline', color: '#FFB300' },
  { key: 'rd', label: 'RD', icon: 'calendar-outline', color: '#7C4DFF' },
  { key: 'ppf', label: 'PPF', icon: 'shield-checkmark-outline', color: '#FF6B81' },
  { key: 'nps', label: 'NPS', icon: 'ribbon-outline', color: '#00BCD4' },
  { key: 'gold', label: 'Gold', icon: 'diamond-outline', color: '#FF9100' },
  { key: 'real_estate', label: 'Real Estate', icon: 'home-outline', color: '#8D6E63' },
  { key: 'crypto', label: 'Crypto', icon: 'logo-bitcoin', color: '#F7931A' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#8E8EA0' },
];

export default function InvestmentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', investment_type: 'mutual_fund', invested_amount: '', current_value: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const res = await api.get('/investments'); setInvestments(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.invested_amount) { Alert.alert('Required', 'Fill name and amount'); return; }
    setSaving(true);
    try {
      await api.post('/investments', {
        name: form.name.trim(), investment_type: form.investment_type,
        invested_amount: parseFloat(form.invested_amount), current_value: parseFloat(form.current_value) || parseFloat(form.invested_amount),
        purchase_date: new Date().toISOString(), notes: form.notes || null
      });
      setShowAdd(false); setForm({ name: '', investment_type: 'mutual_fund', invested_amount: '', current_value: '', notes: '' }); load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = (item: any) => {
    Alert.alert('Delete', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/investments/${item.investment_id}`); load(); } catch { Alert.alert('Error', 'Failed'); } } }
    ]);
  };

  const totalInvested = investments.reduce((s, i) => s + i.invested_amount, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.current_value, 0);
  const totalReturns = totalCurrent - totalInvested;
  const returnsPct = totalInvested > 0 ? ((totalReturns / totalInvested) * 100) : 0;

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Investments</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={colors.primary} /></TouchableOpacity>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <View style={styles.sRow}>
          <View style={styles.sItem}><Text style={[styles.sLabel, { color: colors.textSecondary }]}>Invested</Text><Text style={[styles.sVal, { color: colors.text }]}>{formatINR(totalInvested)}</Text></View>
          <View style={styles.sItem}><Text style={[styles.sLabel, { color: colors.textSecondary }]}>Current</Text><Text style={[styles.sVal, { color: colors.text }]}>{formatINR(totalCurrent)}</Text></View>
        </View>
        <View style={[styles.returnsRow, { backgroundColor: totalReturns >= 0 ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)' }]}>
          <Ionicons name={totalReturns >= 0 ? 'trending-up' : 'trending-down'} size={18} color={totalReturns >= 0 ? '#00E676' : '#FF5252'} />
          <Text style={[styles.returnsText, { color: totalReturns >= 0 ? '#00E676' : '#FF5252' }]}>
            {totalReturns >= 0 ? '+' : ''}{formatINR(totalReturns)} ({returnsPct >= 0 ? '+' : ''}{returnsPct.toFixed(1)}%)
          </Text>
        </View>
      </View>

      <FlatList data={investments} keyExtractor={i => i.investment_id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const it = INV_TYPES.find(t => t.key === item.investment_type) || INV_TYPES[9];
          const ret = item.current_value - item.invested_amount;
          const retPct = item.invested_amount > 0 ? ((ret / item.invested_amount) * 100) : 0;
          return (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: it.color + '20' }]}><Ionicons name={it.icon as any} size={22} color={it.color} /></View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{it.label}</Text>
                </View>
                <View style={{ width: 18 }} />
              </View>
              <View style={styles.cardBottom}>
                <View><Text style={[styles.cl, { color: colors.textSecondary }]}>Invested</Text><Text style={[styles.cv, { color: colors.text }]}>{formatINR(item.invested_amount)}</Text></View>
                <View style={{ alignItems: 'center' }}><Text style={[styles.cl, { color: colors.textSecondary }]}>Current</Text><Text style={[styles.cv, { color: colors.text }]}>{formatINR(item.current_value)}</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={[styles.cl, { color: colors.textSecondary }]}>Returns</Text><Text style={[styles.cv, { color: ret >= 0 ? '#00E676' : '#FF5252' }]}>{ret >= 0 ? '+' : ''}{retPct.toFixed(1)}%</Text></View>
              </View>
              <View style={styles.cardActionsRow}>
                <TouchableOpacity style={[styles.reminderBtn, { backgroundColor: 'rgba(68,138,255,0.12)' }]} onPress={() => router.push({ pathname: '/reminders', params: { type: 'investment', related_id: item.investment_id, title: `${item.name} Review`, description: `Review investment: ${it.label} - ${item.name}` } } as any)}>
                  <Ionicons name="notifications-outline" size={14} color="#448AFF" />
                  <Text style={{ color: '#448AFF', fontSize: 11, fontWeight: '600' }}>Remind</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.reminderBtn, { backgroundColor: 'rgba(255,82,82,0.12)' }]}>
                  <Ionicons name="trash-outline" size={14} color="#FF5252" />
                  <Text style={{ color: '#FF5252', fontSize: 11, fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="trending-up-outline" size={64} color={colors.textSecondary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No investments</Text></View>}
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={styles.mHeader}><Text style={[styles.mTitle, { color: colors.text }]}>Add Investment</Text><TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.fl, { color: colors.text }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {INV_TYPES.map(it => (
                  <TouchableOpacity key={it.key} style={[styles.typeChip, { borderColor: colors.border }, form.investment_type === it.key && { borderColor: it.color, borderWidth: 2 }]} onPress={() => setForm(p => ({ ...p, investment_type: it.key }))}>
                    <Ionicons name={it.icon as any} size={14} color={form.investment_type === it.key ? it.color : colors.textSecondary} />
                    <Text style={{ color: form.investment_type === it.key ? colors.text : colors.textSecondary, fontSize: 11, fontWeight: '500' }}>{it.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {[{ l: 'Name', k: 'name', ph: 'e.g., HDFC Flexicap' }, { l: 'Invested Amount', k: 'invested_amount', ph: '100000', kb: 'decimal-pad', pre: '₹' }, { l: 'Current Value', k: 'current_value', ph: '120000', kb: 'decimal-pad', pre: '₹' }, { l: 'Notes (Optional)', k: 'notes', ph: 'Notes' }].map(f => (
                <View key={f.k} style={{ marginBottom: 12 }}>
                  <Text style={[styles.fl, { color: colors.text }]}>{f.l}</Text>
                  <View style={[styles.fi, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    {f.pre && <Text style={[styles.fp, { color: colors.textSecondary }]}>{f.pre}</Text>}
                    <TextInput style={[styles.ft, { color: colors.text }]} placeholder={f.ph} placeholderTextColor={colors.textSecondary} value={(form as any)[f.k]} onChangeText={v => setForm(p => ({ ...p, [f.k]: v }))} keyboardType={(f.kb || 'default') as any} />
                  </View>
                </View>
              ))}
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Add Investment</Text>}
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
  summaryCard: { marginHorizontal: 20, borderRadius: 14, padding: 16, marginBottom: 16 },
  sRow: { flexDirection: 'row', marginBottom: 12 },
  sItem: { flex: 1, alignItems: 'center' },
  sLabel: { fontSize: 12, marginBottom: 4 },
  sVal: { fontSize: 16, fontWeight: 'bold' },
  returnsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  returnsText: { fontSize: 15, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  cl: { fontSize: 11, marginBottom: 2 },
  cv: { fontSize: 14, fontWeight: 'bold' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { fontSize: 18, fontWeight: 'bold' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  fl: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  fi: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46 },
  fp: { fontSize: 16, fontWeight: '600', marginRight: 6 },
  ft: { flex: 1, fontSize: 15 },
  saveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
