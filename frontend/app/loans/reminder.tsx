/**
 * EMIReminderScreen
 * Set a reminder for a loan EMI payment.
 * Matches the reference design and reuses the existing reminders system.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';
import { scheduleReminderNotifications } from '../../utils/reminderNotifications';

type RepeatType = 'one_time' | 'daily' | 'weekly' | 'monthly';
type ReminderType = 'payment' | 'custom';

const REPEAT_OPTIONS: { key: RepeatType; label: string }[] = [
  { key: 'one_time', label: 'One Time' },
  { key: 'daily',    label: 'Daily' },
  { key: 'weekly',   label: 'Weekly' },
  { key: 'monthly',  label: 'Monthly' },
];

function RadioRow({
  label, selected, onPress, colors,
}: { label: string; selected: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity style={s.radioRow} onPress={onPress}>
      <View style={[s.radioOuter, { borderColor: selected ? '#6C47FF' : colors.textSecondary }]}>
        {selected && <View style={s.radioInner} />}
      </View>
      <Text style={[s.radioLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function EMIReminderScreen() {
  const router = useRouter();
  const { loan_id, loan_name } = useLocalSearchParams<{ loan_id: string; loan_name: string }>();
  const { colors } = useTheme();

  const [reminderType, setReminderType] = useState<ReminderType>('payment');
  const [reminderDate, setReminderDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d;
  });
  const [reminderTime, setReminderTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [repeat, setRepeat] = useState<RepeatType>('monthly');
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const combinedDateTime = (() => {
    const d = new Date(reminderDate);
    d.setHours(reminderTime.getHours(), reminderTime.getMinutes(), 0, 0);
    return d;
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      const title = reminderType === 'payment'
        ? `EMI Due — ${loan_name || 'Loan'}`
        : `Reminder — ${loan_name || 'Loan'}`;

      const recurrence = repeat === 'one_time' ? 'none' : repeat;

      const res = await api.post('/reminders', {
        title,
        description: `EMI reminder for ${loan_name || 'your loan'}`,
        reminder_date: combinedDateTime.toISOString(),
        reminder_type: 'loan_emi',
        is_recurring: repeat !== 'one_time',
        recurrence,
        end_type: endDate ? 'on' : 'never',
        end_date: endDate ? endDate.toISOString() : null,
      });

      scheduleReminderNotifications(res?.data).catch(() => {});

      Alert.alert('Reminder Set', 'Your EMI reminder has been saved successfully.', [
        { text: 'OK', onPress: () => { if (router.canGoBack()) router.back(); } },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity testID="reminder-back" onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Set Reminder</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loan_name && (
          <View style={[s.loanBadge, { backgroundColor: '#6C47FF14' }]}>
            <Ionicons name="home-outline" size={16} color="#6C47FF" />
            <Text style={s.loanBadgeText}>{loan_name}</Text>
          </View>
        )}

        {/* Reminder Type */}
        <View style={[s.card, { backgroundColor: colors.card }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Reminder Type</Text>
          <RadioRow
            label="Payment Reminder"
            selected={reminderType === 'payment'}
            onPress={() => setReminderType('payment')}
            colors={colors}
          />
          <RadioRow
            label="Custom Reminder"
            selected={reminderType === 'custom'}
            onPress={() => setReminderType('custom')}
            colors={colors}
          />
        </View>

        {/* Date & Time */}
        <View style={[s.card, { backgroundColor: colors.card }]}>
          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Reminder Date</Text>
              <CrossPlatformPicker
                value={reminderDate} onChange={setReminderDate}
                mode="date" label="Select Date" colors={colors}
              />
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Reminder Time</Text>
            <CrossPlatformPicker
              value={reminderTime} onChange={setReminderTime}
              mode="time" label="Select Time" colors={colors}
            />
          </View>
        </View>

        {/* Repeat */}
        <View style={[s.card, { backgroundColor: colors.card }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Repeat</Text>
          {REPEAT_OPTIONS.map(opt => (
            <RadioRow
              key={opt.key}
              label={opt.label}
              selected={repeat === opt.key}
              onPress={() => setRepeat(opt.key)}
              colors={colors}
            />
          ))}
        </View>

        {/* Recurring End */}
        {repeat !== 'one_time' && (
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Recurring End (Optional)</Text>
            <TouchableOpacity
              style={[s.clearBtn, { borderColor: colors.border }]}
              onPress={() => setEndDate(endDate ? null : (() => {
                const d = new Date();
                d.setFullYear(d.getFullYear() + 1);
                return d;
              })())}
            >
              <Text style={[s.clearBtnText, { color: colors.text }]}>
                {endDate ? 'Clear End Date' : 'Set End Date'}
              </Text>
            </TouchableOpacity>
            {endDate && (
              <View style={{ marginTop: 12 }}>
                <CrossPlatformPicker
                  value={endDate} onChange={setEndDate}
                  mode="date" label="End Date" colors={colors}
                />
              </View>
            )}
            {!endDate && (
              <Text style={[s.noEndText, { color: colors.textSecondary }]}>
                No end date — reminder repeats indefinitely
              </Text>
            )}
          </View>
        )}

        {/* Preview */}
        <View style={[s.previewCard, { backgroundColor: '#6C47FF14', borderColor: '#6C47FF30' }]}>
          <Ionicons name="notifications-outline" size={20} color="#6C47FF" />
          <View style={{ flex: 1 }}>
            <Text style={s.previewTitle}>
              {reminderType === 'payment' ? `EMI Due — ${loan_name || 'Loan'}` : `Reminder — ${loan_name || 'Loan'}`}
            </Text>
            <Text style={s.previewSub}>
              {combinedDateTime.toLocaleDateString('en-IN', {
                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
              })}{' '}
              at{' '}
              {combinedDateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              {repeat !== 'one_time' && ` · Repeats ${repeat}`}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          testID="save-reminder-btn"
          style={[s.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={s.saveBtnText}>Save Reminder</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 120 },

  loanBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10, marginBottom: 12,
  },
  loanBadgeText: { color: '#6C47FF', fontWeight: '600', fontSize: 14 },

  card: { borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6C47FF' },
  radioLabel: { fontSize: 14 },

  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 12, marginBottom: 6 },

  clearBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start',
  },
  clearBtnText: { fontSize: 14, fontWeight: '500' },
  noEndText: { fontSize: 12, marginTop: 8 },

  previewCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  previewTitle: { color: '#6C47FF', fontWeight: '700', fontSize: 14, marginBottom: 3 },
  previewSub: { color: '#6C47FF99', fontSize: 12, lineHeight: 17 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, borderTopWidth: 1,
  },
  saveBtn: {
    backgroundColor: '#6C47FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
