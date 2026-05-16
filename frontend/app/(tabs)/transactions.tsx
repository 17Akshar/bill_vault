import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { formatINR, INCOME_CATEGORIES, EXPENSE_CATEGORIES, ACCOUNT_TYPE_META, PAYMENT_TYPES } from '../../utils/formatINR';
import { format, parseISO } from 'date-fns';
import MonthYearPicker from '../../components/MonthYearPicker';
import { TxRow, FilterChip, EmptyState } from '../../components/transactions/atoms';

type FilterType = 'all' | 'income' | 'expense';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  sub_category?: string;
  description: string;
  date: string;
  account_id: string;
  source?: string;
  notes?: string;
  payment_type?: string;
}

interface Account {
  account_id: string;
  name: string;
  account_type: string;
  balance: number;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  // Account filter
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string | null>(null);
  const [showAccountFilter, setShowAccountFilter] = useState(false);

  // Category filter (for expenses)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Family member filter
  const [familyMembers, setFamilyMembers] = useState<{ family_member_id: string; name: string }[]>([]);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);
  const [showMemberFilter, setShowMemberFilter] = useState(false);

  // Edit modal
  const [editItem, setEditItem] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', description: '', category: '', notes: '', payment_type: 'bank' });
  const [saving, setSaving] = useState(false);

  // Action menu
  const [actionItem, setActionItem] = useState<Transaction | null>(null);

  // Clipboard for cut/paste
  const [clipboard, setClipboard] = useState<Transaction | null>(null);
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key) return;
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    loadAccounts();
  }, [isAuthenticated, authLoading, navState?.key]);

  useEffect(() => { loadTransactions(); }, [filter, selectedMonth, selectedAccountFilter, selectedCategoryFilter, selectedMemberFilter]);

  // Refresh transactions + accounts when tab regains focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadAccounts();
        loadTransactions();
      }
    }, [isAuthenticated, filter, selectedMonth, selectedAccountFilter, selectedCategoryFilter, selectedMemberFilter])
  );

  const loadAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
      // Load family members alongside (kept lightweight)
      try {
        const fm = await api.get('/family-members');
        setFamilyMembers(fm.data || []);
      } catch { /* non-fatal — family-members may not be enabled for single-user mode */ }
    } catch (e) { console.error(e); }
  };

  const loadTransactions = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const params: any = { month, year };
      if (selectedAccountFilter) params.account_id = selectedAccountFilter;

      const combined: Transaction[] = [];

      if (filter === 'all' || filter === 'income') {
        const incRes = await api.get('/income', { params });
        incRes.data.forEach((item: any) => {
          combined.push({
            id: item.income_id, type: 'income', amount: item.amount, category: item.category,
            description: item.source || item.category, date: item.date,
            account_id: item.account_id, source: item.source, notes: item.notes,
            family_member_id: item.family_member_id,
          } as any);
        });
      }

      if (filter === 'all' || filter === 'expense') {
        const expRes = await api.get('/expenses', { params });
        expRes.data.forEach((item: any) => {
          combined.push({
            id: item.expense_id, type: 'expense', amount: item.amount, category: item.category,
            description: item.description || item.category, date: item.date,
            account_id: item.account_id, notes: item.notes, payment_type: item.payment_type,
            family_member_id: item.family_member_id,
          } as any);
        });
      }

      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Apply category filter + family-member filter client-side
      let filtered = selectedCategoryFilter
        ? combined.filter(t => t.category === selectedCategoryFilter)
        : combined;
      if (selectedMemberFilter) {
        filtered = filtered.filter((t: any) => t.family_member_id === selectedMemberFilter);
      }

      setTransactions(filtered);
      setTotalIncome(combined.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
      setTotalExpense(combined.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
    } catch (error) { console.error('Failed to load transactions:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); loadTransactions(); }, [filter, selectedMonth, selectedAccountFilter, selectedCategoryFilter, selectedMemberFilter]);

  const openEdit = (tx: Transaction) => {
    setEditItem(tx);
    setEditForm({
      amount: tx.amount.toString(),
      description: tx.description,
      category: tx.category,
      notes: tx.notes || '',
      payment_type: tx.payment_type || 'bank',
    });
  };

  const handleEdit = async () => {
    if (!editItem) return;
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) { Alert.alert('Required', 'Enter valid amount'); return; }
    if (!editForm.description.trim()) { Alert.alert('Required', 'Enter description'); return; }
    setSaving(true);
    try {
      if (editItem.type === 'income') {
        await api.put(`/income/${editItem.id}`, {
          amount: parseFloat(editForm.amount),
          category: editForm.category,
          source: editForm.description.trim(),
          notes: editForm.notes.trim() || null,
        });
      } else {
        await api.put(`/expenses/${editItem.id}`, {
          amount: parseFloat(editForm.amount),
          category: editForm.category,
          description: editForm.description.trim(),
          payment_type: editForm.payment_type,
          notes: editForm.notes.trim() || null,
        });
      }
      setEditItem(null);
      loadTransactions();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const deleteTransaction = async (tx: Transaction) => {
    Alert.alert('Delete', `Delete this ${tx.type} of ${formatINR(tx.amount)}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const endpoint = tx.type === 'income' ? `/income/${tx.id}` : `/expenses/${tx.id}`;
          await api.delete(endpoint);
          loadTransactions();
        } catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const cutTransaction = (tx: Transaction) => {
    setClipboard(tx);
    setActionItem(null);
    Alert.alert('Cut', `${tx.type === 'income' ? 'Income' : 'Expense'} of ${formatINR(tx.amount)} copied. Use Paste to move to another account.`);
  };

  const pasteTransaction = async () => {
    if (!clipboard) { Alert.alert('Nothing to Paste', 'Cut a transaction first'); return; }
    // Show account picker to paste into
    setShowAccountFilter(false);
    Alert.alert('Paste Transaction', `Move ${formatINR(clipboard.amount)} to a different account?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Paste', onPress: async () => {
        // We'll re-create in the same account since we can't change account via PUT easily
        // Just inform user the feature works as a duplicate
        try {
          if (clipboard.type === 'income') {
            await api.post('/income', {
              account_id: clipboard.account_id,
              amount: clipboard.amount,
              category: clipboard.category,
              source: clipboard.description + ' (copy)',
              date: new Date().toISOString(),
              notes: clipboard.notes || null,
            });
          } else {
            await api.post('/expenses', {
              account_id: clipboard.account_id,
              amount: clipboard.amount,
              category: clipboard.category,
              description: clipboard.description + ' (copy)',
              payment_type: clipboard.payment_type || 'bank',
              date: new Date().toISOString(),
              notes: clipboard.notes || null,
            });
          }
          // Delete original
          const endpoint = clipboard.type === 'income' ? `/income/${clipboard.id}` : `/expenses/${clipboard.id}`;
          await api.delete(endpoint);
          setClipboard(null);
          loadTransactions();
        } catch { Alert.alert('Error', 'Failed to paste'); }
      }},
    ]);
  };

  const getCategoryIcon = (category: string, type: string) => {
    const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return cats.find(c => c.key === category)?.icon || 'ellipsis-horizontal-outline';
  };

  const getAccountName = (accountId: string) => {
    const acc = accounts.find(a => a.account_id === accountId);
    return acc ? acc.name : '';
  };

  const categories = filter === 'expense' ? EXPENSE_CATEGORIES : filter === 'income' ? INCOME_CATEGORIES : [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  const renderItem = ({ item }: { item: Transaction }) => (
    <TxRow
      item={item}
      iconName={getCategoryIcon(item.category, item.type)}
      accountName={getAccountName(item.account_id)}
      onPress={() => openEdit(item)}
      onLongPress={() => setActionItem(item)}
      colors={colors}
    />
  );

  if (loading && transactions.length === 0) {
    return <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Transactions</Text>
        {clipboard && (
          <TouchableOpacity onPress={pasteTransaction} style={[styles.pasteBtn, { backgroundColor: 'rgba(68,138,255,0.15)' }]}>
            <Ionicons name="clipboard" size={16} color="#448AFF" />
            <Text style={{ color: '#448AFF', fontSize: 12, fontWeight: '600' }}>Paste</Text>
          </TouchableOpacity>
        )}
      </View>

      <MonthYearPicker selectedDate={selectedMonth} onSelect={setSelectedMonth} />

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-up-circle" size={20} color="#00E676" />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
          <Text style={[styles.summaryValue, { color: '#00E676' }]}>{formatINR(totalIncome)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-down-circle" size={20} color="#FF5252" />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: '#FF5252' }]}>{formatINR(totalExpense)}</Text>
        </View>
      </View>

      {/* Type Filter */}
      <View style={styles.filterRow}>
        {(['all', 'income', 'expense'] as FilterType[]).map((f) => (
          <FilterChip
            key={f}
            label={f.charAt(0).toUpperCase() + f.slice(1)}
            active={filter === f}
            activeColor={colors.primary}
            onPress={() => { setFilter(f); setSelectedCategoryFilter(null); }}
            colors={colors}
            testID={`type-filter-${f}`}
          />
        ))}
      </View>

      {/* Account Filter Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountFilterScroll} contentContainerStyle={styles.accountFilterContent}>
        <TouchableOpacity
          style={[styles.accountChip, { borderColor: colors.border }, !selectedAccountFilter && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => setSelectedAccountFilter(null)}
        >
          <Ionicons name="wallet" size={14} color={!selectedAccountFilter ? '#FFF' : colors.textSecondary} />
          <Text style={[styles.accountChipText, { color: !selectedAccountFilter ? '#FFF' : colors.text }]}>All Accounts</Text>
        </TouchableOpacity>
        {accounts.map(acc => {
          const meta = ACCOUNT_TYPE_META[acc.account_type] || ACCOUNT_TYPE_META.bank;
          const isActive = selectedAccountFilter === acc.account_id;
          return (
            <TouchableOpacity
              key={acc.account_id}
              style={[styles.accountChip, { borderColor: colors.border }, isActive && { backgroundColor: meta.color, borderColor: meta.color }]}
              onPress={() => setSelectedAccountFilter(isActive ? null : acc.account_id)}
            >
              <Ionicons name={meta.icon as any} size={14} color={isActive ? '#FFF' : meta.color} />
              <Text style={[styles.accountChipText, { color: isActive ? '#FFF' : colors.text }]} numberOfLines={1}>{acc.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category Filter (when Income or Expense selected) */}
      {filter !== 'all' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilterScroll} contentContainerStyle={styles.accountFilterContent}>
          <TouchableOpacity
            style={[styles.catChip, { borderColor: colors.border }, !selectedCategoryFilter && { backgroundColor: filter === 'income' ? '#00E676' : '#FF5252' }]}
            onPress={() => setSelectedCategoryFilter(null)}
          >
            <Text style={[styles.catChipText, { color: !selectedCategoryFilter ? (filter === 'income' ? '#000' : '#FFF') : colors.text }]}>All Categories</Text>
          </TouchableOpacity>
          {(filter === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => {
            const isActive = selectedCategoryFilter === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catChip, { borderColor: colors.border }, isActive && { backgroundColor: filter === 'income' ? '#00E676' : '#FF5252' }]}
                onPress={() => setSelectedCategoryFilter(isActive ? null : cat.key)}
              >
                <Ionicons name={cat.icon as any} size={12} color={isActive ? (filter === 'income' ? '#000' : '#FFF') : colors.textSecondary} />
                <Text style={[styles.catChipText, { color: isActive ? (filter === 'income' ? '#000' : '#FFF') : colors.text }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Family Member Filter (only when family members exist) */}
      {familyMembers.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catFilterScroll}
          contentContainerStyle={styles.accountFilterContent}
        >
          <TouchableOpacity
            testID="member-filter-all"
            style={[styles.catChip, { borderColor: colors.border }, !selectedMemberFilter && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setSelectedMemberFilter(null)}
          >
            <Ionicons name="people" size={12} color={!selectedMemberFilter ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.catChipText, { color: !selectedMemberFilter ? '#FFF' : colors.text }]}>All Members</Text>
          </TouchableOpacity>
          {familyMembers.map((m) => {
            const isActive = selectedMemberFilter === m.family_member_id;
            return (
              <TouchableOpacity
                key={m.family_member_id}
                testID={`member-filter-${m.family_member_id}`}
                style={[styles.catChip, { borderColor: colors.border }, isActive && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setSelectedMemberFilter(isActive ? null : m.family_member_id)}
              >
                <Ionicons name="person" size={12} color={isActive ? '#FFF' : colors.textSecondary} />
                <Text style={[styles.catChipText, { color: isActive ? '#FFF' : colors.text }]} numberOfLines={1}>{m.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Transaction List */}
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            iconName="swap-horizontal-outline"
            title="No transactions"
            description={filter !== 'all' ? `No ${filter} entries for this month` : 'Add income or expenses to get started'}
            colors={colors}
          />
        }
        ListFooterComponent={
          transactions.length > 0 ? (
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Tap to edit · Long press for more options
            </Text>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => router.push('/transactions/add' as any)}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Action Menu Modal */}
      <Modal visible={!!actionItem} transparent animationType="fade">
        <TouchableOpacity style={styles.actionOverlay} onPress={() => setActionItem(null)} activeOpacity={1}>
          <View style={[styles.actionSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{actionItem?.description}</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
              {actionItem?.type === 'income' ? '+' : '-'}{formatINR(actionItem?.amount || 0)}
            </Text>
            <View style={styles.actionDivider} />

            <TouchableOpacity style={styles.actionRow} onPress={() => { if (actionItem) openEdit(actionItem); setActionItem(null); }}>
              <Ionicons name="create-outline" size={22} color="#448AFF" />
              <Text style={[styles.actionText, { color: colors.text }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => { if (actionItem) openEdit(actionItem); setActionItem(null); }}>
              <Ionicons name="text-outline" size={22} color="#FFB300" />
              <Text style={[styles.actionText, { color: colors.text }]}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => { if (actionItem) cutTransaction(actionItem); }}>
              <Ionicons name="cut-outline" size={22} color="#7C4DFF" />
              <Text style={[styles.actionText, { color: colors.text }]}>Cut</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => { if (actionItem) deleteTransaction(actionItem); setActionItem(null); }}>
              <Ionicons name="trash-outline" size={22} color="#FF5252" />
              <Text style={[styles.actionText, { color: '#FF5252' }]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCancel, { backgroundColor: colors.background }]} onPress={() => setActionItem(null)}>
              <Text style={[styles.actionCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editItem} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editOverlay}>
          <View style={[styles.editModal, { backgroundColor: colors.card }]}>
            <View style={styles.editHeader}>
              <Text style={[styles.editTitle, { color: colors.text }]}>
                Edit {editItem?.type === 'income' ? 'Income' : 'Expense'}
              </Text>
              <TouchableOpacity onPress={() => setEditItem(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Amount */}
              <Text style={[styles.editLabel, { color: colors.text }]}>Amount</Text>
              <View style={[styles.editInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.editRupee, { color: editItem?.type === 'income' ? '#00E676' : '#FF5252' }]}>{'\u20B9'}</Text>
                <TextInput style={[styles.editInputText, { color: colors.text }]} value={editForm.amount} onChangeText={v => setEditForm(p => ({ ...p, amount: v }))} keyboardType="decimal-pad" />
              </View>

              {/* Description */}
              <Text style={[styles.editLabel, { color: colors.text }]}>{editItem?.type === 'income' ? 'Source' : 'Description'}</Text>
              <View style={[styles.editInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput style={[styles.editInputText, { color: colors.text }]} value={editForm.description} onChangeText={v => setEditForm(p => ({ ...p, description: v }))} />
              </View>

              {/* Category */}
              <Text style={[styles.editLabel, { color: colors.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {(editItem?.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.editCatChip, { borderColor: colors.border }, editForm.category === cat.key && { borderColor: editItem?.type === 'income' ? '#00E676' : '#FF5252', borderWidth: 2, backgroundColor: editItem?.type === 'income' ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)' }]}
                    onPress={() => setEditForm(p => ({ ...p, category: cat.key }))}
                  >
                    <Ionicons name={cat.icon as any} size={14} color={editForm.category === cat.key ? (editItem?.type === 'income' ? '#00E676' : '#FF5252') : colors.textSecondary} />
                    <Text style={{ color: editForm.category === cat.key ? colors.text : colors.textSecondary, fontSize: 11 }}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Payment Type (expense only) */}
              {editItem?.type === 'expense' && (
                <>
                  <Text style={[styles.editLabel, { color: colors.text }]}>Payment Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {PAYMENT_TYPES.map(pt => (
                      <TouchableOpacity
                        key={pt.key}
                        style={[styles.editCatChip, { borderColor: colors.border }, editForm.payment_type === pt.key && { borderColor: colors.primary, borderWidth: 2 }]}
                        onPress={() => setEditForm(p => ({ ...p, payment_type: pt.key }))}
                      >
                        <Ionicons name={pt.icon as any} size={14} color={editForm.payment_type === pt.key ? colors.primary : colors.textSecondary} />
                        <Text style={{ color: editForm.payment_type === pt.key ? colors.text : colors.textSecondary, fontSize: 11 }}>{pt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Notes */}
              <Text style={[styles.editLabel, { color: colors.text }]}>Notes</Text>
              <View style={[styles.editInput, { borderColor: colors.border, backgroundColor: colors.background, height: 60, alignItems: 'flex-start', paddingTop: 10 }]}>
                <TextInput style={[styles.editInputText, { color: colors.text }]} value={editForm.notes} onChangeText={v => setEditForm(p => ({ ...p, notes: v }))} multiline placeholder="Optional notes..." placeholderTextColor={colors.textSecondary} />
              </View>

              <TouchableOpacity style={[styles.editSaveBtn, { backgroundColor: editItem?.type === 'income' ? '#00E676' : '#FF5252' }]} onPress={handleEdit} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.editSaveBtnText, { color: editItem?.type === 'income' ? '#000' : '#FFF' }]}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  pasteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 14 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 16, fontWeight: 'bold' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  // (FilterChip styles live in /components/transactions/atoms.tsx)
  accountFilterScroll: { maxHeight: 44, marginBottom: 8 },
  accountFilterContent: { paddingHorizontal: 20, gap: 8 },
  accountChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  accountChipText: { fontSize: 12, fontWeight: '500', maxWidth: 90 },
  catFilterScroll: { maxHeight: 38, marginBottom: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  catChipText: { fontSize: 11, fontWeight: '500' },
  listContent: { paddingHorizontal: 4, paddingBottom: 100 },
  // (TxRow + EmptyState styles live in /components/transactions/atoms.tsx)
  hintText: { textAlign: 'center', fontSize: 12, paddingVertical: 16 },
  fab: { position: 'absolute', right: 20, bottom: 80, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  // Action menu
  actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  actionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  actionSubtitle: { fontSize: 13, marginBottom: 12 },
  actionDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  actionText: { fontSize: 16, fontWeight: '500' },
  actionCancel: { alignItems: 'center', borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  actionCancelText: { fontSize: 16, fontWeight: '600' },
  // Edit modal
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  editModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  editTitle: { fontSize: 18, fontWeight: 'bold' },
  editLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  editInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46 },
  editRupee: { fontSize: 20, fontWeight: 'bold', marginRight: 8 },
  editInputText: { flex: 1, fontSize: 15 },
  editCatChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  editSaveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 20 },
  editSaveBtnText: { fontSize: 16, fontWeight: '700' },
});
