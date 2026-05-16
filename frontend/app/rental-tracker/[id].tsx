import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import {
  DUMMY_PROPERTIES, DUMMY_PAYMENTS, DUMMY_EXPENSES, DUMMY_TIMELINE,
  DUMMY_REMINDERS, PROPERTY_TYPE_LABELS, PropertyStatus,
  EXPENSE_CAT_COLORS, EXPENSE_CAT_ICONS,
  TIMELINE_COLORS, TIMELINE_ICONS,
} from './_data';

type Tab = 'Summary' | 'Rent' | 'Expenses' | 'Timeline';
const TABS: Tab[] = ['Summary', 'Rent', 'Expenses', 'Timeline'];

const STATUS_COLORS: Record<PropertyStatus, string> = {
  rented: '#00C48C', vacant: '#FF5252', pending: '#FFB300',
};

const MODE_COLORS: Record<string, string> = {
  UPI: '#7C4DFF', NEFT: '#448AFF', Cash: '#00C48C', Cheque: '#FF9100',
};

export default function PropertyDetailsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('Summary');

  const property = DUMMY_PROPERTIES.find(p => p.id === params.id) ?? DUMMY_PROPERTIES[0];
  const payments = DUMMY_PAYMENTS.filter(p => p.propertyId === property.id);
  const expenses = DUMMY_EXPENSES.filter(e => e.propertyId === property.id);
  const timeline = DUMMY_TIMELINE.filter(t => t.propertyId === property.id);
  const reminders = DUMMY_REMINDERS.filter(r => r.propertyId === property.id);

  const netProfit = property.totalReceived - property.totalExpenses;
  const statusColor = STATUS_COLORS[property.status];
  const rentalYield = ((property.monthlyRent * 12) / property.purchasePrice) * 100;

  const handleDelete = () => {
    Alert.alert('Delete Property', `Remove "${property.name}" from your portfolio?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  // ===== SUMMARY TAB =====
  const renderSummary = () => (
    <>
      {/* Financial KPI Cards */}
      <View style={styles.kpiGrid}>
        {[
          { label: 'Monthly Rent', value: formatINR(property.monthlyRent), color: colors.primary },
          { label: 'Total Received', value: formatINR(property.totalReceived), color: '#00C48C' },
          { label: 'Total Expenses', value: formatINR(property.totalExpenses), color: '#FF5252' },
          { label: 'Net Profit', value: formatINR(netProfit), color: netProfit >= 0 ? '#00C48C' : '#FF5252' },
        ].map((kpi) => (
          <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      {/* Yield badge */}
      <View style={[styles.yieldCard, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
        <Text style={[styles.yieldText, { color: colors.text }]}>Rental Yield</Text>
        <Text style={[styles.yieldValue, { color: colors.primary }]}>{rentalYield.toFixed(2)}% p.a.</Text>
      </View>

      {/* Property Details */}
      <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Property Details</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {[
          { label: 'Property Price', value: formatINR(property.purchasePrice) },
          { label: 'Purchase Date', value: property.purchaseDate },
          { label: 'Property Type', value: PROPERTY_TYPE_LABELS[property.type] },
          { label: 'Rental Start', value: property.rentalStartDate || 'Not Rented' },
          { label: 'Rental End', value: property.rentalEndDate || '—' },
          { label: 'Security Deposit', value: property.securityDeposit > 0 ? formatINR(property.securityDeposit) : '—' },
          { label: 'Address', value: `${property.address}, ${property.city}` },
        ].map((row) => (
          <View key={row.label} style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{row.label}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{row.value}</Text>
          </View>
        ))}
        <TouchableOpacity style={[styles.editBtn, { borderColor: colors.primary }]} onPress={() => router.push('/rental-tracker/add-property' as any)}>
          <Ionicons name="create-outline" size={16} color={colors.primary} />
          <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Property</Text>
        </TouchableOpacity>
      </View>

      {/* Reminders */}
      <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Reminders</Text>
          <TouchableOpacity onPress={() => router.push('/rental-tracker/reminder' as any)}>
            <Text style={[styles.addLink, { color: colors.primary }]}>+ Add Reminder</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {reminders.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No reminders set</Text>
        ) : reminders.map((r) => {
          const urgency = r.daysLeft <= 3 ? '#FF5252' : r.daysLeft <= 7 ? '#FFB300' : '#00C48C';
          return (
            <View key={r.id} style={[styles.reminderRow, { backgroundColor: urgency + '10' }]}>
              <Ionicons name="notifications-outline" size={16} color={urgency} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.reminderTitle, { color: colors.text }]}>{r.title}</Text>
                <Text style={[styles.reminderDate, { color: colors.textSecondary }]}>{r.dueDate}</Text>
              </View>
              <Text style={[styles.reminderDays, { color: urgency }]}>{r.daysLeft}d</Text>
            </View>
          );
        })}
      </View>
    </>
  );

  // ===== RENT TAB =====
  const renderRent = () => (
    <>
      <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Payment History</Text>
          <TouchableOpacity>
            <Text style={[styles.addLink, { color: colors.primary }]}>+ Add Entry</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Header row */}
        <View style={styles.payTableHeader}>
          <Text style={[styles.payTH, { color: colors.textSecondary, flex: 1.2 }]}>Month</Text>
          <Text style={[styles.payTH, { color: colors.textSecondary, flex: 1 }]}>Amount</Text>
          <Text style={[styles.payTH, { color: colors.textSecondary, flex: 0.8 }]}>Date</Text>
          <Text style={[styles.payTH, { color: colors.textSecondary, flex: 0.7 }]}>Mode</Text>
          <Text style={[styles.payTH, { color: colors.textSecondary, flex: 0.7 }]}>Status</Text>
        </View>

        {payments.map((pay) => {
          const sc = pay.status === 'paid' ? '#00C48C' : pay.status === 'late' ? '#FF9100' : '#FF5252';
          const mc = MODE_COLORS[pay.mode] || '#607D8B';
          return (
            <View key={pay.id} style={[styles.payRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.payCell, { color: colors.text, flex: 1.2 }]}>{pay.month}</Text>
              <Text style={[styles.payCell, { color: colors.text, flex: 1 }]}>{formatINR(pay.amount, false)}</Text>
              <Text style={[styles.payCell, { color: colors.textSecondary, flex: 0.8, fontSize: 10 }]}>
                {pay.date || '—'}
              </Text>
              <View style={[styles.modeChip, { backgroundColor: mc + '20', flex: 0.7 }]}>
                <Text style={[styles.modeText, { color: mc }]}>{pay.mode}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: sc + '20', flex: 0.7 }]}>
                <Text style={[styles.statusPillText, { color: sc }]}>
                  {pay.status.charAt(0).toUpperCase() + pay.status.slice(1)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Outstanding */}
      {property.outstanding > 0 && (
        <View style={[styles.outstandingCard, { backgroundColor: '#FF525215' }]}>
          <Ionicons name="alert-circle" size={20} color="#FF5252" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.outstandingTitle, { color: '#FF5252' }]}>Outstanding Rent</Text>
            <Text style={[styles.outstandingAmt, { color: '#FF5252' }]}>{formatINR(property.outstanding)}</Text>
          </View>
          <TouchableOpacity style={[styles.remindBtn, { backgroundColor: '#FF5252' }]}>
            <Text style={styles.remindBtnText}>Remind</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // ===== EXPENSES TAB =====
  const renderExpenses = () => (
    <>
      <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Expenses</Text>
          <TouchableOpacity>
            <Text style={[styles.addLink, { color: colors.primary }]}>+ Add</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {expenses.map((e) => {
          const ec = EXPENSE_CAT_COLORS[e.category] || '#607D8B';
          const ei = EXPENSE_CAT_ICONS[e.category] || 'ellipsis-horizontal-outline';
          return (
            <View key={e.id} style={[styles.expRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.expIcon, { backgroundColor: ec + '20' }]}>
                <Ionicons name={ei as any} size={14} color={ec} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.expTitle, { color: colors.text }]}>{e.title}</Text>
                <Text style={[styles.expDate, { color: colors.textSecondary }]}>{e.date}</Text>
              </View>
              <Text style={[styles.expAmount, { color: '#FF5252' }]}>−{formatINR(e.amount)}</Text>
            </View>
          );
        })}
        <View style={[styles.expTotal, { borderTopColor: colors.border }]}>
          <Text style={[styles.expTotalLabel, { color: colors.textSecondary }]}>Total Expenses</Text>
          <Text style={[styles.expTotalValue, { color: '#FF5252' }]}>{formatINR(expenses.reduce((s, e) => s + e.amount, 0))}</Text>
        </View>
      </View>
    </>
  );

  // ===== TIMELINE TAB =====
  const renderTimeline = () => (
    <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Property Timeline</Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      {timeline.map((event, i) => {
        const tc = TIMELINE_COLORS[event.type] || '#607D8B';
        const ti = TIMELINE_ICONS[event.type] || 'time-outline';
        return (
          <View key={event.id} style={styles.timelineItem}>
            {/* Vertical line */}
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, { backgroundColor: tc }]}>
                <Ionicons name={ti as any} size={12} color="#FFF" />
              </View>
              {i < timeline.length - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
            </View>
            <View style={[styles.timelineContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.timelineTitle, { color: colors.text }]}>{event.title}</Text>
              <Text style={[styles.timelineDate, { color: colors.textSecondary }]}>{event.date}</Text>
              {event.amount !== undefined && (
                <Text style={[styles.timelineAmt, { color: event.type === 'payment' ? '#00C48C' : '#FF5252' }]}>
                  {event.type === 'payment' ? '+' : '−'}{formatINR(event.amount)}
                </Text>
              )}
              {event.notes ? (
                <Text style={[styles.timelineNotes, { color: colors.textSecondary }]}>{event.notes}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{property.name}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>

      {/* Property hero */}
      <View style={[styles.heroCard, { backgroundColor: property.color + '18' }]}>
        <View style={[styles.heroIcon, { backgroundColor: property.color + '30' }]}>
          <Ionicons name={property.icon as any} size={32} color={property.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.heroTopRow}>
            <Text style={[styles.heroCity, { color: colors.textSecondary }]}>{property.city}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{property.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[styles.heroType, { color: colors.text }]}>{PROPERTY_TYPE_LABELS[property.type]}</Text>
          {property.tenantName !== 'Vacant' && (
            <Text style={[styles.heroTenant, { color: colors.textSecondary }]}>
              <Ionicons name="person-outline" size={12} /> {property.tenantName}
            </Text>
          )}
        </View>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {activeTab === 'Summary' && renderSummary()}
        {activeTab === 'Rent' && renderRent()}
        {activeTab === 'Expenses' && renderExpenses()}
        {activeTab === 'Timeline' && renderTimeline()}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, borderRadius: 18, padding: 16, marginBottom: 8 },
  heroIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  heroCity: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },
  heroType: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  heroTenant: { fontSize: 12 },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 12 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '600' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  kpiCard: { width: '47.5%', borderRadius: 14, padding: 14 },
  kpiValue: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  kpiLabel: { fontSize: 11 },

  yieldCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, marginBottom: 10 },
  yieldText: { flex: 1, fontSize: 14, fontWeight: '600' },
  yieldValue: { fontSize: 18, fontWeight: '800' },

  detailsCard: { borderRadius: 18, padding: 18, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addLink: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, marginVertical: 12 },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 8 },
  detailLabel: { fontSize: 12, flex: 0.45 },
  detailValue: { fontSize: 12, fontWeight: '600', flex: 0.55, textAlign: 'right' },

  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, height: 40, marginTop: 12 },
  editBtnText: { fontSize: 14, fontWeight: '600' },

  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10, marginBottom: 6 },
  reminderTitle: { fontSize: 13, fontWeight: '600' },
  reminderDate: { fontSize: 11 },
  reminderDays: { fontSize: 13, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },

  payTableHeader: { flexDirection: 'row', paddingBottom: 8 },
  payTH: { fontSize: 10, fontWeight: '700' },
  payRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  payCell: { fontSize: 12, fontWeight: '500' },
  modeChip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center' },
  modeText: { fontSize: 9, fontWeight: '700' },
  statusPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center' },
  statusPillText: { fontSize: 9, fontWeight: '700' },

  outstandingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 },
  outstandingTitle: { fontSize: 13, fontWeight: '600' },
  outstandingAmt: { fontSize: 18, fontWeight: '800' },
  remindBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  remindBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  expRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  expIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  expTitle: { fontSize: 13, fontWeight: '600' },
  expDate: { fontSize: 11 },
  expAmount: { fontSize: 13, fontWeight: '700' },
  expTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTopWidth: 1 },
  expTotalLabel: { fontSize: 13, fontWeight: '600' },
  expTotalValue: { fontSize: 15, fontWeight: '800' },

  timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 28 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  timelineContent: { flex: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  timelineTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  timelineDate: { fontSize: 11, marginBottom: 4 },
  timelineAmt: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  timelineNotes: { fontSize: 11 },
});
