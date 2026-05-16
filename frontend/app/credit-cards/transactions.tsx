import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR, formatINRCompact } from '../../utils/formatINR';
import { DUMMY_CARDS, DUMMY_TRANSACTIONS, type CCTransaction } from './_data';

const { width: SW } = Dimensions.get('window');

type Period = 'cycle' | 'prev' | 'all';

export default function CardTransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();

  const [selectedCard, setSelectedCard] = useState(params.id ?? DUMMY_CARDS[0].card_id);
  const [period, setPeriod] = useState<Period>('cycle');
  const [showCardPicker, setShowCardPicker] = useState(false);

  const card = DUMMY_CARDS.find((c) => c.card_id === selectedCard) ?? DUMMY_CARDS[0];
  const txns: CCTransaction[] = DUMMY_TRANSACTIONS.filter((t) => t.card_id === selectedCard);
  const totalSpent = txns.filter((t) => t.type === 'purchase').reduce((s, t) => s + t.amount, 0);
  const util = card.credit_limit > 0 ? (card.current_outstanding / card.credit_limit) * 100 : 0;
  const utilColor = util > 80 ? '#FF4D67' : util > 50 ? '#FFB300' : '#00C48C';

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'cycle', label: 'This Cycle' },
    { key: 'prev', label: 'Previous Cycle' },
    { key: 'all', label: 'All' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Transactions</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push({ pathname: '/credit-cards/add-transaction', params: { id: selectedCard } } as any)}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Card Selector */}
      <TouchableOpacity
        style={[styles.cardSelector, { backgroundColor: colors.card }]}
        onPress={() => setShowCardPicker(!showCardPicker)}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardSelectorBank, { color: colors.textSecondary }]}>{card.bank_name}</Text>
          <Text style={[styles.cardSelectorName, { color: colors.text }]}>
            {card.name}  •••• {card.card_number_last4}
          </Text>
        </View>
        <Ionicons name={showCardPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {showCardPicker && (
        <View style={[styles.cardPickerMenu, { backgroundColor: colors.card }]}>
          {DUMMY_CARDS.map((c) => (
            <TouchableOpacity
              key={c.card_id}
              style={[styles.pickerItem, c.card_id === selectedCard && { backgroundColor: colors.primary + '18' }]}
              onPress={() => { setSelectedCard(c.card_id); setShowCardPicker(false); }}
            >
              <View style={[styles.pickerDot, { backgroundColor: c.color }]} />
              <Text style={[styles.pickerText, { color: colors.text }]}>
                {c.bank_name} {c.name} •••• {c.card_number_last4}
              </Text>
              {c.card_id === selectedCard && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Period Tabs */}
      <View style={styles.tabs}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.tab, period === p.key && { backgroundColor: colors.primary }]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.tabText, { color: period === p.key ? '#FFF' : colors.textSecondary }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Bar */}
      <View style={[styles.summaryBar, { backgroundColor: colors.card }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Total Spent</Text>
          <Text style={[styles.sumValue, { color: '#FF4D67' }]}>{formatINR(totalSpent)}</Text>
        </View>
        <View style={[styles.sumDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Card Limit</Text>
          <Text style={[styles.sumValue, { color: colors.text }]}>{formatINRCompact(card.credit_limit)}</Text>
        </View>
        <View style={[styles.sumDivider, { backgroundColor: colors.border }]} />
        <View style={[styles.summaryItem, { alignItems: 'flex-end' }]}>
          <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Utilization</Text>
          <Text style={[styles.sumValue, { color: utilColor }]}>{util.toFixed(0)}%</Text>
        </View>
      </View>
      {/* Utilization bar under summary */}
      <View style={[styles.utilTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.utilFill, { width: `${Math.min(util, 100)}%` as any, backgroundColor: utilColor }]} />
      </View>

      {/* Transactions List */}
      <FlatList
        data={txns}
        keyExtractor={(item) => item.txn_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.listHeader, { color: colors.textSecondary }]}>
            Transactions  •  {txns.length} items
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.txnItem, { backgroundColor: colors.card }]}>
            <View style={[styles.txnIcon, { backgroundColor: item.category_color + '22' }]}>
              <Ionicons name={item.category_icon as any} size={20} color={item.category_color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.txnMerchant, { color: colors.text }]}>{item.merchant_name}</Text>
              <Text style={[styles.txnMeta, { color: colors.textSecondary }]}>
                {item.date_label}  •  {item.category}
              </Text>
            </View>
            <Text style={[styles.txnAmount, { color: item.type === 'payment' ? '#00C48C' : colors.text }]}>
              {item.type === 'payment' ? '+' : '-'}{formatINR(item.amount)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={56} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push({ pathname: '/credit-cards/add-transaction', params: { id: selectedCard } } as any)}
      >
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  // Card selector
  cardSelector: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20,
    borderRadius: 14, padding: 14, marginBottom: 4,
  },
  cardSelectorBank: { fontSize: 11, marginBottom: 2 },
  cardSelectorName: { fontSize: 15, fontWeight: '600' },
  cardPickerMenu: {
    marginHorizontal: 20, borderRadius: 14, marginBottom: 8, overflow: 'hidden',
  },
  pickerItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  pickerDot: { width: 10, height: 10, borderRadius: 5 },
  pickerText: { flex: 1, fontSize: 14, fontWeight: '500' },

  // Tabs
  tabs: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginVertical: 12,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabText: { fontSize: 13, fontWeight: '600' },

  // Summary bar
  summaryBar: {
    flexDirection: 'row', marginHorizontal: 20, borderRadius: 14, padding: 14,
    marginBottom: 0,
  },
  summaryItem: { flex: 1 },
  sumLabel: { fontSize: 10, marginBottom: 4 },
  sumValue: { fontSize: 15, fontWeight: '700' },
  sumDivider: { width: 1, marginHorizontal: 10 },
  utilTrack: {
    marginHorizontal: 20, height: 5, borderRadius: 0, overflow: 'hidden',
    marginBottom: 12, borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
  },
  utilFill: { height: '100%' },

  // List
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  listHeader: { fontSize: 12, fontWeight: '600', marginBottom: 10, marginTop: 4 },
  txnItem: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14,
    marginBottom: 8, gap: 12,
  },
  txnIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  txnMerchant: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  txnMeta: { fontSize: 12 },
  txnAmount: { fontSize: 15, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },

  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
});
