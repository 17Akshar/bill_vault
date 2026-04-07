import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { formatINR, ACCOUNT_TYPE_META } from '../../utils/formatINR';

interface Account {
  account_id: string;
  name: string;
  account_type: string;
  balance: number;
  account_number?: string;
  family_member_id?: string;
  is_active: boolean;
}

export default function AccountsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    loadAccounts();
  }, [isAuthenticated, filterType]);

  const loadAccounts = async () => {
    try {
      const params: any = {};
      if (filterType) params.account_type = filterType;
      const response = await api.get('/accounts', { params });
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAccounts();
  }, [filterType]);

  const deleteAccount = (accountId: string, accountName: string) => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to deactivate "${accountName}"? This cannot be undone. Transaction history will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/accounts/${accountId}`);
              setAccounts(accounts.filter(a => a.account_id !== accountId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const accountTypes = ['bank', 'cash', 'upi', 'credit_card'];

  const renderAccountItem = ({ item }: { item: Account }) => {
    const meta = ACCOUNT_TYPE_META[item.account_type] || ACCOUNT_TYPE_META.bank;
    return (
      <View style={[styles.accountCard, { backgroundColor: colors.card }]}>
        <View style={styles.accountCardContent}>
          <View style={[styles.accountIcon, { backgroundColor: meta.color + '20' }]}>
            <Ionicons name={meta.icon as any} size={24} color={meta.color} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.accountType, { color: colors.textSecondary }]}>
              {meta.label}
              {item.account_number ? ` · ${item.account_number.slice(-4)}` : ''}
            </Text>
          </View>
          <View style={styles.accountRight}>
            <Text style={[styles.accountBalance, { color: item.balance >= 0 ? colors.text : '#FF5252' }]}>
              {formatINR(item.balance)}
            </Text>
            <TouchableOpacity
              onPress={() => deleteAccount(item.account_id, item.name)}
              style={styles.deleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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
          style={[
            styles.filterChip,
            { borderColor: colors.border },
            !filterType && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => setFilterType(null)}
        >
          <Text style={[styles.filterText, { color: !filterType ? '#FFF' : colors.text }]}>All</Text>
        </TouchableOpacity>
        {accountTypes.map((type) => {
          const meta = ACCOUNT_TYPE_META[type];
          const isActive = filterType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                isActive && { backgroundColor: meta.color, borderColor: meta.color },
              ]}
              onPress={() => setFilterType(isActive ? null : type)}
            >
              <Text style={[styles.filterText, { color: isActive ? '#FFF' : colors.text }]}>
                {meta.label.replace(' Account', '')}
              </Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No accounts yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Add your bank accounts, cash wallets, or UPI
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/accounts/add' as any)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  totalCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  totalAccounts: {
    fontSize: 13,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  accountCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  accountCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  accountType: {
    fontSize: 13,
  },
  accountRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  accountBalance: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
