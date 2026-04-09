import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR, EXPENSE_CATEGORIES } from '../../utils/formatINR';

const CAT_COLORS: Record<string, string> = {
  food: '#FF5252', shopping: '#7C4DFF', transport: '#448AFF', entertainment: '#FF9100',
  utilities: '#00BCD4', health: '#00E676', education: '#FFB300', rent: '#E91E63',
  insurance: '#78909C', emi: '#FF5252', investment: '#00E676', other: '#607D8B',
};

export default function BudgetsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: '', monthly_limit: '' });
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await api.get('/budgets/progress');
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  const handleSave = async () => {
    if (!form.category) { Alert.alert('Required', 'Select a category'); return; }
    if (!form.monthly_limit || parseFloat(form.monthly_limit) <= 0) { Alert.alert('Required', 'Enter a valid limit'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/budgets/${editItem.budget_id}`, { monthly_limit: parseFloat(form.monthly_limit) });
      } else {
        await api.post('/budgets', { category: form.category, monthly_limit: parseFloat(form.monthly_limit) });
      }
      setShowAdd(false);
      setEditItem(null);
      setForm({ category: '', monthly_limit: '' });
      load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const deleteBudget = (item: any) => {
    Alert.alert('Delete Budget', `Remove ${getCategoryLabel(item.category)} budget?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/budgets/${item.budget_id}`); load(); }
        catch { Alert.alert('Error', 'Failed'); }
      }},
    ]);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ category: item.category, monthly_limit: item.monthly_limit.toString() });
    setShowAdd(true);
  };

  const getCategoryLabel = (key: string) => EXPENSE_CATEGORIES.find(c => c.key === key)?.label || key;
  const getCategoryIcon = (key: string) => EXPENSE_CATEGORIES.find(c => c.key === key)?.icon || 'ellipsis-horizontal';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over_budget': return '#FF5252';
      case 'warning': return '#FFB300';
      default: return '#00E676';
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const budgets = data?.budgets || [];
  const unbudgeted = data?.unbudgeted_spending || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Budget Goals</Text>
        <TouchableOpacity onPress={() => { setEditItem(null); setForm({ category: '', monthly_limit: '' }); setShowAdd(true); }}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Overall Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Budgeted</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatINR(data?.total_budgeted || 0)}</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Spent</Text>
            <Text style={[styles.summaryValue, { color: '#FF5252' }]}>{formatINR(data?.total_spent || 0)}</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Usage</Text>
            <Text style={[styles.summaryValue, { color: (data?.overall_percentage || 0) > 100 ? '#FF5252' : (data?.overall_percentage || 0) > 80 ? '#FFB300' : '#00E676' }]}>
              {data?.overall_percentage || 0}%
            </Text>
          </View>
        </View>
        <View style={[styles.overallBar, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
          <View style={[styles.overallBarFill, { width: `${Math.min(data?.overall_percentage || 0, 100)}%`, backgroundColor: (data?.overall_percentage || 0) > 100 ? '#FF5252' : (data?.overall_percentage || 0) > 80 ? '#FFB300' : '#00E676' }]} />
        </View>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={i => i.budget_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const color = CAT_COLORS[item.category] || '#607D8B';
          const statusColor = getStatusColor(item.status);
          const icon = getCategoryIcon(item.category);
          return (
            <TouchableOpacity style={[styles.budgetCard, { backgroundColor: colors.card }]} onPress={() => openEdit(item)} activeOpacity={0.7}>
              <View style={styles.budgetTop}>
                <View style={[styles.budgetIcon, { backgroundColor: color + '18' }]}>
                  <Ionicons name={icon as any} size={20} color={color} />
                </View>
                <View style={styles.budgetInfo}>
                  <Text style={[styles.budgetName, { color: colors.text }]}>{getCategoryLabel(item.category)}</Text>
                  <Text style={[styles.budgetMeta, { color: colors.textSecondary }]}>
                    {formatINR(item.spent)} of {formatINR(item.monthly_limit)}
                  </Text>
                </View>
                <View style={styles.budgetRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{item.percentage}%</Text>
                  </View>
                  <Text style={[styles.budgetRemaining, { color: item.remaining >= 0 ? '#00E676' : '#FF5252' }]}>
                    {item.remaining >= 0 ? formatINR(item.remaining) + ' left' : formatINR(Math.abs(item.remaining)) + ' over'}
                  </Text>
                </View>
              </View>
              <View style={[styles.budgetBar, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <View style={[styles.budgetBarFill, { width: `${Math.min(item.percentage, 100)}%`, backgroundColor: statusColor }]} />
              </View>
              <View style={styles.budgetActions}>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: 'rgba(68,138,255,0.12)' }]} onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={14} color="#448AFF" />
                  <Text style={{ color: '#448AFF', fontSize: 11, fontWeight: '600' }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: 'rgba(255,82,82,0.12)' }]} onPress={() => deleteBudget(item)}>
                  <Ionicons name="trash-outline" size={14} color="#FF5252" />
                  <Text style={{ color: '#FF5252', fontSize: 11, fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <>
            {/* Unbudgeted Spending */}
            {unbudgeted.length > 0 && (
              <View style={styles.unbudgetedSection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Unbudgeted Spending</Text>
                {unbudgeted.map((u: any, i: number) => (
                  <View key={i} style={[styles.unbudgetedCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.budgetIcon, { backgroundColor: (CAT_COLORS[u.category] || '#607D8B') + '18' }]}>
                      <Ionicons name={getCategoryIcon(u.category) as any} size={18} color={CAT_COLORS[u.category] || '#607D8B'} />
                    </View>
                    <Text style={[styles.unbudgetedName, { color: colors.text }]}>{getCategoryLabel(u.category)}</Text>
                    <Text style={[styles.unbudgetedAmount, { color: '#FFB300' }]}>{formatINR(u.spent)}</Text>
                    <TouchableOpacity style={[styles.addBudgetBtn, { backgroundColor: 'rgba(68,138,255,0.12)' }]} onPress={() => { setForm({ category: u.category, monthly_limit: '' }); setEditItem(null); setShowAdd(true); }}>
                      <Text style={{ color: '#448AFF', fontSize: 11, fontWeight: '600' }}>Set Budget</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No budget goals set</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Set monthly spending limits per category</Text>
            <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(true)}>
              <Text style={styles.emptyAddBtnText}>Set Your First Budget</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Budget Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={styles.mHeader}>
              <Text style={[styles.mTitle, { color: colors.text }]}>{editItem ? 'Edit Budget' : 'Set Budget Goal'}</Text>
              <TouchableOpacity onPress={() => { setShowAdd(false); setEditItem(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Category */}
              {!editItem && (
                <>
                  <Text style={[styles.fl, { color: colors.text }]}>Category</Text>
                  <ScrollView horizontal={false} style={{ maxHeight: 200, marginBottom: 14 }}>
                    <View style={styles.catGrid}>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <TouchableOpacity
                          key={cat.key}
                          style={[styles.catChip, { borderColor: colors.border },
                            form.category === cat.key && { borderColor: CAT_COLORS[cat.key] || colors.primary, borderWidth: 2, backgroundColor: (CAT_COLORS[cat.key] || colors.primary) + '15' }]}
                          onPress={() => setForm(p => ({ ...p, category: cat.key }))}
                        >
                          <Ionicons name={cat.icon as any} size={16} color={form.category === cat.key ? (CAT_COLORS[cat.key] || colors.primary) : colors.textSecondary} />
                          <Text style={{ color: form.category === cat.key ? colors.text : colors.textSecondary, fontSize: 12, fontWeight: '500' }}>{cat.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}
              {editItem && (
                <View style={[styles.editCatDisplay, { backgroundColor: colors.background }]}>
                  <Ionicons name={getCategoryIcon(form.category) as any} size={20} color={CAT_COLORS[form.category] || '#607D8B'} />
                  <Text style={[styles.editCatText, { color: colors.text }]}>{getCategoryLabel(form.category)}</Text>
                </View>
              )}

              {/* Monthly Limit */}
              <Text style={[styles.fl, { color: colors.text }]}>Monthly Limit</Text>
              <View style={[styles.fi, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.rupee, { color: colors.primary }]}>{'\u20B9'}</Text>
                <TextInput
                  style={[styles.ft, { color: colors.text }]}
                  placeholder="e.g., 10000"
                  placeholderTextColor={colors.textSecondary}
                  value={form.monthly_limit}
                  onChangeText={v => setForm(p => ({ ...p, monthly_limit: v }))}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Quick Amount Chips */}
              <View style={styles.quickRow}>
                {[1000, 2000, 5000, 10000, 15000, 25000].map(amt => (
                  <TouchableOpacity key={amt} style={[styles.quickChip, { borderColor: colors.border }, form.monthly_limit === amt.toString() && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setForm(p => ({ ...p, monthly_limit: amt.toString() }))}>
                    <Text style={[styles.quickText, { color: form.monthly_limit === amt.toString() ? '#FFF' : colors.text }]}>{'\u20B9'}{amt >= 1000 ? `${amt / 1000}K` : amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editItem ? 'Update Budget' : 'Set Budget'}</Text>}
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
  summaryCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', marginBottom: 14 },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  overallBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  overallBarFill: { height: '100%', borderRadius: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  budgetCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  budgetTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  budgetIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  budgetInfo: { flex: 1 },
  budgetName: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  budgetMeta: { fontSize: 12 },
  budgetRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  budgetRemaining: { fontSize: 11 },
  budgetBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  budgetBarFill: { height: '100%', borderRadius: 3 },
  budgetActions: { flexDirection: 'row', gap: 10 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  unbudgetedSection: { marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  unbudgetedCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  unbudgetedName: { flex: 1, fontSize: 14, fontWeight: '500' },
  unbudgetedAmount: { fontSize: 14, fontWeight: '700' },
  addBudgetBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 13 },
  emptyAddBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyAddBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { fontSize: 18, fontWeight: 'bold' },
  fl: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  editCatDisplay: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, marginBottom: 16 },
  editCatText: { fontSize: 16, fontWeight: '600' },
  fi: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 50, marginBottom: 10 },
  rupee: { fontSize: 22, fontWeight: 'bold', marginRight: 8 },
  ft: { flex: 1, fontSize: 18, fontWeight: '600' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  quickText: { fontSize: 13, fontWeight: '600' },
  saveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
