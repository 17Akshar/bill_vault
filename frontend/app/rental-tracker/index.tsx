import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import {
  DUMMY_PROPERTIES, DUMMY_REMINDERS, Property,
  PropertyStatus, PROPERTY_TYPE_LABELS,
} from './_data';

const STATUS_COLORS: Record<PropertyStatus, string> = {
  rented: '#00C48C',
  vacant: '#FF5252',
  pending: '#FFB300',
};

const STATUS_LABELS: Record<PropertyStatus, string> = {
  rented: 'Rented',
  vacant: 'Vacant',
  pending: 'Pending',
};

const REMINDER_TYPE_COLORS: Record<string, string> = {
  rent_due: '#FF5252',
  tax: '#FF9100',
  maintenance: '#448AFF',
  agreement_renewal: '#7C4DFF',
  utility: '#00BCD4',
};

function PropertyCard({ property, onPress }: { property: Property; onPress: () => void }) {
  const { colors } = useTheme();
  const statusColor = STATUS_COLORS[property.status];
  const netProfit = property.totalReceived - property.totalExpenses;

  return (
    <TouchableOpacity
      style={[styles.propCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Card header */}
      <View style={styles.propCardTop}>
        <View style={[styles.propIconBox, { backgroundColor: property.color + '20' }]}>
          <Ionicons name={property.icon as any} size={24} color={property.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.propName, { color: colors.text }]} numberOfLines={1}>{property.name}</Text>
          <Text style={[styles.propMeta, { color: colors.textSecondary }]}>
            {PROPERTY_TYPE_LABELS[property.type]} · {property.city}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[property.status]}</Text>
        </View>
      </View>

      {/* Tenant row */}
      {property.tenantName !== 'Vacant' && (
        <View style={styles.tenantRow}>
          <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.tenantName, { color: colors.textSecondary }]}>{property.tenantName}</Text>
          {property.status === 'rented' && (
            <Text style={[styles.dueTag, { color: colors.textSecondary }]}>
              · Due {property.dueDay}th
            </Text>
          )}
        </View>
      )}

      {/* Financial summary row */}
      <View style={[styles.propFinRow, { borderTopColor: colors.border }]}>
        <View style={styles.propStat}>
          <Text style={[styles.propStatLabel, { color: colors.textSecondary }]}>Monthly Rent</Text>
          <Text style={[styles.propStatValue, { color: colors.text }]}>{formatINR(property.monthlyRent)}</Text>
        </View>
        <View style={[styles.propStatDivider, { backgroundColor: colors.border }]} />
        <View style={styles.propStat}>
          <Text style={[styles.propStatLabel, { color: colors.textSecondary }]}>Net Income</Text>
          <Text style={[styles.propStatValue, { color: netProfit >= 0 ? '#00C48C' : '#FF5252' }]}>
            {formatINR(netProfit)}
          </Text>
        </View>
        <View style={[styles.propStatDivider, { backgroundColor: colors.border }]} />
        <View style={styles.propStat}>
          <Text style={[styles.propStatLabel, { color: colors.textSecondary }]}>Outstanding</Text>
          <Text style={[styles.propStatValue, { color: property.outstanding > 0 ? '#FF5252' : '#00C48C' }]}>
            {property.outstanding > 0 ? formatINR(property.outstanding) : 'Nil'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RentalTrackerDashboard() {
  const router = useRouter();
  const { colors } = useTheme();

  const totalMonthlyRent = DUMMY_PROPERTIES.filter(p => p.status === 'rented').reduce((s, p) => s + p.monthlyRent, 0);
  const totalReceived = DUMMY_PROPERTIES.reduce((s, p) => s + p.totalReceived, 0);
  const totalExpenses = DUMMY_PROPERTIES.reduce((s, p) => s + p.totalExpenses, 0);
  const netIncome = totalReceived - totalExpenses;
  const rentedCount = DUMMY_PROPERTIES.filter(p => p.status === 'rented').length;
  const vacantCount = DUMMY_PROPERTIES.filter(p => p.status === 'vacant').length;

  const urgentReminders = [...DUMMY_REMINDERS].sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Rental Tracker</Text>
        <TouchableOpacity onPress={() => router.push('/rental-tracker/analytics' as any)} style={styles.iconBtn}>
          <Ionicons name="bar-chart-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Summary KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <Ionicons name="home-outline" size={18} color="#448AFF" />
            <Text style={[styles.kpiValue, { color: colors.text }]}>{DUMMY_PROPERTIES.length}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Properties</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#00C48C" />
            <Text style={[styles.kpiValue, { color: '#00C48C' }]}>{rentedCount}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Rented</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <Ionicons name="alert-circle-outline" size={18} color="#FF5252" />
            <Text style={[styles.kpiValue, { color: '#FF5252' }]}>{vacantCount}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Vacant</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <Ionicons name="trending-up-outline" size={18} color="#00C48C" />
            <Text style={[styles.kpiValue, { color: '#00C48C' }]} numberOfLines={1}>{formatINR(totalMonthlyRent, false)}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Monthly</Text>
          </View>
        </View>

        {/* Overall financial summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Portfolio Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Received</Text>
              <Text style={[styles.summaryValue, { color: '#00C48C' }]}>{formatINR(totalReceived)}</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Expenses</Text>
              <Text style={[styles.summaryValue, { color: '#FF5252' }]}>{formatINR(totalExpenses)}</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Net Income</Text>
              <Text style={[styles.summaryValue, { color: netIncome >= 0 ? '#00C48C' : '#FF5252' }]}>{formatINR(netIncome)}</Text>
            </View>
          </View>
        </View>

        {/* My Properties */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Properties</Text>
          <TouchableOpacity onPress={() => router.push('/rental-tracker/add-property' as any)}>
            <Text style={[styles.sectionLink, { color: colors.primary }]}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {DUMMY_PROPERTIES.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onPress={() => router.push({ pathname: '/rental-tracker/[id]', params: { id: property.id } } as any)}
          />
        ))}

        {/* Upcoming Reminders */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Reminders</Text>
          <TouchableOpacity onPress={() => router.push('/rental-tracker/reminder' as any)}>
            <Text style={[styles.sectionLink, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.remindersCard, { backgroundColor: colors.card }]}>
          {urgentReminders.map((r, i) => {
            const rc = REMINDER_TYPE_COLORS[r.type] || '#448AFF';
            const urgency = r.daysLeft <= 3 ? '#FF5252' : r.daysLeft <= 7 ? '#FFB300' : colors.textSecondary;
            const prop = DUMMY_PROPERTIES.find(p => p.id === r.propertyId);
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.reminderRow, i < urgentReminders.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                onPress={() => router.push('/rental-tracker/reminder' as any)}
              >
                <View style={[styles.reminderDot, { backgroundColor: rc + '25' }]}>
                  <View style={[styles.reminderDotInner, { backgroundColor: rc }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reminderTitle, { color: colors.text }]}>{r.title}</Text>
                  <Text style={[styles.reminderProp, { color: colors.textSecondary }]}>
                    {prop?.city} · {r.dueDate}
                  </Text>
                </View>
                <View style={[styles.daysChip, { backgroundColor: urgency + '20' }]}>
                  <Text style={[styles.daysText, { color: urgency }]}>
                    {r.daysLeft === 0 ? 'Today' : `${r.daysLeft}d`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/rental-tracker/add-property' as any)}
      >
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.fabText}>Add Property</Text>
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

  kpiRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  kpiCard: { flex: 1, alignItems: 'center', borderRadius: 14, padding: 12, gap: 4 },
  kpiValue: { fontSize: 16, fontWeight: '800' },
  kpiLabel: { fontSize: 9, fontWeight: '500', textAlign: 'center' },

  summaryCard: { marginHorizontal: 20, borderRadius: 18, padding: 18, marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  summaryRow: { flexDirection: 'row' },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, marginBottom: 4 },
  summaryValue: { fontSize: 15, fontWeight: '800' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionLink: { fontSize: 13, fontWeight: '600' },

  propCard: { marginHorizontal: 20, borderRadius: 18, padding: 16, marginBottom: 10 },
  propCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  propIconBox: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  propName: { fontSize: 15, fontWeight: '700' },
  propMeta: { fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  tenantName: { fontSize: 12, fontWeight: '500' },
  dueTag: { fontSize: 12 },
  propFinRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12 },
  propStat: { flex: 1, alignItems: 'center' },
  propStatLabel: { fontSize: 10, marginBottom: 3 },
  propStatValue: { fontSize: 13, fontWeight: '700' },
  propStatDivider: { width: 1 },

  remindersCard: { marginHorizontal: 20, borderRadius: 18, overflow: 'hidden', marginBottom: 10 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  reminderDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  reminderDotInner: { width: 10, height: 10, borderRadius: 5 },
  reminderTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  reminderProp: { fontSize: 11 },
  daysChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  daysText: { fontSize: 12, fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: 28, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 28,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
