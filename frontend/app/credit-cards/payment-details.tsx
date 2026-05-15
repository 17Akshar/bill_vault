import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import { DUMMY_CARDS } from './_data';

type Repeat = 'One Time' | 'Daily' | 'Weekly' | 'Monthly';

function InfoRow({ label, value, valueColor, badge }: { label: string; value: string; valueColor?: string; badge?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[styles.infoValue, { color: valueColor ?? colors.text }]}>{value}</Text>
        {badge}
      </View>
    </View>
  );
}

export default function PaymentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();

  const card = DUMMY_CARDS.find((c) => c.card_id === params.id) ?? DUMMY_CARDS[0];

  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDate, setReminderDate] = useState('02 May 2024');
  const [reminderTime, setReminderTime] = useState('09:00 AM');
  const [repeat, setRepeat] = useState<Repeat>('One Time');

  const REPEATS: Repeat[] = ['One Time', 'Daily', 'Weekly', 'Monthly'];
  const daysColor = card.days_until_due <= 3 ? '#FF4D67' : card.days_until_due <= 7 ? '#FFB300' : '#00C48C';
  const daysLabel = card.days_until_due <= 0 ? 'Overdue'
    : card.days_until_due === 1 ? 'In 1 day'
    : `In ${card.days_until_due} days`;

  const handlePayNow = () => {
    Alert.alert(
      'Confirm Payment',
      `Pay ${formatINR(card.current_outstanding)} for ${card.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay Now', onPress: () => Alert.alert('Success', 'Payment initiated!') },
      ]
    );
  };

  const handleSaveReminder = () => {
    Alert.alert('Reminder Set', `You'll be reminded on ${reminderDate} at ${reminderTime}.`, [
      { text: 'OK' },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Details</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Card info */}
        <View style={[styles.cardChip, { backgroundColor: colors.card }]}>
          <View style={[styles.cardDot, { backgroundColor: card.color }]} />
          <View>
            <Text style={[styles.cardChipBank, { color: colors.textSecondary }]}>{card.bank_name}</Text>
            <Text style={[styles.cardChipName, { color: colors.text }]}>
              {card.name}  •••• {card.card_number_last4}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} style={{ marginLeft: 'auto' as any }} />
        </View>

        {/* Payment summary */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <InfoRow
            label="Payment Due Date"
            value={card.payment_due_label}
            valueColor={daysColor}
            badge={
              <View style={[styles.daysBadge, { backgroundColor: daysColor + '22' }]}>
                <Text style={[styles.daysText, { color: daysColor }]}>{daysLabel}</Text>
              </View>
            }
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Minimum Due" value={formatINR(card.minimum_due)} valueColor="#FF4D67" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Total Due highlighted */}
          <View style={[styles.totalDueBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.totalDueLabel, { color: colors.textSecondary }]}>Total Due</Text>
            <Text style={[styles.totalDueValue, { color: '#FF4D67' }]}>{formatINR(card.current_outstanding)}</Text>
          </View>
        </View>

        {/* Pay Now */}
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: colors.primary }]}
          onPress={handlePayNow}
          activeOpacity={0.85}
        >
          <Ionicons name="card-outline" size={20} color="#FFF" />
          <Text style={styles.payBtnText}>Pay Now</Text>
        </TouchableOpacity>

        {/* Reminder section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.reminderRow}>
            <View>
              <Text style={[styles.reminderTitle, { color: colors.text }]}>Set Reminder</Text>
              <Text style={[styles.reminderSub, { color: colors.textSecondary }]}>
                We will remind you before due date
              </Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>

          {reminderEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <TouchableOpacity style={[styles.fieldRow, { backgroundColor: colors.background }]}>
                <Text style={[styles.fieldRowLabel, { color: colors.textSecondary }]}>Reminder Date</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.fieldRowValue, { color: colors.text }]}>{reminderDate}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.fieldRow, { backgroundColor: colors.background }]}>
                <Text style={[styles.fieldRowLabel, { color: colors.textSecondary }]}>Reminder Time</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.fieldRowValue, { color: colors.text }]}>{reminderTime}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <View style={styles.repeatSection}>
                <Text style={[styles.repeatLabel, { color: colors.text }]}>Repeat</Text>
                <View style={styles.repeatRow}>
                  {REPEATS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.repeatChip,
                        { borderColor: colors.border },
                        repeat === r && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setRepeat(r)}
                    >
                      <Text style={[styles.repeatText, { color: repeat === r ? '#FFF' : colors.textSecondary }]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveReminderBtn, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1 }]}
                onPress={handleSaveReminder}
              >
                <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                <Text style={[styles.saveReminderText, { color: colors.primary }]}>Save Reminder</Text>
              </TouchableOpacity>
            </>
          )}
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
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  cardChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14,
    padding: 14, marginBottom: 12,
  },
  cardDot: { width: 14, height: 14, borderRadius: 7 },
  cardChipBank: { fontSize: 11, marginBottom: 2 },
  cardChipName: { fontSize: 15, fontWeight: '600' },

  sectionCard: { borderRadius: 18, padding: 18, marginBottom: 12 },
  divider: { height: 1, marginVertical: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 15, fontWeight: '700' },
  daysBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  daysText: { fontSize: 11, fontWeight: '600' },

  totalDueBox: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  totalDueLabel: { fontSize: 12, marginBottom: 6 },
  totalDueValue: { fontSize: 30, fontWeight: '900' },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 54, gap: 8, marginBottom: 12,
  },
  payBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  reminderSub: { fontSize: 12 },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 10, padding: 14, marginBottom: 8,
  },
  fieldRowLabel: { fontSize: 13 },
  fieldRowValue: { fontSize: 14, fontWeight: '600' },

  repeatSection: { marginTop: 4 },
  repeatLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  repeatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  repeatChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  repeatText: { fontSize: 13, fontWeight: '600' },

  saveReminderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, height: 48, gap: 8, marginTop: 14,
  },
  saveReminderText: { fontSize: 15, fontWeight: '700' },
});
