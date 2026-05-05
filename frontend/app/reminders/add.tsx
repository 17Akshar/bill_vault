/**
 * Add Reminder — redesigned dark UI matching user's spec.
 *
 * Sections:
 *   • Reminder Name (required)
 *   • Notes (optional)
 *   • URL (optional)
 *   • Date & Time (required) — inline calendar + time picker
 *   • Recurring — Daily / Monthly / Quarterly / Yearly
 *   • Repeat On — only when recurrence != 'none'
 *   • Ends — No end date | End on (date) | After N occurrences
 *   • Reminder Preview — humanised summary of the rule
 *
 * Backend POST /api/reminders accepts {title, description, reminder_date,
 * reminder_type='custom', is_recurring, recurrence}. We persist the full rule
 * (interval, ends-on, max-occurrences, url, notes) in `description` as JSON
 * markup if needed — but for V1 we send the standard fields and stash the
 * advanced rule in `description` for round-tripping.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../utils/api';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';
import { scheduleReminderNotifications } from '../../utils/reminderNotifications';

type Recurrence = 'none' | 'daily' | 'monthly' | 'quarterly' | 'yearly';
type EndType = 'never' | 'on' | 'after';

const RECURRENCE_TABS: { key: Recurrence; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly', label: 'Yearly' },
];

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

export default function AddReminderScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [dateTime, setDateTime] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [recurrence, setRecurrence] = useState<Recurrence>('monthly');
  const [endType, setEndType] = useState<EndType>('never');
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  });
  const [occurrences, setOccurrences] = useState<number>(10);
  const [saving, setSaving] = useState(false);

  // Reminder Preview text
  const previewText = useMemo(() => {
    const time = fmtTime(dateTime);
    if (recurrence === 'none') {
      return `One-time on ${fmtDate(dateTime)} at ${time}`;
    }
    const day = dateTime.getDate();
    if (recurrence === 'daily') return `Daily at ${time}`;
    if (recurrence === 'monthly') return `Monthly on ${ordinal(day)} at ${time}`;
    if (recurrence === 'quarterly') return `Quarterly starting ${fmtDate(dateTime)} at ${time}`;
    return `Yearly on ${dateTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} at ${time}`;
  }, [dateTime, recurrence]);

  const nextReminderText = useMemo(() => {
    const next = new Date(dateTime);
    if (next <= new Date()) {
      // bump to next occurrence quickly for non-none recurrence
      if (recurrence === 'daily') next.setDate(next.getDate() + 1);
      if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
      if (recurrence === 'quarterly') next.setMonth(next.getMonth() + 3);
      if (recurrence === 'yearly') next.setFullYear(next.getFullYear() + 1);
    }
    return `Next reminder: ${next.toLocaleDateString('en-IN', {
      weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
    })} at ${fmtTime(next)}`;
  }, [dateTime, recurrence]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a reminder name');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/reminders', {
        title: title.trim(),
        description: notes.trim() || null,
        reminder_date: dateTime.toISOString(),
        reminder_type: 'custom',
        is_recurring: recurrence !== 'none',
        recurrence,
        // Structured advanced rule
        url: url.trim() || null,
        end_type: endType,
        end_date: endType === 'on' ? endDate.toISOString() : null,
        max_occurrences: endType === 'after' ? occurrences : null,
      });
      // Best-effort schedule of local OS notifications
      scheduleReminderNotifications(res?.data).catch(() => {});
      if (router.canGoBack()) router.back();
      else router.replace('/reminders/all' as any);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity testID="add-reminder-back" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Reminder</Text>
          <TouchableOpacity testID="add-reminder-save-top" onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#7C4DFF" />
            ) : (
              <Text style={{ color: '#7C4DFF', fontWeight: '700', fontSize: 16 }}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* Name */}
          <Card>
            <Label icon="bookmark-outline" required>Reminder Name</Label>
            <TextInput
              testID="add-reminder-name"
              style={styles.input}
              placeholder="Enter reminder name"
              placeholderTextColor="#A0A3BD"
              value={title}
              onChangeText={setTitle}
            />
          </Card>

          {/* Notes */}
          <Card>
            <Label icon="document-text-outline">Notes (Optional)</Label>
            <TextInput
              testID="add-reminder-notes"
              style={[styles.input, { minHeight: 60 }]}
              placeholder="Add any notes"
              placeholderTextColor="#A0A3BD"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </Card>

          {/* URL */}
          <Card>
            <Label icon="link-outline">URL (Optional)</Label>
            <TextInput
              testID="add-reminder-url"
              style={styles.input}
              placeholder="https://example.com"
              placeholderTextColor="#A0A3BD"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </Card>

          {/* Date & Time */}
          <Card>
            <Label icon="calendar-outline" required>Date &amp; Time</Label>
            <CrossPlatformPicker
              value={dateTime}
              onChange={setDateTime}
              mode="date"
              label="Select Date"
              colors={pickerColors}
            />
            <View style={{ height: 8 }} />
            <CrossPlatformPicker
              value={dateTime}
              onChange={setDateTime}
              mode="time"
              label="Select Time"
              colors={pickerColors}
            />
          </Card>

          {/* Recurring */}
          <Card>
            <Label icon="repeat-outline">Recurring</Label>
            <View style={styles.recurringRow}>
              {RECURRENCE_TABS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  testID={`recurrence-${r.key}`}
                  style={[
                    styles.recurringBtn,
                    recurrence === r.key && { backgroundColor: '#7C4DFF' },
                  ]}
                  onPress={() => setRecurrence(r.key)}
                >
                  <Text style={[styles.recurringText, recurrence === r.key && { color: '#FFFFFF', fontWeight: '700' }]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                testID="recurrence-none"
                style={[
                  styles.recurringBtn,
                  recurrence === 'none' && { backgroundColor: '#7C4DFF' },
                ]}
                onPress={() => setRecurrence('none')}
              >
                <Text style={[styles.recurringText, recurrence === 'none' && { color: '#FFFFFF', fontWeight: '700' }]}>
                  One-time
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Ends */}
          {recurrence !== 'none' && (
            <Card>
              <Label icon="stop-circle-outline">Ends</Label>
              <RadioRow
                testID="ends-never"
                label="No end date"
                selected={endType === 'never'}
                onPress={() => setEndType('never')}
              />
              <RadioRow
                testID="ends-on"
                label={`End on ${fmtDate(endDate)}`}
                selected={endType === 'on'}
                onPress={() => setEndType('on')}
              />
              {endType === 'on' && (
                <View style={{ marginVertical: 8 }}>
                  <CrossPlatformPicker
                    value={endDate}
                    onChange={setEndDate}
                    mode="date"
                    label="End Date"
                    colors={pickerColors}
                  />
                </View>
              )}
              <RadioRow
                testID="ends-after"
                label={`After`}
                selected={endType === 'after'}
                onPress={() => setEndType('after')}
                rightElement={
                  endType === 'after' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setOccurrences(Math.max(1, occurrences - 1))}
                        style={styles.stepBtn}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 18 }}>−</Text>
                      </TouchableOpacity>
                      <Text style={{ color: '#FFFFFF', minWidth: 28, textAlign: 'center', fontWeight: '600' }}>
                        {occurrences}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setOccurrences(occurrences + 1)}
                        style={styles.stepBtn}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 18 }}>+</Text>
                      </TouchableOpacity>
                      <Text style={{ color: '#A0A3BD', fontSize: 12 }}>occurrences</Text>
                    </View>
                  ) : (
                    <Text style={{ color: '#A0A3BD', fontSize: 13 }}>{occurrences} occurrences</Text>
                  )
                }
              />
            </Card>
          )}

          {/* Preview */}
          <View style={styles.previewCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="notifications-outline" size={20} color="#7C4DFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Reminder Preview</Text>
            </View>
            <Text style={styles.previewMain}>{previewText}</Text>
            <Text style={styles.previewSub}>{nextReminderText}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* Sub-components */

const pickerColors = {
  text: '#FFFFFF', card: '#12123A', border: '#1F1F4D',
  background: '#08082A', primary: '#7C4DFF', textSecondary: '#A0A3BD',
} as any;

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Label({
  children, icon, required,
}: { children: React.ReactNode; icon: string; required?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Ionicons name={icon as any} size={16} color="#7C4DFF" />
      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
        {children}
        {required && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>
    </View>
  );
}

function RadioRow({
  testID, label, selected, onPress, rightElement,
}: { testID: string; label: string; selected: boolean; onPress: () => void; rightElement?: React.ReactNode }) {
  return (
    <TouchableOpacity testID={testID} onPress={onPress} style={styles.radioRow}>
      <View style={[styles.radioOuter, selected && { borderColor: '#7C4DFF' }]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={{ color: '#FFFFFF', flex: 1, fontSize: 14 }}>{label}</Text>
      {rightElement}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08082A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  card: {
    backgroundColor: '#12123A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 15,
    backgroundColor: '#0E0E2E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recurringRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recurringBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#1B1845',
    minWidth: 80,
    alignItems: 'center',
  },
  recurringText: { color: '#FFFFFF', fontSize: 13 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#A0A3BD',
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C4DFF',
  },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1B1845',
    alignItems: 'center', justifyContent: 'center',
  },
  previewCard: {
    backgroundColor: '#1B1845',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    gap: 8,
  },
  previewMain: { color: '#7C4DFF', fontSize: 15, fontWeight: '700' },
  previewSub: { color: '#A0A3BD', fontSize: 12 },
});
