import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { formatINR, ACCOUNT_TYPE_META } from '../../utils/formatINR';

interface Account {
  account_id: string;
  name: string;
  account_type: string;
  balance: number;
  initial_balance: number;
  account_number?: string;
  family_member_id?: string;
  is_active: boolean;
}

const ACCOUNT_TYPES = [
  { key: 'bank', label: 'Bank', icon: 'business-outline', color: '#448AFF' },
  { key: 'cash', label: 'Cash', icon: 'cash-outline', color: '#00E676' },
  { key: 'upi', label: 'UPI', icon: 'phone-portrait-outline', color: '#7C4DFF' },
  { key: 'credit_card', label: 'Credit Card', icon: 'card-outline', color: '#FF9100' },
];

export default function AccountsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Edit modal
  const [editItem, setEditItem] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState({ name: '', account_number: '', account_type: '' });
  const [saving, setSaving] = useState(false);

  // Action menu
  const [actionItem, setActionItem] = useState<Account | null>(null);
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key) return;
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    loadAccounts();
  }, [isAuthenticated, filterType, navState?.key]);

  // Refresh accounts whenever the tab regains focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) { loadAccounts(); }
    }, [isAuthenticated, filterType])
  );

  const loadAccounts = async () => {
    try {
      const params: any = {};
      if (filterType) params.account_type = filterType;
      const response = await api.get('/accounts', { params });
      setAccounts(response.data);
    } catch (error) { console.error('Failed to load accounts:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); loadAccounts(); }, [filterType]);

  const openEdit = (acc: Account) => {
    setEditItem(acc);
    setEditForm({
      name: acc.name,
      account_number: acc.account_number || '',
      account_type: acc.account_type,
    });
    setActionItem(null);
  };

  const handleEdit = async () => {
    if (!editItem) return;
    if (!editForm.name.trim()) { Alert.alert('Required', 'Enter account name'); return; }
    setSaving(true);
    try {
      await api.put(`/accounts/${editItem.account_id}`, {
        name: editForm.name.trim(),
        account_number: editForm.account_number.trim() || null,
      });
      setEditItem(null);
      loadAccounts();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const deleteAccount = (acc: Account) => {
    Alert.alert('Delete Account', `Deactivate "${acc.name}"? Transaction history will be preserved.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/accounts/${acc.account_id}`);
          loadAccounts();
        } catch { Alert.alert('Error', 'Failed to delete account'); }
      }},
    ]);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const renderAccountItem = ({ item }: { item: Account }) => {
    const meta = ACCOUNT_TYPE_META[item.account_type] || ACCOUNT_TYPE_META.bank;
    return (
      <TouchableOpacity
        style={[styles.accountCard, { backgroundColor: colors.card }]}
        onPress={() => openEdit(item)}
        onLongPress={() => setActionItem(item)}
        delayLongPress={400}
        activeOpacity={0.7}
      >
        <View style={styles.accountCardContent}>
          <View style={[styles.accountIcon, { backgroundColor: meta.color + '20' }]}>
            <Ionicons name={meta.icon as any} size={24} color={meta.color} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.accountType, { color: colors.textSecondary }]}>
              {meta.label}
              {item.account_number ? ` · ****${item.account_number.slice(-4)}` : ''}
            </Text>
          </View>
          <View style={styles.accountRight}>
            <Text style={[styles.accountBalance, { color: item.balance >= 0 ? colors.text : '#FF5252' }]}>
              {formatINR(item.balance)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Accounts</Text>
      </View>

      {/* Total Balance */}
      <View style={[styles.totalCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Balance</Text>
        <Text style={[styles.totalValue, { color: colors.text }]}>{formatINR(totalBalance)}</Text>
        <Text style={[styles.totalAccounts, { color: colors.textSecondary }]}>
          {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
        </Text>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, { borderColor: colors.border }, !filterType && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => setFilterType(null)}
        >
          <Text style={[styles.filterText, { color: !filterType ? '#FFF' : colors.text }]}>All</Text>
        </TouchableOpacity>
        {ACCOUNT_TYPES.map((type) => {
          const isActive = filterType === type.key;
          return (
            <TouchableOpacity
              key={type.key}
              style={[styles.filterChip, { borderColor: colors.border }, isActive && { backgroundColor: type.color, borderColor: type.color }]}
              onPress={() => setFilterType(isActive ? null : type.key)}
            >
              <Text style={[styles.filterText, { color: isActive ? '#FFF' : colors.text }]}>{type.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Accounts List */}
      <FlatList
        data={accounts}
        renderItem={renderAccountItem}
        keyExtractor={(item) => item.account_id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No accounts yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Add your bank accounts, cash wallets, or UPI</Text>
          </View>
        }
        ListFooterComponent={
          accounts.length > 0 ? (
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>Tap to edit · Long press for more options</Text>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => router.push('/accounts/add' as any)}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Action Menu */}
      <Modal visible={!!actionItem} transparent animationType="fade">
        <TouchableOpacity style={styles.actionOverlay} onPress={() => setActionItem(null)} activeOpacity={1}>
          <View style={[styles.actionSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{actionItem?.name}</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
              {formatINR(actionItem?.balance || 0)} · {ACCOUNT_TYPE_META[actionItem?.account_type || 'bank']?.label}
            </Text>
            <View style={styles.actionDivider} />

            <TouchableOpacity style={styles.actionRow} onPress={() => { if (actionItem) openEdit(actionItem); }}>
              <Ionicons name="create-outline" size={22} color="#448AFF" />
              <Text style={[styles.actionText, { color: colors.text }]}>Edit Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => { if (actionItem) { openEdit(actionItem); } }}>
              <Ionicons name="text-outline" size={22} color="#FFB300" />
              <Text style={[styles.actionText, { color: colors.text }]}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => { if (actionItem) { deleteAccount(actionItem); setActionItem(null); } }}>
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
              <Text style={[styles.editTitle, { color: colors.text }]}>Edit Account</Text>
              <TouchableOpacity onPress={() => setEditItem(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Account Type (read-only display) */}
              <Text style={[styles.editLabel, { color: colors.text }]}>Account Type</Text>
              <View style={styles.typeDisplay}>
                {ACCOUNT_TYPES.map(at => {
                  const isActive = editForm.account_type === at.key;
                  return (
                    <View key={at.key} style={[styles.typeChip, isActive && { backgroundColor: at.color + '20', borderColor: at.color, borderWidth: 2 }]}>
                      <Ionicons name={at.icon as any} size={16} color={isActive ? at.color : colors.textSecondary} />
                      <Text style={{ color: isActive ? colors.text : colors.textSecondary, fontSize: 12, fontWeight: '500' }}>{at.label}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Name */}
              <Text style={[styles.editLabel, { color: colors.text }]}>Account Name</Text>
              <View style={[styles.editInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput style={[styles.editInputText, { color: colors.text }]} value={editForm.name} onChangeText={v => setEditForm(p => ({ ...p, name: v }))} placeholder="Account name" placeholderTextColor={colors.textSecondary} />
              </View>

              {/* Account Number */}
              <Text style={[styles.editLabel, { color: colors.text }]}>Account Number</Text>
              <View style={[styles.editInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput style={[styles.editInputText, { color: colors.text }]} value={editForm.account_number} onChangeText={v => setEditForm(p => ({ ...p, account_number: v }))} placeholder="Optional" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" />
              </View>

              {/* Balance (read-only) */}
              <Text style={[styles.editLabel, { color: colors.text }]}>Current Balance</Text>
              <View style={[styles.balanceDisplay, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.balanceText, { color: colors.text }]}>{formatINR(editItem?.balance || 0)}</Text>
                <Text style={[styles.balanceHint, { color: colors.textSecondary }]}>Updated via transactions</Text>
              </View>

              <TouchableOpacity style={[styles.editSaveBtn, { backgroundColor: colors.primary }]} onPress={handleEdit} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.editSaveBtnText}>Save Changes</Text>}
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
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  totalCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 13, marginBottom: 6 },
  totalValue: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  totalAccounts: { fontSize: 13 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  accountCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  accountCardContent: { flexDirection: 'row', alignItems: 'center' },
  accountIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: '600', marginBottom: 3 },
  accountType: { fontSize: 13 },
  accountRight: { alignItems: 'flex-end', gap: 6 },
  accountBalance: { fontSize: 17, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14 },
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
  editModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  editTitle: { fontSize: 18, fontWeight: 'bold' },
  editLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  editInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46 },
  editInputText: { flex: 1, fontSize: 15 },
  typeDisplay: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  balanceDisplay: { borderWidth: 1, borderRadius: 10, padding: 14 },
  balanceText: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  balanceHint: { fontSize: 11 },
  editSaveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 20 },
  editSaveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
