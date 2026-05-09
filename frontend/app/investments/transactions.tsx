import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';

// Dummy transaction data
const DUMMY_TRANSACTIONS = [
  // Buy Transactions
  {
    id: '1',
    type: 'buy',
    date: '10 Jan 2023',
    quantity: 50,
    price: 2120.00,
    charges: 40.00,
    totalAmount: 106040.00,
    notes: 'Initial investment',
  },
  {
    id: '2',
    type: 'buy',
    date: '15 Mar 2023',
    quantity: 30,
    price: 2700.00,
    charges: 30.00,
    totalAmount: 81030.00,
    notes: 'Added more shares',
  },
  {
    id: '3',
    type: 'buy',
    date: '10 Aug 2023',
    quantity: 32,
    price: 2850.00,
    charges: 35.00,
    totalAmount: 91235.00,
    notes: 'Market dip purchase',
  },

  // Sell Transactions
  {
    id: '4',
    type: 'sell',
    date: '05 Feb 2024',
    quantity: 40,
    price: 2920.00,
    charges: 25.00,
    totalAmount: 116775.00,
    notes: 'Partial profit booking',
  },
  {
    id: '5',
    type: 'sell',
    date: '20 Apr 2024',
    quantity: 10,
    price: 2960.00,
    charges: 15.00,
    totalAmount: 29585.00,
    notes: 'Emergency funds',
  },

  // Dividend Transactions
  {
    id: '6',
    type: 'dividend',
    date: '30 May 2024',
    quantity: 112,
    price: 18.00,
    charges: 0,
    totalAmount: 2016.00,
    notes: 'Dividend @ ₹18 per share',
  },
  {
    id: '7',
    type: 'dividend',
    date: '30 Nov 2023',
    quantity: 112,
    price: 15.00,
    charges: 0,
    totalAmount: 1680.00,
    notes: 'Interim dividend',
  },

  // Charges
  {
    id: '8',
    type: 'charges',
    date: '31 Mar 2024',
    quantity: 0,
    price: 0,
    charges: 250.00,
    totalAmount: 250.00,
    notes: 'Annual maintenance charges',
  },
];

type FilterType = 'all' | 'buy' | 'sell' | 'dividends';

