import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { DUMMY_CARDS } from './_data';

type ReminderType = 'payment' | 'custom';
type Repeat = 'One Time' | 'Daily' | 'Weekly' | 'Monthly';

export default function CreditCardReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();

  const card = DUMMY_CARDS.find((c) => c.card_id === params.id) ?? DUMMY_CARDS[0];

  const [reminderType, setReminderType] = useState<ReminderType>('payment');
  const [reminderDate, setReminderDate] = useState('02 May 2024');
  const [reminderTime, setReminderTime] = useState('09:00 AM');
  const [repeat, setRepeat] = useState<Repeat>('One Time');
  const [hasEndDate, setHasEndDate] = useState(false);

  const REPEATS: Repeat[] = ['One Time', 'Daily', 'Weekly', 'Monthly'];

  const handleSave = () => {
    Alert.alert(
      'Reminder Saved',
      `${reminderType === 'payment' ? 'Payment reminder' : 'Custom reminder'} set for ${reminderDate} at ${reminderTime}.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Set Reminder</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Card chip */}
        {params.id && (
          <View style={[styles.cardChip, { backgroundColor: colors.card }]}>
            <View style={[styles.dot, { backgroundColor: card.color }]} />
            <Text style={[styles.cardChipText, { color: colors.text }]}>
              {card.bank_name} {card.name}  •••• {card.card_number_last4}
            </Text>
          </View>
        )}

        {/* Reminder type */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Reminder Type</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {[
            { key: 'payment' as ReminderType, label: 'Payment Reminder', desc: 'Remind me before payment due date', icon: 'card-outline' },
            { key: 'custom' as ReminderType, label: 'Custom Reminder', desc: 'Set a custom reminder for this card', icon: 'create-outline' },
          ].map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[styles.typeRow, reminderType === type.key && { backgroundColor: colors.primary + '10' }]}
              onPress={() => setReminderType(type.key)}
            >
              <View style={[styles.radio, { borderColor: reminderType === type.key ? colors.primary : colors.border }]}>
                {reminderType === type.key && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeLabel, { color: colors.text }]}>{type.label}</Text>
                <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>{type.desc}</Text>
              </View>
              <Ionicons name={type.icon as any} size={20} color={reminderType === type.key ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Date & Time */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Reminder Date</Text>
          <TouchableOpacity style={[styles.fieldRow, { backgroundColor: colors.background }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.fieldValue, { color: colors.text }]}>{reminderDate}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Reminder Time</Text>
          <TouchableOpacity style={[styles.fieldRow, { backgroundColor: colors.background }]}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={[styles.fieldValue, { color: colors.text }]}>{reminderTime}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Repeat */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Repeat</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {REPEATS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.repeatRow, repeat === r && { backgroundColor: colors.primary + '10' }]}
              onPress={() => setRepeat(r)}
            >
              <View style={[styles.radio, { borderColor: repeat === r ? colors.primary : colors.border }]}>
                {repeat === r && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.repeatLabel, { color: colors.text }]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recurring End Date */}
        {repeat !== 'One Time' && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.endDateHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recurring End Date</Text>
              <Text style={[styles.optionalTag, { color: colors.textSecondary }]}>Optional</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={[styles.fieldRow, { backgroundColor: colors.background }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.fieldValue, { color: hasEndDate ? colors.text : colors.textSecondary }]}>
                {hasEndDate ? '31 Dec 2024' : 'Select Date'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Ionicons name="notifications-outline" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>Save Reminder</Text>
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

  cardChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  cardChipText: { fontSize: 14, fontWeight: '600' },

  sectionCard: { borderRadius: 18, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },

  typeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 12, marginBottom: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  typeLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  typeDesc: { fontSize: 12 },

  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12,
    padding: 14, marginBottom: 12,
  },
  fieldValue: { flex: 1, fontSize: 14, fontWeight: '500' },

  repeatRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 12, marginBottom: 8 },
  repeatLabel: { fontSize: 14, fontWeight: '500' },

  endDateHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalTag: { fontSize: 11, fontWeight: '500' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 54, gap: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
