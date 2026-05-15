import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR, formatINRCompact } from '../../utils/formatINR';
import DonutChart from '../../components/charts/DonutChart';
import { DUMMY_CARDS, type CCCard } from './_data';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 40;

const NETWORKS: Record<string, string> = {
  VISA: 'VISA',
  Mastercard: 'MC',
  RuPay: 'RuPay',
  Amex: 'AMEX',
};

function UtilizationBadge({ pct }: { pct: number }) {
  const color = pct > 80 ? '#FF4D67' : pct > 50 ? '#FFB300' : '#00C48C';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[styles.badgeText, { color }]}>{pct.toFixed(0)}%</Text>
    </View>
  );
}

function PhysicalCard({ card, onPress }: { card: CCCard; onPress: () => void }) {
  const util = card.credit_limit > 0 ? (card.current_outstanding / card.credit_limit) * 100 : 0;
  const utilColor = util > 80 ? '#FF4D67' : util > 50 ? '#FFB300' : '#00C48C';
  const daysColor = card.days_until_due <= 3 ? '#FF4D67' : card.days_until_due <= 7 ? '#FFB300' : '#00C48C';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.physicalCardWrap}>
      <LinearGradient
        colors={[card.color, card.color2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.physicalCard}
      >
        {/* Decorative circles */}
        <View style={[styles.circle1, { borderColor: 'rgba(255,255,255,0.15)' }]} />
        <View style={[styles.circle2, { borderColor: 'rgba(255,255,255,0.08)' }]} />

        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.cardBankName}>{card.bank_name}</Text>
            <Text style={styles.cardName}>{card.name}</Text>
          </View>
          <Text style={styles.networkLabel}>{card.network}</Text>
        </View>

        <Text style={styles.cardNumber}>•••• •••• •••• {card.card_number_last4}</Text>

        <View style={styles.cardBottomRow}>
          <View>
            <Text style={styles.cardMetaLabel}>Outstanding</Text>
            <Text style={styles.cardMetaValue}>{formatINRCompact(card.current_outstanding)}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.cardMetaLabel}>Limit</Text>
            <Text style={styles.cardMetaValue}>{formatINRCompact(card.credit_limit)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardMetaLabel}>Due on</Text>
            <Text style={[styles.cardMetaValue, { color: daysColor }]}>{card.payment_due_label}</Text>
          </View>
        </View>

        {/* Utilization bar */}
        <View style={styles.utilBarTrack}>
          <View style={[styles.utilBarFill, { width: `${Math.min(util, 100)}%` as any, backgroundColor: utilColor }]} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function CreditCardsDashboard() {
  const router = useRouter();
  const { colors } = useTheme();

  const totalOutstanding = DUMMY_CARDS.reduce((s, c) => s + c.current_outstanding, 0);
  const totalLimit = DUMMY_CARDS.reduce((s, c) => s + c.credit_limit, 0);
  const totalAvailable = totalLimit - totalOutstanding;
  const overallUtil = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : 0;

  const donutData = [
    { value: totalOutstanding, color: '#FF4D67', label: 'Outstanding' },
    { value: totalAvailable, color: '#00C48C', label: 'Available' },
  ];

  const upcoming = [...DUMMY_CARDS]
    .sort((a, b) => a.days_until_due - b.days_until_due)
    .slice(0, 3);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Credit Cards</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryLeft}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Outstanding</Text>
            <Text style={[styles.summaryBig, { color: '#FF4D67' }]}>{formatINR(totalOutstanding)}</Text>
            <Text style={[styles.summaryAcross, { color: colors.textSecondary }]}>
              Across {DUMMY_CARDS.length} Cards
            </Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.sItemLabel, { color: colors.textSecondary }]}>Available Credit</Text>
                <Text style={[styles.sItemVal, { color: '#00C48C' }]}>{formatINRCompact(totalAvailable)}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.sItemLabel, { color: colors.textSecondary }]}>Credit Utilization</Text>
                <Text style={[styles.sItemVal, { color: overallUtil > 70 ? '#FF4D67' : '#FFB300' }]}>
                  {overallUtil.toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>

          <DonutChart
            data={donutData}
            size={120}
            strokeWidth={18}
            centerValue={`${overallUtil.toFixed(0)}%`}
            centerLabel="Used"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'calendar-outline', label: 'Calendar', route: '/credit-cards/calendar' },
            { icon: 'receipt-outline', label: 'Transactions', route: '/credit-cards/transactions' },
            { icon: 'add-circle-outline', label: 'Add Card', action: 'add' },
            { icon: 'sync-outline', label: 'Billing', route: '/credit-cards/billing-cycle' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.quickBtn, { backgroundColor: colors.card }]}
              onPress={() => {
                if (item.route) router.push(item.route as any);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as any} size={22} color={colors.primary} />
              <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Your Cards */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Cards</Text>
          <TouchableOpacity>
            <Text style={[styles.addCardText, { color: colors.primary }]}>+ Add Card</Text>
          </TouchableOpacity>
        </View>

        {DUMMY_CARDS.map((card) => (
          <PhysicalCard
            key={card.card_id}
            card={card}
            onPress={() => router.push({ pathname: '/credit-cards/[id]', params: { id: card.card_id } } as any)}
          />
        ))}

        {/* Upcoming Payments */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginHorizontal: 20, marginTop: 8, marginBottom: 12 }]}>
          Upcoming Payments
        </Text>
        <View style={styles.upcomingRow}>
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/credit-cards/calendar' as any)}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {upcoming.map((card) => {
          const daysColor = card.days_until_due <= 3 ? '#FF4D67' : card.days_until_due <= 7 ? '#FFB300' : '#00C48C';
          const daysText = card.days_until_due <= 0 ? 'Overdue' :
            card.days_until_due === 1 ? 'In 1 day' : `In ${card.days_until_due} days`;
          return (
            <TouchableOpacity
              key={card.card_id}
              style={[styles.upcomingCard, { backgroundColor: colors.card }]}
              onPress={() => router.push({ pathname: '/credit-cards/payment-details', params: { id: card.card_id } } as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.upcomingIcon, { backgroundColor: card.color + '22' }]}>
                <Ionicons name="card-outline" size={20} color={card.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.upcomingName, { color: colors.text }]}>{card.bank_name} {card.name}</Text>
                <Text style={[styles.upcomingDue, { color: colors.textSecondary }]}>Due on {card.payment_due_label}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.upcomingAmount, { color: colors.text }]}>{formatINR(card.current_outstanding)}</Text>
                <View style={[styles.daysBadge, { backgroundColor: daysColor + '22' }]}>
                  <Text style={[styles.daysText, { color: daysColor }]}>{daysText}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

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
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { paddingBottom: 20 },

  // Summary
  summaryCard: {
    marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  summaryLeft: { flex: 1, marginRight: 12 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryBig: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  summaryAcross: { fontSize: 11, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1 },
  sItemLabel: { fontSize: 10, marginBottom: 3 },
  sItemVal: { fontSize: 14, fontWeight: '700' },
  divider: { width: 1, height: 32, marginHorizontal: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Quick actions
  quickActions: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20,
  },
  quickBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, gap: 6,
  },
  quickLabel: { fontSize: 10, fontWeight: '600' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  addCardText: { fontSize: 14, fontWeight: '600' },

  // Physical card
  physicalCardWrap: { marginHorizontal: 20, marginBottom: 14 },
  physicalCard: {
    borderRadius: 20, padding: 20, height: 190, overflow: 'hidden', position: 'relative',
  },
  circle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    borderWidth: 40, top: -60, right: -60,
  },
  circle2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    borderWidth: 30, bottom: -50, left: -30,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'auto' as any },
  cardBankName: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 1 },
  networkLabel: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1, opacity: 0.9 },
  cardNumber: { color: 'rgba(255,255,255,0.85)', fontSize: 15, letterSpacing: 3, marginTop: 22, marginBottom: 14 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  cardMetaLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginBottom: 2 },
  cardMetaValue: { color: '#fff', fontSize: 13, fontWeight: '700' },
  utilBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  utilBarFill: { height: '100%', borderRadius: 2 },

  // Upcoming
  upcomingRow: { position: 'absolute', right: 20, top: -44 + 14 },
  viewAllBtn: { marginRight: 20, marginBottom: 8, alignSelf: 'flex-end' },
  viewAllText: { fontSize: 13, fontWeight: '600' },
  upcomingCard: {
    marginHorizontal: 20, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  upcomingIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  upcomingName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  upcomingDue: { fontSize: 12 },
  upcomingAmount: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  daysBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  daysText: { fontSize: 11, fontWeight: '600' },
});
