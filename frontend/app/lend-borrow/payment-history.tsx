import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { DUMMY_LEND_BORROW } from './_data';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lent' | 'borrowed'>('all');

  const filteredEntries = DUMMY_LEND_BORROW
    .filter(e => {
      const matchesType = filterType === 'all' || e.type === filterType;
      const matchesSearch = e.personName.toLowerCase().includes(searchText.toLowerCase());
      return matchesType && matchesSearch;
    })
    .sort((a, b) => {
      const aLatest = a.paymentHistory[a.paymentHistory.length - 1]?.date || a.startDate;
      const bLatest = b.paymentHistory[b.paymentHistory.length - 1]?.date || b.startDate;
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

  const totalTransactions = DUMMY_LEND_BORROW.reduce((sum, e) => sum + e.paymentHistory.length, 0);
  const totalAmount = DUMMY_LEND_BORROW.reduce((sum, e) => sum + e.paymentHistory.reduce((s, p) => s + p.amount, 0), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Payment History</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIcon, { backgroundColor: '#0EA5E920' }]}>
              <Ionicons name="receipt-outline" size={18} color="#0EA5E9" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Transactions</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{totalTransactions}</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIcon, { backgroundColor: '#22C55E20' }]}>
              <Ionicons name="cash-outline" size={18} color="#22C55E" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Amount</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>₹{(totalAmount / 1000).toFixed(0)}K</Text>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name"
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'lent', 'borrowed'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.tab, filterType === type && { backgroundColor: colors.primary }]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[styles.tabText, { color: filterType === type ? '#FFF' : colors.textSecondary }]}>
                {type === 'all' ? 'All' : type === 'lent' ? 'Lent' : 'Borrowed'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment History List */}
        <View>
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <View key={entry.id}>
                <View style={styles.entrySection}>
                  <View style={styles.entryHeader}>
                    <View style={[styles.entryIcon, { backgroundColor: (entry.type === 'lent' ? '#22C55E' : '#EF4444') + '20' }]}>
                      <Ionicons
                        name={entry.type === 'lent' ? 'arrow-redo-outline' : 'arrow-undo-outline'}
                        size={18}
                        color={entry.type === 'lent' ? '#22C55E' : '#EF4444'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entryName, { color: colors.text }]}>{entry.personName}</Text>
                      <Text style={[styles.entryPhone, { color: colors.textSecondary }]}>{entry.phoneNumber}</Text>
                    </View>
                  </View>

                  {entry.paymentHistory.length > 0 ? (
                    <View style={styles.paymentsContainer}>
                      {entry.paymentHistory.map((payment, idx) => (
                        <View
                          key={idx}
                          style={[styles.paymentItem, { backgroundColor: colors.background, borderLeftColor: entry.type === 'lent' ? '#22C55E' : '#EF4444' }]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.paymentDate, { color: colors.text }]}>{payment.date}</Text>
                            {payment.notes && (
                              <Text style={[styles.paymentNote, { color: colors.textSecondary }]}>{payment.notes}</Text>
                            )}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.paymentAmount, { color: entry.type === 'lent' ? '#22C55E' : '#EF4444' }]}>
                              {entry.type === 'lent' ? '+' : '-'}₹{payment.amount.toLocaleString()}
                            </Text>
                            <View style={[styles.paymentStatus, { backgroundColor: '#22C55E20' }]}>
                              <Text style={[styles.paymentStatusText, { color: '#22C55E' }]}>Completed</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={[styles.noPayments, { backgroundColor: colors.background }]}>
                      <Text style={[styles.noPaymentsText, { color: colors.textSecondary }]}>No payments yet</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Ionicons name="receipt-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No payment history found</Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  summaryLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700' },

  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },

  filterTabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(128,128,128,0.1)' },
  tabText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  entrySection: { marginBottom: 14 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  entryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  entryName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  entryPhone: { fontSize: 11 },

  paymentsContainer: { gap: 8 },
  paymentItem: { borderRadius: 12, padding: 12, borderLeftWidth: 4 },
  paymentDate: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  paymentNote: { fontSize: 11 },
  paymentAmount: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  paymentStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  paymentStatusText: { fontSize: 10, fontWeight: '600' },

  noPayments: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  noPaymentsText: { fontSize: 12 },

  emptyState: { borderRadius: 14, paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, marginTop: 8 },
});
