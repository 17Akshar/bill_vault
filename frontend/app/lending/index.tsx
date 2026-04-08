import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import { format, parseISO } from 'date-fns';

export default function LendingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'lent' | 'borrowed'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ lending_type: 'lent', person_name: '', amount: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [filter]);
  const load = async () => {
    try {
      const params: any = { is_settled: false };
      if (filter !== 'all') params.lending_type = filter;
      const res = await api.get('/lending', { params });
      setRecords(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [filter]);

  const handleAdd = async () => {
    if (!form.person_name.trim() || !form.amount) { Alert.alert('Required', 'Fill name and amount'); return; }
    setSaving(true);
    try {
      await api.post('/lending', {
        lending_type: form.lending_type, person_name: form.person_name.trim(),
        amount: parseFloat(form.amount), date: new Date().toISOString(), notes: form.notes || null
      });
      setShowAdd(false); setForm({ lending_type: 'lent', person_name: '', amount: '', notes: '' }); load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const settle = (item: any) => {
    Alert.alert('Settle', `Mark as settled with "${item.person_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Settle', onPress: async () => {
        try { await api.put(`/lending/${item.lending_id}`, { is_settled: true, remaining_amount: 0 }); load(); } catch { Alert.alert('Error', 'Failed'); }
      }}
    ]);
  };

  const handleDelete = (item: any) => {
    Alert.alert('Delete', `Remove this record?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/lending/${item.lending_id}`); load(); } catch { Alert.alert('Error', 'Failed'); } } }
    ]);
  };

  const totalLent = records.filter(r => r.lending_type === 'lent').reduce((s, r) => s + r.remaining_amount, 0);
  const totalBorrowed = records.filter(r => r.lending_type === 'borrowed').reduce((s, r) => s + r.remaining_amount, 0);

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Lent / Borrowed</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={colors.primary} /></TouchableOpacity>
      </View>

      <View style={[styles.summaryRow, { backgroundColor: colors.card }]}>
        <View style={styles.sItem}><Text style={[styles.sLabel, { color: colors.textSecondary }]}>You Lent</Text><Text style={[styles.sVal, { color: '#00E676' }]}>{formatINR(totalLent)}</Text></View>
        <View style={styles.sItem}><Text style={[styles.sLabel, { color: colors.textSecondary }]}>You Borrowed</Text><Text style={[styles.sVal, { color: '#FF5252' }]}>{formatINR(totalBorrowed)}</Text></View>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'lent', 'borrowed'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.fBtn, { borderColor: colors.border }, filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilter(f)}>
            <Text style={[styles.fText, { color: filter === f ? '#FFF' : colors.text }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList data={records} keyExtractor={i => i.lending_id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const isLent = item.lending_type === 'lent';
          return (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: isLent ? 'rgba(0,230,118,0.12)' : 'rgba(255,82,82,0.12)' }]}>
                  <Ionicons name={isLent ? 'arrow-up' : 'arrow-down'} size={20} color={isLent ? '#00E676' : '#FF5252'} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: colors.text }]}>{item.person_name}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{isLent ? 'You lent' : 'You borrowed'} · {item.date ? format(parseISO(item.date), 'dd MMM yyyy') : ''}</Text>
                </View>
                <Text style={[styles.cardAmount, { color: isLent ? '#00E676' : '#FF5252' }]}>{formatINR(item.remaining_amount)}</Text>
              </View>
              {item.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]}>{item.notes}</Text> : null}
              <View style={styles.cardActions}>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: 'rgba(68,138,255,0.12)' }]} onPress={() => router.push({ pathname: '/reminders', params: { type: 'lending', related_id: item.lending_id, title: `${isLent ? 'Collect from' : 'Pay back'} ${item.person_name}`, description: `${isLent ? 'Money lent to' : 'Money borrowed from'} ${item.person_name}` } } as any)}>
                  <Ionicons name="notifications-outline" size={16} color="#448AFF" /><Text style={{ color: '#448AFF', fontSize: 12, fontWeight: '600' }}>Remind</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#00E67620' }]} onPress={() => settle(item)}><Ionicons name="checkmark-circle" size={16} color="#00E676" /><Text style={{ color: '#00E676', fontSize: 12, fontWeight: '600' }}>Settle</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#FF525220' }]} onPress={() => handleDelete(item)}><Ionicons name="trash" size={16} color="#FF5252" /><Text style={{ color: '#FF5252', fontSize: 12, fontWeight: '600' }}>Delete</Text></TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={64} color={colors.textSecondary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No records</Text></View>}
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={styles.mHeader}><Text style={[styles.mTitle, { color: colors.text }]}>Add Record</Text><TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View>
            <View style={styles.typeToggle}>
              <TouchableOpacity style={[styles.typeBtn, form.lending_type === 'lent' && { backgroundColor: '#00E676' }]} onPress={() => setForm(p => ({ ...p, lending_type: 'lent' }))}>
                <Text style={{ color: form.lending_type === 'lent' ? '#000' : colors.textSecondary, fontWeight: '600' }}>I Lent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, form.lending_type === 'borrowed' && { backgroundColor: '#FF5252' }]} onPress={() => setForm(p => ({ ...p, lending_type: 'borrowed' }))}>
                <Text style={{ color: form.lending_type === 'borrowed' ? '#FFF' : colors.textSecondary, fontWeight: '600' }}>I Borrowed</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.fl, { color: colors.text }]}>Person Name</Text>
            <View style={[styles.fi, { borderColor: colors.border, backgroundColor: colors.background }]}><TextInput style={[styles.ft, { color: colors.text }]} placeholder="Name" placeholderTextColor={colors.textSecondary} value={form.person_name} onChangeText={v => setForm(p => ({ ...p, person_name: v }))} /></View>
            <Text style={[styles.fl, { color: colors.text, marginTop: 12 }]}>Amount</Text>
            <View style={[styles.fi, { borderColor: colors.border, backgroundColor: colors.background }]}><Text style={[styles.fp, { color: colors.textSecondary }]}>₹</Text><TextInput style={[styles.ft, { color: colors.text }]} placeholder="0" placeholderTextColor={colors.textSecondary} value={form.amount} onChangeText={v => setForm(p => ({ ...p, amount: v }))} keyboardType="decimal-pad" /></View>
            <Text style={[styles.fl, { color: colors.text, marginTop: 12 }]}>Notes (Optional)</Text>
            <View style={[styles.fi, { borderColor: colors.border, backgroundColor: colors.background }]}><TextInput style={[styles.ft, { color: colors.text }]} placeholder="Notes" placeholderTextColor={colors.textSecondary} value={form.notes} onChangeText={v => setForm(p => ({ ...p, notes: v }))} /></View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Add Record</Text>}
            </TouchableOpacity>
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
  sItem: { flex: 1, alignItems: 'center' },
  sLabel: { fontSize: 12, marginBottom: 4 },
  sVal: { fontSize: 15, fontWeight: 'bold' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  fBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  fText: { fontSize: 14, fontWeight: '500' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  cardAmount: { fontSize: 17, fontWeight: 'bold' },
  notes: { fontSize: 12, marginTop: 8, marginLeft: 54 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12, marginLeft: 54 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { fontSize: 18, fontWeight: 'bold' },
  typeToggle: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  fl: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  fi: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46 },
  fp: { fontSize: 16, fontWeight: '600', marginRight: 6 },
  ft: { flex: 1, fontSize: 15 },
  saveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
