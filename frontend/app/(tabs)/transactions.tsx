import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { formatINR, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../utils/formatINR';
import { format, parseISO } from 'date-fns';
import MonthYearPicker from '../../components/MonthYearPicker';

type FilterType = 'all' | 'income' | 'expense';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  account_id: string;
  source?: string;
  notes?: string;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    loadTransactions();
  }, [isAuthenticated, filter, selectedMonth]);

  const loadTransactions = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const params = { month, year };

      const combined: Transaction[] = [];

      if (filter === 'all' || filter === 'income') {
        const incRes = await api.get('/income', { params });
        incRes.data.forEach((item: any) => {
          combined.push({
            id: item.income_id,
            type: 'income',
            amount: item.amount,
            category: item.category,
            description: item.source || item.category,
            date: item.date,
            account_id: item.account_id,
            source: item.source,
            notes: item.notes,
          });
        });
      }

      if (filter === 'all' || filter === 'expense') {
        const expRes = await api.get('/expenses', { params });
        expRes.data.forEach((item: any) => {
          combined.push({
            id: item.expense_id,
            type: 'expense',
            amount: item.amount,
            category: item.category,
            description: item.description || item.category,
            date: item.date,
            account_id: item.account_id,
            notes: item.notes,
          });
        });
      }

      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(combined);

      const inc = combined.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = combined.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      setTotalIncome(inc);
      setTotalExpense(exp);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions();
  }, [filter, selectedMonth]);

  const deleteTransaction = (tx: Transaction) => {
    const typeName = tx.type === 'income' ? 'income entry' : 'expense';
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this ${typeName} of ${formatINR(tx.amount)}? The account balance will be adjusted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const endpoint = tx.type === 'income' ? `/income/${tx.id}` : `/expenses/${tx.id}`;
              await api.delete(endpoint);
              setTransactions(transactions.filter(t => t.id !== tx.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedMonth);
    if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  };

  const getCategoryIcon = (category: string, type: string) => {
    const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const found = cats.find(c => c.key === category);
    return found?.icon || 'ellipsis-horizontal-outline';
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'income';
    const icon = getCategoryIcon(item.category, item.type);
    return (
      <TouchableOpacity
        style={[styles.txCard, { backgroundColor: colors.card }]}
        onLongPress={() => deleteTransaction(item)}
        delayLongPress={600}
      >
        <View style={[
          styles.txIcon,
          { backgroundColor: isIncome ? 'rgba(0,230,118,0.12)' : 'rgba(255,82,82,0.12)' }
        ]}>
          <Ionicons name={icon as any} size={20} color={isIncome ? '#00E676' : '#FF5252'} />
        </View>
        <View style={styles.txInfo}>
          <Text style={[styles.txDesc, { color: colors.text }]}>{item.description}</Text>
          <Text style={[styles.txMeta, { color: colors.textSecondary }]}>
            {item.category} · {item.date ? format(parseISO(item.date), 'dd MMM yyyy') : ''}
          </Text>
        </View>
        <Text style={[styles.txAmount, { color: isIncome ? '#00E676' : '#FF5252' }]}>
          {isIncome ? '+' : '-'}{formatINR(item.amount)}
        </Text>
      </TouchableOpacity>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Transactions</Text>
      </View>

      {/* Month Selector */}
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

      {/* Filter */}
      <View style={styles.filterRow}>
        {(['all', 'income', 'expense'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterBtn,
              { borderColor: colors.border },
              filter === f && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? '#FFF' : colors.text }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="swap-horizontal-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {filter !== 'all' ? `No ${filter} entries for this month` : 'Add income or expenses to get started'}
            </Text>
          </View>
        }
        ListFooterComponent={
          transactions.length > 0 ? (
            <Text style={[styles.longPressHint, { color: colors.textSecondary }]}>
              Long press a transaction to delete
            </Text>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/transactions/add' as any)}
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
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  monthArrow: {
    padding: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
  },
  txMeta: {
    fontSize: 12,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
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
  longPressHint: {
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 16,
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
