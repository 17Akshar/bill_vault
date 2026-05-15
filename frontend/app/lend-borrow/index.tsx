import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DUMMY_LEND_BORROW, LendBorrowEntry } from './_data';

export default function LendBorrowScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [filterType, setFilterType] = useState<'all' | 'lent' | 'borrowed'>('all');
  const [showMenu, setShowMenu] = useState(false);

  const filteredEntries = filterType === 'all'
    ? DUMMY_LEND_BORROW
    : DUMMY_LEND_BORROW.filter(e => e.type === filterType);

  const totalLent = DUMMY_LEND_BORROW
    .filter(e => e.type === 'lent')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalBorrowed = DUMMY_LEND_BORROW
    .filter(e => e.type === 'borrowed')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOutstanding = DUMMY_LEND_BORROW
    .reduce((sum, e) => sum + e.remainingAmount, 0);

  const completedCount = DUMMY_LEND_BORROW
    .filter(e => e.status === 'completed').length;

  const menuItems = [
    { label: 'New Lend Entry', icon: 'add-circle-outline', action: () => router.push('/lend-borrow/add-entry?type=lent') },
    { label: 'New Borrow Entry', icon: 'add-circle-outline', action: () => router.push('/lend-borrow/add-entry?type=borrowed') },
    { label: 'View Analytics', icon: 'analytics-outline', action: () => router.push('/lend-borrow/analytics') },
    { label: 'Payment Reminders', icon: 'notifications-outline', action: () => router.push('/lend-borrow/reminder') },
    { label: 'View All Payments', icon: 'list-outline', action: () => router.push('/lend-borrow/payment-history') },
  ];

  const renderEntryCard = (entry: LendBorrowEntry) => {
    const typeColor = entry.type === 'lent' ? '#22C55E' : '#EF4444';
    const typeLabel = entry.type === 'lent' ? 'Lent' : 'Borrowed';
    const statusColor = entry.status === 'completed' ? '#22C55E' : entry.status === 'partial' ? '#F59E0B' : '#EF4444';

    return (
      <TouchableOpacity
        key={entry.id}
        style={[styles.entryCard, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/lend-borrow/${entry.id}`)}
      >
        <View style={styles.cardTop}>
          <View style={[styles.typeIcon, { backgroundColor: typeColor + '20' }]}>
            <Ionicons name={entry.type === 'lent' ? 'arrow-redo-outline' : 'arrow-undo-outline'} size={18} color={typeColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.personName, { color: colors.text }]}>{entry.personName}</Text>
            <Text style={[styles.reason, { color: colors.textSecondary }]}>{entry.reason}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '15' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount</Text>
            <Text style={[styles.amount, { color: colors.text }]}>₹{entry.amount.toLocaleString()}</Text>
          </View>
          <View>
            <Text style={[styles.remainingLabel, { color: colors.textSecondary }]}>Remaining</Text>
            <Text style={[styles.remaining, { color: colors.text }]}>₹{entry.remainingAmount.toLocaleString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {entry.status === 'completed' ? 'Settled' : entry.status === 'partial' ? 'Partial' : 'Pending'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Lend & Borrowed</Text>
        <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {showMenu && (
        <View style={[styles.menu, { backgroundColor: colors.card }]}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.menuItem}
              onPress={() => {
                item.action();
                setShowMenu(false);
              }}
            >
              <Ionicons name={item.icon as any} size={18} color={colors.primary} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#22C55E20' }]}>
              <Ionicons name="arrow-redo-outline" size={20} color="#22C55E" />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Total Lent</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>₹{(totalLent / 1000).toFixed(0)}K</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="arrow-undo-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Total Borrowed</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>₹{(totalBorrowed / 1000).toFixed(0)}K</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="hourglass-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Outstanding</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>₹{(totalOutstanding / 1000).toFixed(0)}K</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#0EA5E920' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#0EA5E9" />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Settled</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{completedCount}</Text>
          </View>
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

        {/* Entries List */}
        <View style={styles.entriesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {filterType === 'all' ? 'All Entries' : filterType === 'lent' ? 'Lent Entries' : 'Borrowed Entries'}
          </Text>
          {filteredEntries.length > 0 ? (
            filteredEntries.map(entry => renderEntryCard(entry))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Ionicons name="list-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No entries found</Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowMenu(!showMenu)}
      >
        <Ionicons name={showMenu ? 'close' : 'add'} size={24} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 22, fontWeight: '700' },
  menuBtn: { padding: 4 },

  menu: { marginHorizontal: 20, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  menuLabel: { fontSize: 14, fontWeight: '500' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 },

  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  kpiIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  kpiValue: { fontSize: 16, fontWeight: '700' },

  filterTabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(128,128,128,0.1)' },
  tabText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  entriesSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  entryCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  typeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  personName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  reason: { fontSize: 12 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 11, fontWeight: '600' },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  amount: { fontSize: 14, fontWeight: '700' },
  remainingLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  remaining: { fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },

  emptyState: { borderRadius: 14, paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, marginTop: 8 },

  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
