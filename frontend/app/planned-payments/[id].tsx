import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DUMMY_PLANNED_PAYMENTS } from './_data';

const FREQ_LABELS: Record<string, string> = {
  one_time: 'One Time', daily: 'Daily', weekly: 'Weekly',
  monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
};

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer', upi: 'UPI', auto_debit: 'Auto Debit', cash: 'Cash', cheque: 'Cheque',
};

export default function PlannedPaymentDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');

  const payment = DUMMY_PLANNED_PAYMENTS.find(p => p.id === id);

  if (!payment) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>Payment not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const gradColors: [string, string] = payment.type === 'income'
    ? ['#22C55E', '#16A34A']
    : payment.status === 'missed'
      ? ['#EF4444', '#DC2626']
      : ['#6366F1', '#8B5CF6'];

  const statusMeta = {
    upcoming: { color: '#0EA5E9', label: 'Upcoming', icon: 'time-outline' as const },
    completed: { color: '#22C55E', label: 'Completed', icon: 'checkmark-circle-outline' as const },
    missed: { color: '#EF4444', label: 'Missed', icon: 'alert-circle-outline' as const },
    paused: { color: '#F59E0B', label: 'Paused', icon: 'pause-circle-outline' as const },
  }[payment.status];

  const handleMarkPaid = () =>
    Alert.alert('Mark as Paid', `Mark "${payment.title}" as paid for ₹${payment.amount.toLocaleString()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Paid', onPress: () => Alert.alert('Success', 'Payment marked as paid!') },
    ]);

  const handleDelete = () =>
    Alert.alert('Delete', `Delete "${payment.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => router.back() },
    ]);

  const handlePause = () =>
    Alert.alert(
      payment.status === 'paused' ? 'Resume Payment' : 'Pause Payment',
      payment.status === 'paused'
        ? 'Resume this planned payment?'
        : 'Pause this planned payment? You won\'t receive reminders while paused.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: payment.status === 'paused' ? 'Resume' : 'Pause', onPress: () => {} },
      ],
    );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Details</Text>
        <TouchableOpacity onPress={() => router.push(`/planned-payments/add?id=${payment.id}` as any)}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero Card */}
        <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Ionicons name={payment.categoryIcon as any} size={26} color="#FFF" />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name={statusMeta.icon} size={12} color="#FFF" />
              <Text style={styles.statusLabel}>{statusMeta.label}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{payment.title}</Text>
          <Text style={styles.heroAmount}>
            {payment.type === 'income' ? '+' : '-'}₹{payment.amount.toLocaleString()}
          </Text>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>Next: {payment.nextDueDate}</Text>
            <Text style={styles.heroMetaText}>· {FREQ_LABELS[payment.frequency]}</Text>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {(['overview', 'timeline'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomWidth: 3, borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
                {tab === 'overview' ? 'Overview' : 'Timeline'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View>
            {/* Details */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {[
                { icon: 'business-outline', label: 'Account', value: payment.accountLabel },
                { icon: payment.categoryIcon, label: 'Category', value: payment.categoryLabel },
                { icon: 'person-outline', label: payment.type === 'income' ? 'Payer' : 'Payee', value: payment.payee },
                { icon: 'card-outline', label: 'Payment Type', value: METHOD_LABELS[payment.paymentMethod] },
                { icon: 'repeat-outline', label: 'Frequency', value: FREQ_LABELS[payment.frequency] },
                { icon: 'calendar-outline', label: 'Next Due', value: payment.nextDueDate },
                { icon: 'flag-outline', label: 'Start Date', value: payment.startDate },
              ].map((row, idx, arr) => (
                <View key={idx} style={[styles.infoRow, { borderBottomColor: colors.border, borderBottomWidth: idx < arr.length - 1 ? 1 : 0 }]}>
                  <Ionicons name={row.icon as any} size={18} color={payment.categoryColor} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Reminder & Notes */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={[styles.infoRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <Ionicons name="notifications-outline" size={18} color={payment.autoReminder ? colors.primary : colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Auto Reminder</Text>
                <Text style={[styles.infoValue, { color: payment.autoReminder ? colors.primary : colors.textSecondary }]}>
                  {payment.autoReminder ? `${payment.reminderDaysBefore} day${payment.reminderDaysBefore !== 1 ? 's' : ''} before` : 'Disabled'}
                </Text>
              </View>
              {payment.notes ? (
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Notes</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{payment.notes}</Text>
                </View>
              ) : null}
              {payment.labels.length > 0 && (
                <View style={[styles.labelsRow, { borderTopColor: colors.border }]}>
                  {payment.labels.map(l => (
                    <View key={l} style={[styles.labelChip, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.labelChipText, { color: colors.primary }]}>{l}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22C55E' }]} onPress={handleMarkPaid}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Mark as Paid</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]} onPress={handlePause}>
                <Ionicons name={payment.status === 'paused' ? 'play-circle-outline' : 'pause-circle-outline'} size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>{payment.status === 'paused' ? 'Resume' : 'Pause'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.deleteBtn, { borderColor: '#EF4444' }]} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.deleteBtnText, { color: '#EF4444' }]}>Delete Payment</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {payment.status === 'upcoming' && (
              <View style={[styles.timelineItem, { borderLeftColor: '#0EA5E9' }]}>
                <View style={[styles.timelineDot, { backgroundColor: '#0EA5E9' }]} />
                <View>
                  <Text style={[styles.timelineDate, { color: '#0EA5E9' }]}>{payment.nextDueDate} — Upcoming</Text>
                  <Text style={[styles.timelineAmount, { color: colors.text }]}>₹{payment.amount.toLocaleString()}</Text>
                  <Text style={[styles.timelineStatus, { color: colors.textSecondary }]}>Scheduled</Text>
                </View>
              </View>
            )}

            {payment.paymentHistory.length > 0 ? (
              payment.paymentHistory.map((record) => {
                const c = record.status === 'paid' ? '#22C55E' : record.status === 'missed' ? '#EF4444' : '#F59E0B';
                return (
                  <View key={record.id} style={[styles.timelineItem, { borderLeftColor: c }]}>
                    <View style={[styles.timelineDot, { backgroundColor: c }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timelineDate, { color: c }]}>
                        {record.date} — {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Text>
                      <Text style={[styles.timelineAmount, { color: colors.text }]}>₹{record.amount.toLocaleString()}</Text>
                      {record.notes && (
                        <Text style={[styles.timelineStatus, { color: colors.textSecondary }]}>{record.notes}</Text>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyTimeline}>
                <Ionicons name="receipt-outline" size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No payment history yet</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16 },

  heroCard: { borderRadius: 20, padding: 20, marginBottom: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  statusLabel: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  heroAmount: { color: '#FFF', fontSize: 30, fontWeight: '900', marginBottom: 8 },
  heroMeta: { flexDirection: 'row', gap: 4 },
  heroMetaText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },

  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  infoLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1 },

  labelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10, borderTopWidth: 1 },
  labelChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  labelChipText: { fontSize: 11, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, gap: 6 },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, gap: 6, marginBottom: 12 },
  deleteBtnText: { fontSize: 14, fontWeight: '700' },

  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderLeftWidth: 2, paddingLeft: 16, paddingVertical: 10, marginLeft: 8 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, position: 'absolute', left: -7, top: 14 },
  timelineDate: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  timelineAmount: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  timelineStatus: { fontSize: 11 },
  emptyTimeline: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, marginTop: 8 },
});
