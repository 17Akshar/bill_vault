import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR, formatINRCompact } from '../../utils/formatINR';
import { DUMMY_CARDS } from './_data';

const { width: SW } = Dimensions.get('window');

function StatBox({ label, value, valueColor, sub }: { label: string; value: string; valueColor?: string; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statBox, { backgroundColor: colors.background }]}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor ?? colors.text }]}>{value}</Text>
      {sub ? <Text style={[styles.statSub, { color: colors.textSecondary }]}>{sub}</Text> : null}
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>{children}</View>;
}

function Row({ label, value, valueColor, badge }: { label: string; value: string; valueColor?: string; badge?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[styles.rowValue, { color: valueColor ?? colors.text }]}>{value}</Text>
        {badge}
      </View>
    </View>
  );
}

export default function CardDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const card = DUMMY_CARDS.find((c) => c.card_id === id) ?? DUMMY_CARDS[0];
  const available = card.credit_limit - card.current_outstanding;
  const util = card.credit_limit > 0 ? (card.current_outstanding / card.credit_limit) * 100 : 0;
  const utilColor = util > 80 ? '#FF4D67' : util > 50 ? '#FFB300' : '#00C48C';
  const daysColor = card.days_until_due <= 3 ? '#FF4D67' : card.days_until_due <= 7 ? '#FFB300' : '#00C48C';
  const daysLabel = card.days_until_due <= 0 ? 'Overdue'
    : card.days_until_due === 1 ? 'In 1 day'
    : `In ${card.days_until_due} days`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Card Details</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Card Visual */}
        <LinearGradient
          colors={[card.color, card.color2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardVisual}
        >
          <View style={[styles.circle1, { borderColor: 'rgba(255,255,255,0.15)' }]} />
          <View style={[styles.circle2, { borderColor: 'rgba(255,255,255,0.08)' }]} />
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.cardBank}>{card.bank_name}</Text>
              <Text style={styles.cardName}>{card.name}</Text>
            </View>
            <Text style={styles.networkText}>{card.network}</Text>
          </View>
          <Text style={styles.cardNumber}>•••• •••• •••• {card.card_number_last4}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="rgba(255,255,255,0.6)" />
            <Ionicons name="star" size={12} color="rgba(255,255,255,0.6)" />
            <Ionicons name="star" size={12} color="rgba(255,255,255,0.6)" />
            <Text style={styles.cardStars}>  2 Rewards per ₹150</Text>
          </View>
        </LinearGradient>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatBox label="Card Limit" value={formatINR(card.credit_limit)} />
          <StatBox label="Available Credit" value={formatINRCompact(available)} valueColor="#00C48C" />
          <StatBox label="Outstanding" value={formatINR(card.current_outstanding)} valueColor="#FF4D67" />
          <StatBox label="Utilization" value={`${util.toFixed(0)}%`} valueColor={utilColor} />
        </View>

        {/* Utilization bar */}
        <SectionCard>
          <View style={styles.utilHeader}>
            <Text style={[styles.secTitle, { color: colors.text }]}>Credit Utilization</Text>
            <Text style={[styles.utilPct, { color: utilColor }]}>{util.toFixed(0)}%</Text>
          </View>
          <View style={[styles.utilTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.utilFill, { width: `${Math.min(util, 100)}%` as any, backgroundColor: utilColor }]} />
          </View>
          <Text style={[styles.utilNote, { color: colors.textSecondary }]}>
            {util > 70 ? 'High utilization may impact your credit score' : 'Utilization is within healthy range'}
          </Text>
        </SectionCard>

        {/* Billing Details */}
        <SectionCard>
          <Text style={[styles.secTitle, { color: colors.text }]}>Billing Details</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row label="Billing Cycle" value={`01 Apr - 30 Apr`} />
          <Row
            label="Payment Due Date"
            value={card.payment_due_label}
            valueColor={daysColor}
            badge={
              <View style={[styles.daysBadge, { backgroundColor: daysColor + '22' }]}>
                <Text style={[styles.daysText, { color: daysColor }]}>{daysLabel}</Text>
              </View>
            }
          />
          <Row label="Minimum Due" value={formatINR(card.minimum_due)} valueColor="#FF4D67" />
        </SectionCard>

        {/* Last Payment */}
        <SectionCard>
          <Text style={[styles.secTitle, { color: colors.text }]}>Last Payment</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row label="Amount Paid" value={formatINR(card.last_payment_amount)} valueColor="#00C48C" />
          <Row
            label="Payment Date"
            value={card.last_payment_date}
            badge={
              <View style={[styles.successBadge]}>
                <Text style={styles.successText}>Successful</Text>
              </View>
            }
          />
        </SectionCard>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/credit-cards/transactions', params: { id: card.card_id } } as any)}
          >
            <Ionicons name="list-outline" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>View Transactions</Text>
          </TouchableOpacity>

          <View style={styles.secondaryBtns}>
            <TouchableOpacity
              style={[styles.secBtn, { backgroundColor: colors.card }]}
              onPress={() => router.push({ pathname: '/credit-cards/payment-details', params: { id: card.card_id } } as any)}
            >
              <Ionicons name="cash-outline" size={18} color="#00C48C" />
              <Text style={[styles.secBtnText, { color: colors.text }]}>Pay Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secBtn, { backgroundColor: colors.card }]}
              onPress={() => router.push({ pathname: '/credit-cards/billing-cycle', params: { id: card.card_id } } as any)}
            >
              <Ionicons name="sync-outline" size={18} color="#448AFF" />
              <Text style={[styles.secBtnText, { color: colors.text }]}>Billing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secBtn, { backgroundColor: colors.card }]}
              onPress={() => router.push({ pathname: '/credit-cards/reminder', params: { id: card.card_id } } as any)}
            >
              <Ionicons name="notifications-outline" size={18} color="#FFB300" />
              <Text style={[styles.secBtnText, { color: colors.text }]}>Remind</Text>
            </TouchableOpacity>
          </View>
        </View>

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
  headerTitle: { fontSize: 18, fontWeight: '700' },

  // Card visual
  cardVisual: {
    marginHorizontal: 20, borderRadius: 20, padding: 22, height: 200,
    marginBottom: 16, overflow: 'hidden', position: 'relative',
  },
  circle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    borderWidth: 40, top: -80, right: -60,
  },
  circle2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    borderWidth: 30, bottom: -60, left: -30,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 'auto' as any },
  cardBank: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500' },
  cardName: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 2 },
  networkText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  cardNumber: { color: 'rgba(255,255,255,0.85)', fontSize: 16, letterSpacing: 4, marginTop: 24, marginBottom: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  cardStars: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },

  // Stats
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 14,
  },
  statBox: {
    width: (SW - 60) / 2, borderRadius: 14, padding: 14,
  },
  statLabel: { fontSize: 11, marginBottom: 6 },
  statValue: { fontSize: 17, fontWeight: '800' },
  statSub: { fontSize: 10, marginTop: 2 },

  // Section cards
  sectionCard: {
    marginHorizontal: 20, borderRadius: 16, padding: 18, marginBottom: 12,
  },
  secTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  divider: { height: 1, marginBottom: 14 },

  // Utilization
  utilHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  utilPct: { fontSize: 18, fontWeight: '800' },
  utilTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  utilFill: { height: '100%', borderRadius: 4 },
  utilNote: { fontSize: 12 },

  // Row
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 14, fontWeight: '600' },

  daysBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  daysText: { fontSize: 11, fontWeight: '600' },
  successBadge: { backgroundColor: '#00C48C22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  successText: { color: '#00C48C', fontSize: 11, fontWeight: '600' },

  // Actions
  actions: { paddingHorizontal: 20, gap: 10 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 52, gap: 8,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtns: { flexDirection: 'row', gap: 10 },
  secBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 48, gap: 6,
  },
  secBtnText: { fontSize: 13, fontWeight: '600' },
});
