import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';

export default function CreditCardsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', card_number_last4: '', credit_limit: '', current_outstanding: '0', billing_date: '1', due_date: '15', interest_rate: '0' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const res = await api.get('/credit-cards'); setCards(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Enter card name'); return; }
    if (!form.credit_limit) { Alert.alert('Required', 'Enter credit limit'); return; }
    setSaving(true);
    try {
      await api.post('/credit-cards', {
        name: form.name.trim(), card_number_last4: form.card_number_last4,
        credit_limit: parseFloat(form.credit_limit), current_outstanding: parseFloat(form.current_outstanding) || 0,
        billing_date: parseInt(form.billing_date) || 1, due_date: parseInt(form.due_date) || 15,
        interest_rate: parseFloat(form.interest_rate) || 0
      });
      setShowAdd(false); setForm({ name: '', card_number_last4: '', credit_limit: '', current_outstanding: '0', billing_date: '1', due_date: '15', interest_rate: '0' });
      load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = (card: any) => {
    Alert.alert('Delete Card', `Remove "${card.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/credit-cards/${card.card_id}`); load(); } catch { Alert.alert('Error', 'Failed'); }
      }}
    ]);
  };

  const totalLimit = cards.reduce((s, c) => s + c.credit_limit, 0);
  const totalOutstanding = cards.reduce((s, c) => s + c.current_outstanding, 0);

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Credit Cards</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={colors.primary} /></TouchableOpacity>
      </View>

      <View style={[styles.summaryRow, { backgroundColor: colors.card }]}>
        <View style={styles.summaryItem}><Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Limit</Text><Text style={[styles.summaryVal, { color: colors.text }]}>{formatINR(totalLimit)}</Text></View>
        <View style={styles.summaryItem}><Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Outstanding</Text><Text style={[styles.summaryVal, { color: '#FF5252' }]}>{formatINR(totalOutstanding)}</Text></View>
        <View style={styles.summaryItem}><Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Available</Text><Text style={[styles.summaryVal, { color: '#00E676' }]}>{formatINR(totalLimit - totalOutstanding)}</Text></View>
      </View>

      <FlatList data={cards} keyExtractor={i => i.card_id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const usage = item.credit_limit > 0 ? (item.current_outstanding / item.credit_limit) * 100 : 0;
          return (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: '#FF910020' }]}><Ionicons name="card" size={22} color="#FF9100" /></View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{item.card_number_last4 ? `****${item.card_number_last4}` : 'Credit Card'} · {item.interest_rate}% APR</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item)}><Ionicons name="trash-outline" size={18} color={colors.danger} /></TouchableOpacity>
              </View>
              <View style={styles.cardBottom}>
                <View><Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Outstanding</Text><Text style={[styles.cardAmount, { color: '#FF5252' }]}>{formatINR(item.current_outstanding)}</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Limit</Text><Text style={[styles.cardAmount, { color: colors.text }]}>{formatINR(item.credit_limit)}</Text></View>
              </View>
              <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${Math.min(usage, 100)}%`, backgroundColor: usage > 80 ? '#FF5252' : usage > 50 ? '#FFB300' : '#00E676' }]} />
              </View>
              <Text style={[styles.usageText, { color: colors.textSecondary }]}>{usage.toFixed(0)}% used · Due on {item.due_date}th</Text>
              <View style={styles.cardActionsRow}>
                <TouchableOpacity style={[styles.reminderBtn, { backgroundColor: 'rgba(68,138,255,0.12)' }]} onPress={() => router.push({ pathname: '/reminders', params: { type: 'credit_card', related_id: item.card_id, title: `${item.name} Payment Due`, description: `Credit card bill payment for ${item.name}` } } as any)}>
                  <Ionicons name="notifications-outline" size={14} color="#448AFF" />
                  <Text style={{ color: '#448AFF', fontSize: 11, fontWeight: '600' }}>Remind</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="card-outline" size={64} color={colors.textSecondary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No credit cards added</Text></View>}
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.text }]}>Add Credit Card</Text><TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {[{ label: 'Card Name', key: 'name', ph: 'e.g., HDFC Regalia' }, { label: 'Last 4 Digits', key: 'card_number_last4', ph: '1234', kb: 'numeric' }, { label: 'Credit Limit', key: 'credit_limit', ph: '200000', kb: 'decimal-pad', prefix: '₹' }, { label: 'Current Outstanding', key: 'current_outstanding', ph: '0', kb: 'decimal-pad', prefix: '₹' }, { label: 'Billing Date (day)', key: 'billing_date', ph: '1', kb: 'numeric' }, { label: 'Due Date (day)', key: 'due_date', ph: '15', kb: 'numeric' }, { label: 'Interest Rate (%)', key: 'interest_rate', ph: '42', kb: 'decimal-pad' }].map(f => (
                <View key={f.key} style={{ marginBottom: 12 }}>
                  <Text style={[styles.fLabel, { color: colors.text }]}>{f.label}</Text>
                  <View style={[styles.fInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    {f.prefix && <Text style={[styles.fPrefix, { color: colors.textSecondary }]}>{f.prefix}</Text>}
                    <TextInput style={[styles.fText, { color: colors.text }]} placeholder={f.ph} placeholderTextColor={colors.textSecondary} value={(form as any)[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} keyboardType={(f.kb || 'default') as any} />
                  </View>
                </View>
              ))}
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Add Card</Text>}
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
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryVal: { fontSize: 15, fontWeight: 'bold' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardLabel: { fontSize: 12, marginBottom: 2 },
  cardAmount: { fontSize: 16, fontWeight: 'bold' },
  progressBg: { height: 6, borderRadius: 3, marginBottom: 6 },
  progressFill: { height: 6, borderRadius: 3 },
  usageText: { fontSize: 11 },
  cardActionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  fLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  fInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46 },
  fPrefix: { fontSize: 16, fontWeight: '600', marginRight: 6 },
  fText: { flex: 1, fontSize: 15 },
  saveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