export default function InvestmentTransactionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id, name } = useLocalSearchParams();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredTransactions = DUMMY_TRANSACTIONS.filter((txn) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'dividends') return txn.type === 'dividend' || txn.type === 'charges';
    return txn.type === activeFilter;
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

  // Calculate summary
  const summary = DUMMY_TRANSACTIONS.reduce(
    (acc, txn) => {
      if (txn.type === 'buy') {
        acc.totalBought += txn.totalAmount;
        acc.buyCount += 1;
      } else if (txn.type === 'sell') {
        acc.totalSold += txn.totalAmount;
        acc.sellCount += 1;
      } else if (txn.type === 'dividend') {
        acc.totalDividend += txn.totalAmount;
      } else if (txn.type === 'charges') {
        acc.totalCharges += txn.totalAmount;
      }
      return acc;
    },
    { totalBought: 0, totalSold: 0, totalDividend: 0, totalCharges: 0, buyCount: 0, sellCount: 0 }
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {name || 'Investment History'}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="download-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-down-circle" size={20} color="#00E676" />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Bought</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
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

      {/* Filter Tabs */}
      <View style={[styles.filterTabs, { borderBottomColor: colors.border }]}>
        {[
          { key: 'all', label: 'All', count: DUMMY_TRANSACTIONS.length },
          {
            key: 'buy',
            label: 'Buy',
            count: DUMMY_TRANSACTIONS.filter((t) => t.type === 'buy').length,
          },
          {
            key: 'sell',
            label: 'Sell',
            count: DUMMY_TRANSACTIONS.filter((t) => t.type === 'sell').length,
          },
          {
            key: 'dividends',
            label: 'Dividends',
            count: DUMMY_TRANSACTIONS.filter((t) => t.type === 'dividend' || t.type === 'charges')
              .length,
          },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              activeFilter === filter.key && [
                styles.activeFilterTab,
                { borderBottomColor: colors.primary },
              ],
            ]}
            onPress={() => setActiveFilter(filter.key as FilterType)}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: activeFilter === filter.key ? colors.primary : colors.textSecondary },
              ]}
            >
              {filter.label} ({filter.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.txnList}>
        {filteredTransactions.map((txn) => {
          const iconData = getTransactionIcon(txn.type);
          const badgeStyle = getTransactionBadgeStyle(txn.type);

          return (
            <TouchableOpacity
              key={txn.id}
              style={[styles.txnCard, { backgroundColor: colors.card }]}
              activeOpacity={0.7}
            >
              <View style={styles.txnHeader}>
                <View style={styles.txnLeft}>
                  <View
                    style={[
                      styles.txnIconContainer,
                      { backgroundColor: iconData.color + '20' },
                    ]}
                  >
                    <Ionicons name={iconData.icon as any} size={22} color={iconData.color} />
                  </View>
                  <View>
                    <View style={styles.txnTitleRow}>
                      <View
                        style={[styles.txnBadge, { backgroundColor: badgeStyle.backgroundColor }]}
                      >
                        <Text
                          style={[
                            styles.txnBadgeText,
                            { color: badgeStyle.textColor },
                          ]}
                        >
                          {txn.type.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.txnDate, { color: colors.textSecondary }]}>
                      {txn.date}
                    </Text>
                  </View>
                </View>

                <View style={styles.txnRight}>
                  <Text
                    style={[
                      styles.txnAmount,
                      {
                        color:
                          txn.type === 'buy' || txn.type === 'charges'
                            ? '#FF5252'
                            : txn.type === 'sell'
                            ? '#00E676'
                            : colors.text,
                      },
                    ]}
                  >
                    {txn.type === 'buy' || txn.type === 'charges' ? '-' : '+'}
                    {formatINR(txn.totalAmount)}
                  </Text>
                </View>
              </View>

              <View style={styles.txnDetails}>
                {txn.quantity > 0 && (
                  <View style={styles.txnDetailRow}>
                    <Text style={[styles.txnDetailLabel, { color: colors.textSecondary }]}>
                      Quantity
                    </Text>
                    <Text style={[styles.txnDetailValue, { color: colors.text }]}>
                      {txn.quantity} shares
                    </Text>
                  </View>
                )}
                {txn.price > 0 && (
                  <View style={styles.txnDetailRow}>
                    <Text style={[styles.txnDetailLabel, { color: colors.textSecondary }]}>
                      Price per share
                    </Text>
                    <Text style={[styles.txnDetailValue, { color: colors.text }]}>
                      ₹{txn.price.toFixed(2)}
                    </Text>
                  </View>
                )}
                {txn.charges > 0 && (
                  <View style={styles.txnDetailRow}>
                    <Text style={[styles.txnDetailLabel, { color: colors.textSecondary }]}>
                      Charges & Fees
                    </Text>
                    <Text style={[styles.txnDetailValue, { color: '#FF9100' }]}>
                      ₹{txn.charges.toFixed(2)}
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
            </TouchableOpacity>
          );
        })}

        {filteredTransactions.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No transactions found
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Transactions will appear here once you buy or sell shares
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Transaction Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  subtitle: { fontSize: 13 },
  iconBtn: { padding: 4 },

  // Summary Cards
  summaryScroll: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
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

  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeFilterTab: {
    borderBottomWidth: 2,
  },
  filterTabText: { fontSize: 13, fontWeight: '600' },

  // Transactions List
  txnList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  txnCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  txnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  txnIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  txnBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  txnBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  txnDate: { fontSize: 12 },
  txnRight: {
    alignItems: 'flex-end',
  },
  txnAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  txnDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.08)',
    paddingTop: 12,
    gap: 8,
  },
  txnDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  txnDetailLabel: { fontSize: 12 },
  txnDetailValue: { fontSize: 12, fontWeight: '600' },
  txnNotes: {
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  txnNotesText: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
