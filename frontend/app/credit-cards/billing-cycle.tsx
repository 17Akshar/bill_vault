import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import { DUMMY_CARDS } from './_data';

function CycleRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.cycleRow}>
      <Text style={[styles.cycleLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.cycleValue, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

export default function BillingCycleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();

  const [selectedCard, setSelectedCard] = useState(params.id ?? DUMMY_CARDS[0].card_id);
  const [showPicker, setShowPicker] = useState(false);

  const card = DUMMY_CARDS.find((c) => c.card_id === selectedCard) ?? DUMMY_CARDS[0];
  const totalSpent = 82500;
  const payments = 40000;
  const outstanding = card.current_outstanding;
  const minDue = card.minimum_due;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Billing Cycle</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Card Selector */}
        <TouchableOpacity
          style={[styles.cardSelector, { backgroundColor: colors.card }]}
          onPress={() => setShowPicker(!showPicker)}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectorBank, { color: colors.textSecondary }]}>{card.bank_name}</Text>
            <Text style={[styles.selectorName, { color: colors.text }]}>
              {card.name}  •••• {card.card_number_last4}
            </Text>
          </View>
          <Ionicons name={showPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {showPicker && (
          <View style={[styles.pickerMenu, { backgroundColor: colors.card }]}>
            {DUMMY_CARDS.map((c) => (
              <TouchableOpacity
                key={c.card_id}
                style={[styles.pickerItem, c.card_id === selectedCard && { backgroundColor: colors.primary + '18' }]}
                onPress={() => { setSelectedCard(c.card_id); setShowPicker(false); }}
              >
                <View style={[styles.pickerDot, { backgroundColor: c.color }]} />
                <Text style={[styles.pickerText, { color: colors.text }]}>{c.bank_name} •••• {c.card_number_last4}</Text>
                {c.card_id === selectedCard && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Current Cycle Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.cycleHeader}>
            <View>
              <Text style={[styles.cycleTitle, { color: colors.text }]}>Billing Cycle</Text>
              <Text style={[styles.cycleDates, { color: colors.primary }]}>01 Apr – 30 Apr</Text>
            </View>
            <View style={[styles.activeBadge]}>
              <Text style={styles.activeBadgeText}>Current</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.cycleNext}>
            <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.cycleNextLabel, { color: colors.textSecondary }]}>Next Cycle</Text>
            <Text style={[styles.cycleNextVal, { color: colors.text }]}>01 May – 31 May</Text>
          </View>
        </View>

        {/* Cycle Summary */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Cycle Summary</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <CycleRow label="Total Spent" value={formatINR(totalSpent)} valueColor="#FF4D67" />
          <CycleRow label="Payments" value={formatINR(payments)} valueColor="#00C48C" />
          <CycleRow label="Outstanding" value={formatINR(outstanding)} valueColor="#FF4D67" />
          <CycleRow label="Minimum Due" value={formatINR(minDue)} />

          <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Bill will be generated on 30 Apr 2024
            </Text>
          </View>
        </View>

        {/* Spending breakdown */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Breakdown</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {[
            { label: 'Shopping', amount: 8149, color: '#FF9100', pct: 33 },
            { label: 'Electronics', amount: 18999, color: '#7C4DFF', pct: 26 },
            { label: 'Food & Dining', amount: 1325, color: '#FF4D67', pct: 18 },
            { label: 'Groceries', amount: 1230, color: '#00C48C', pct: 14 },
            { label: 'Transport', amount: 320, color: '#448AFF', pct: 9 },
          ].map((cat) => (
            <View key={cat.label} style={styles.breakRow}>
              <View style={[styles.breakDot, { backgroundColor: cat.color }]} />
              <Text style={[styles.breakLabel, { color: colors.text }]}>{cat.label}</Text>
              <View style={[styles.breakBarTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.breakBarFill, { width: `${cat.pct}%` as any, backgroundColor: cat.color }]} />
              </View>
              <Text style={[styles.breakAmount, { color: colors.text }]}>{formatINR(cat.amount)}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.viewBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push({ pathname: '/credit-cards/transactions', params: { id: selectedCard } } as any)}
        >
          <Ionicons name="list-outline" size={18} color="#FFF" />
          <Text style={styles.viewBtnText}>View Transactions</Text>
        </TouchableOpacity>

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
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  cardSelector: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 4,
  },
  selectorBank: { fontSize: 11, marginBottom: 2 },
  selectorName: { fontSize: 15, fontWeight: '600' },
  pickerMenu: { borderRadius: 14, marginBottom: 8, overflow: 'hidden' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  pickerDot: { width: 10, height: 10, borderRadius: 5 },
  pickerText: { flex: 1, fontSize: 14, fontWeight: '500' },

  sectionCard: { borderRadius: 18, padding: 18, marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  divider: { height: 1, marginBottom: 14 },

  cycleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cycleTitle: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  cycleDates: { fontSize: 18, fontWeight: '800' },
  activeBadge: { backgroundColor: '#00C48C22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { color: '#00C48C', fontSize: 12, fontWeight: '700' },
  cycleNext: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cycleNextLabel: { fontSize: 12 },
  cycleNextVal: { fontSize: 14, fontWeight: '600' },

  cycleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  cycleLabel: { fontSize: 13 },
  cycleValue: { fontSize: 15, fontWeight: '700' },

  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginTop: 12 },
  infoText: { fontSize: 12, flex: 1 },

  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  breakDot: { width: 8, height: 8, borderRadius: 4 },
  breakLabel: { fontSize: 12, width: 80 },
  breakBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  breakBarFill: { height: '100%', borderRadius: 3 },
  breakAmount: { fontSize: 12, fontWeight: '600', width: 60, textAlign: 'right' },

  viewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 52, gap: 8, marginTop: 16,
  },
  viewBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
