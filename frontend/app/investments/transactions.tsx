import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import api from '../../utils/api';

type FilterType = 'all' | 'buy' | 'sell' | 'dividends';

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

export default function InvestmentTransactionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id, name } = useLocalSearchParams();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await api.get(`/investments/${id}/transactions`);
      setTransactions(res.data || []);
    } catch (e) {
      // keep prior state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      loadTransactions();
    }, [id, loadTransactions])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const filteredTransactions = transactions.filter((txn) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'dividends') return txn.transaction_type === 'dividend' || txn.transaction_type === 'charges';
    return txn.transaction_type === activeFilter;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return { icon: 'arrow-down-circle', color: '#00E676' };
      case 'sell':
        return { icon: 'arrow-up-circle', color: '#FF5252' };
      case 'dividend':
        return { icon: 'cash', color: '#448AFF' };
      case 'charges':
        return { icon: 'receipt', color: '#FF9100' };
      default:
        return { icon: 'swap-horizontal', color: colors.textSecondary };
    }
  };

  const getTransactionBadgeStyle = (type: string) => {
    switch (type) {
      case 'buy':
        return { backgroundColor: '#00E67620', textColor: '#00E676' };
      case 'sell':
        return { backgroundColor: '#FF525220', textColor: '#FF5252' };
      case 'dividend':
        return { backgroundColor: '#448AFF20', textColor: '#448AFF' };
      case 'charges':
        return { backgroundColor: '#FF910020', textColor: '#FF9100' };
      default:
        return { backgroundColor: colors.border, textColor: colors.text };
    }
  };

  const summary = transactions.reduce(
    (acc, txn) => {
      const amt = txn.amount || txn.total_amount || 0;
      if (txn.transaction_type === 'buy') {
        acc.totalBought += amt;
        acc.buyCount += 1;
      } else if (txn.transaction_type === 'sell') {
        acc.totalSold += amt;
        acc.sellCount += 1;
      } else if (txn.transaction_type === 'dividend') {
        acc.totalDividend += amt;
      } else if (txn.transaction_type === 'charges') {
        acc.totalCharges += amt;
      }
      return acc;
    },
    { totalBought: 0, totalSold: 0, totalDividend: 0, totalCharges: 0, buyCount: 0, sellCount: 0 }
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="txn-back-btn">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
          {name && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {name}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.summaryScroll}
        contentContainerStyle={{ paddingRight: 20 }}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-down-circle" size={20} color="#00E676" />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Bought</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]} testID="summary-total-bought">
            {formatINR(summary.totalBought)}
          </Text>
          <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
            {summary.buyCount} transactions
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-up-circle" size={20} color="#FF5252" />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Sold</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {formatINR(summary.totalSold)}
          </Text>
          <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
            {summary.sellCount} transactions
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="cash" size={20} color="#448AFF" />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Dividends</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {formatINR(summary.totalDividend)}
          </Text>
          <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>Received</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="receipt" size={20} color="#FF9100" />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Charges</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {formatINR(summary.totalCharges)}
          </Text>
          <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>Fees Paid</Text>
        </View>
      </ScrollView>

      <View style={[styles.filterTabs, { borderBottomColor: colors.border }]}>
        {(['all', 'buy', 'sell', 'dividends'] as FilterType[]).map((f) => {
          const counts: Record<FilterType, number> = {
            all: transactions.length,
            buy: transactions.filter((t) => t.transaction_type === 'buy').length,
            sell: transactions.filter((t) => t.transaction_type === 'sell').length,
            dividends: transactions.filter(
              (t) => t.transaction_type === 'dividend' || t.transaction_type === 'charges'
            ).length,
          };
          const labels: Record<FilterType, string> = {
            all: 'All',
            buy: 'Buy',
            sell: 'Sell',
            dividends: 'Dividends',
          };
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterTab,
                activeFilter === f && [styles.activeFilterTab, { borderBottomColor: colors.primary }],
              ]}
              onPress={() => setActiveFilter(f)}
              testID={`filter-${f}`}
            >
              <Text style={[styles.filterTabText, { color: activeFilter === f ? colors.primary : colors.textSecondary }]}>
                {labels[f]} ({counts[f]})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.txnList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {filteredTransactions.map((txn) => {
          const iconData = getTransactionIcon(txn.transaction_type);
          const badgeStyle = getTransactionBadgeStyle(txn.transaction_type);
          const amt = txn.amount || txn.total_amount || 0;

          return (
            <View
              key={txn.transaction_id}
              style={[styles.txnCard, { backgroundColor: colors.card }]}
              testID={`txn-card-${txn.transaction_id}`}
            >
              <View style={styles.txnHeader}>
                <View style={styles.txnLeft}>
                  <View style={[styles.txnIconContainer, { backgroundColor: iconData.color + '20' }]}>
                    <Ionicons name={iconData.icon as any} size={22} color={iconData.color} />
                  </View>
                  <View>
                    <View style={styles.txnTitleRow}>
                      <View style={[styles.txnBadge, { backgroundColor: badgeStyle.backgroundColor }]}>
                        <Text style={[styles.txnBadgeText, { color: badgeStyle.textColor }]}>
                          {(txn.transaction_type || '').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.txnDate, { color: colors.textSecondary }]}>
                      {formatDate(txn.transaction_date)}
                    </Text>
                  </View>
                </View>

                <View style={styles.txnRight}>
                  <Text
                    style={[
                      styles.txnAmount,
                      {
                        color:
                          txn.transaction_type === 'buy' || txn.transaction_type === 'charges'
                            ? '#FF5252'
                            : txn.transaction_type === 'sell' || txn.transaction_type === 'dividend'
                            ? '#00E676'
                            : colors.text,
                      },
                    ]}
                  >
                    {txn.transaction_type === 'buy' || txn.transaction_type === 'charges' ? '-' : '+'}
                    {formatINR(amt)}
                  </Text>
                </View>
              </View>

              <View style={styles.txnDetails}>
                {(txn.quantity || 0) > 0 && (
                  <View style={styles.txnDetailRow}>
                    <Text style={[styles.txnDetailLabel, { color: colors.textSecondary }]}>Quantity</Text>
                    <Text style={[styles.txnDetailValue, { color: colors.text }]}>{txn.quantity}</Text>
                  </View>
                )}
                {(txn.price_per_unit || 0) > 0 && (
                  <View style={styles.txnDetailRow}>
                    <Text style={[styles.txnDetailLabel, { color: colors.textSecondary }]}>Price per unit</Text>
                    <Text style={[styles.txnDetailValue, { color: colors.text }]}>
                      ₹{Number(txn.price_per_unit).toFixed(2)}
                    </Text>
                  </View>
                )}
                {txn.notes && (
                  <View style={[styles.txnNotes, { backgroundColor: colors.background }]}>
                    <Text style={[styles.txnNotesText, { color: colors.textSecondary }]}>
                      {txn.notes}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {filteredTransactions.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No transactions found
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Transactions will appear here once you buy or sell.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  summaryScroll: { paddingLeft: 20, marginBottom: 20, maxHeight: 110 },
  summaryCard: {
    width: 140,
    padding: 14,
    borderRadius: 12,
    marginRight: 12,
    gap: 6,
  },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 16, fontWeight: 'bold' },
  summaryCount: { fontSize: 10 },

  filterTabs: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, marginBottom: 16 },
  filterTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeFilterTab: { borderBottomWidth: 2 },
  filterTabText: { fontSize: 13, fontWeight: '600' },

  txnList: { paddingHorizontal: 20, paddingBottom: 40 },
  txnCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  txnHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  txnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  txnIconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  txnTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  txnBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  txnBadgeText: { fontSize: 11, fontWeight: '700' },
  txnDate: { fontSize: 12 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: 18, fontWeight: 'bold' },
  txnDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.08)',
    paddingTop: 12,
    gap: 8,
  },
  txnDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  txnDetailLabel: { fontSize: 12 },
  txnDetailValue: { fontSize: 12, fontWeight: '600' },
  txnNotes: { padding: 10, borderRadius: 8, marginTop: 4 },
  txnNotesText: { fontSize: 12, fontStyle: 'italic' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
});
