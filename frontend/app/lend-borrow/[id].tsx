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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DUMMY_LEND_BORROW } from './_data';

export default function LendBorrowDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'summary' | 'history' | 'reminders'>('summary');

  const entry = DUMMY_LEND_BORROW.find(e => e.id === id);

  if (!entry) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>Entry not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeColor = entry.type === 'lent' ? '#22C55E' : '#EF4444';
  const statusColor = entry.status === 'completed' ? '#22C55E' : entry.status === 'partial' ? '#F59E0B' : '#EF4444';
  const receivedAmount = entry.amount - entry.remainingAmount;
  const pendingAmount = entry.remainingAmount;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <LinearGradient
          colors={entry.type === 'lent' ? ['#22C55E', '#16A34A'] : ['#EF4444', '#DC2626']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerContent}>
            <Text style={styles.personName}>{entry.personName}</Text>
            <Text style={styles.phoneNumber}>{entry.phoneNumber}</Text>
            <Text style={styles.entryType}>
              {entry.type === 'lent' ? 'You Lent' : 'You Borrowed'} ₹{entry.amount.toLocaleString()}
            </Text>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['summary', 'history', 'reminders'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomWidth: 3, borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
                {tab === 'summary' ? 'Summary' : tab === 'history' ? 'History' : 'Reminders'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <View style={styles.tabContent}>
            {/* Status Card */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Text style={[styles.statusLabel, { color: statusColor }]}>
                  {entry.status === 'completed' ? 'Settled' : entry.status === 'partial' ? 'Partial Payment' : 'Pending'}
                </Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Payment Status</Text>
              <View style={styles.statusGrid}>
                <View>
                  <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Principal</Text>
                  <Text style={[styles.gridValue, { color: colors.text }]}>₹{entry.principal.toLocaleString()}</Text>
                </View>
                <View>
                  <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Received</Text>
                  <Text style={[styles.gridValue, { color: '#22C55E' }]}>₹{receivedAmount.toLocaleString()}</Text>
                </View>
                <View>
                  <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Remaining</Text>
                  <Text style={[styles.gridValue, { color: '#EF4444' }]}>₹{pendingAmount.toLocaleString()}</Text>
                </View>
                {entry.interestRate && (
                  <View>
                    <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Interest</Text>
                    <Text style={[styles.gridValue, { color: colors.text }]}>{entry.interestRate}% p.a.</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Details Card */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Details</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Start Date</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{entry.startDate}</Text>
              </View>
              {entry.dueDate && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Due Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{entry.dueDate}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reason</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{entry.reason}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            {entry.paymentHistory.length > 0 ? (
              <View>
                {entry.paymentHistory.map((payment, idx) => (
                  <View key={idx} style={[styles.historyItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <View>
                      <Text style={[styles.historyDate, { color: colors.text }]}>{payment.date}</Text>
                      {payment.notes && (
                        <Text style={[styles.historyNote, { color: colors.textSecondary }]}>{payment.notes}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.historyAmount, { color: '#22C55E' }]}>₹{payment.amount.toLocaleString()}</Text>
                      <View style={[styles.paymentStatus, { backgroundColor: '#22C55E20' }]}>
                        <Text style={[styles.paymentStatusText, { color: '#22C55E' }]}>Completed</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <Ionicons name="receipt-outline" size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No payment history</Text>
              </View>
            )}
          </View>
        )}

        {/* Reminders Tab */}
        {activeTab === 'reminders' && (
          <View style={styles.tabContent}>
            {entry.reminders.length > 0 ? (
              <View>
                {entry.reminders.map((reminder, idx) => (
                  <View key={idx} style={[styles.reminderItem, { backgroundColor: colors.card }]}>
                    <View style={[styles.reminderIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reminderType, { color: colors.text }]}>
                        {reminder.type === 'payment' ? 'Payment Reminder' : 'Custom Reminder'}
                      </Text>
                      <Text style={[styles.reminderDate, { color: colors.textSecondary }]}>
                        {reminder.nextDueDate} • {reminder.frequency}
                      </Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: reminder.isActive ? '#22C55E' : colors.textSecondary }]} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <Ionicons name="alarm-outline" size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No reminders set</Text>
              </View>
            )}
          </View>
        )}

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

  headerCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  headerContent: { gap: 4 },
  personName: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  phoneNumber: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  entryType: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginTop: 8 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.1)', marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },

  tabContent: { marginBottom: 20 },

  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  statusLabel: { fontSize: 11, fontWeight: '600' },

  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  gridValue: { fontSize: 15, fontWeight: '700' },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.1)' },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '600' },

  actionButtons: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  actionText: { fontSize: 14, fontWeight: '600' },

  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16 },

  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, borderBottomWidth: 0 },
  historyDate: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  historyNote: { fontSize: 11 },
  historyAmount: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  paymentStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  paymentStatusText: { fontSize: 10, fontWeight: '600' },

  reminderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, gap: 12 },
  reminderIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reminderType: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  reminderDate: { fontSize: 11 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  emptyState: { borderRadius: 14, paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, marginTop: 8 },
});
