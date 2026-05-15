import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { DUMMY_REMINDERS, DUMMY_PROPERTIES } from './_data';

const REMINDER_TYPES = [
  { key: 'rent_due', label: 'Rent Due', icon: 'cash-outline', color: '#FF5252' },
  { key: 'tax', label: 'Property Tax', icon: 'document-text-outline', color: '#FF9100' },
  { key: 'maintenance', label: 'Maintenance', icon: 'construct-outline', color: '#448AFF' },
  { key: 'agreement_renewal', label: 'Agreement Renewal', icon: 'document-outline', color: '#7C4DFF' },
  { key: 'utility', label: 'Utility Bill', icon: 'flash-outline', color: '#00BCD4' },
];

const REPEAT_OPTIONS = [
  { key: 'one_time', label: 'One Time' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly', label: 'Yearly' },
];

const URGENCY_COLOR = (days: number) => days <= 3 ? '#FF5252' : days <= 7 ? '#FFB300' : '#00C48C';

export default function PropertyReminderScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [selectedType, setSelectedType] = useState('rent_due');
  const [selectedProperty, setSelectedProperty] = useState(DUMMY_PROPERTIES[0].id);
  const [reminderDate, setReminderDate] = useState('05 Jun 2024');
  const [reminderTime, setReminderTime] = useState('09:00 AM');
  const [repeat, setRepeat] = useState('monthly');
  const [showForm, setShowForm] = useState(false);

  const rt = REMINDER_TYPES.find(t => t.key === selectedType)!;
  const property = DUMMY_PROPERTIES.find(p => p.id === selectedProperty)!;

  const handleSave = () => {
    Alert.alert(
      'Reminder Set',
      `${rt.label} reminder for ${property.name} set for ${reminderDate}.`,
      [{ text: 'OK', onPress: () => setShowForm(false) }],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Property Reminders</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.iconBtn}>
          <Ionicons name={showForm ? 'close' : 'add'} size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Existing Reminders */}
        {!showForm && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>All Reminders</Text>
            {DUMMY_REMINDERS.map((r) => {
              const rType = REMINDER_TYPES.find(t => t.key === r.type);
              const prop = DUMMY_PROPERTIES.find(p => p.id === r.propertyId);
              const uc = URGENCY_COLOR(r.daysLeft);
              return (
                <View key={r.id} style={[styles.reminderCard, { backgroundColor: colors.card }]}>
                  <View style={styles.reminderTop}>
                    <View style={[styles.reminderIcon, { backgroundColor: (rType?.color || '#607D8B') + '20' }]}>
                      <Ionicons name={rType?.icon as any || 'notifications-outline'} size={18} color={rType?.color || '#607D8B'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reminderTitle, { color: colors.text }]}>{r.title}</Text>
                      <Text style={[styles.reminderProp, { color: colors.textSecondary }]}>
                        {prop?.name} · {r.dueDate}
                      </Text>
                    </View>
                    <View style={[styles.daysBadge, { backgroundColor: uc + '20' }]}>
                      <Text style={[styles.daysText, { color: uc }]}>
                        {r.daysLeft === 0 ? 'Today' : `${r.daysLeft}d left`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reminderMeta}>
                    <View style={[styles.repeatChip, { backgroundColor: colors.background }]}>
                      <Ionicons name="repeat-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.repeatLabel, { color: colors.textSecondary }]}>
                        {REPEAT_OPTIONS.find(o => o.key === r.repeat)?.label || r.repeat}
                      </Text>
                    </View>
                    <View style={styles.reminderActions}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="create-outline" size={14} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF525215' }]}>
                        <Ionicons name="trash-outline" size={14} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowForm(true)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addBtnText}>Add New Reminder</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Add Reminder Form */}
        {showForm && (
          <>
            {/* Reminder Type */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Reminder Type</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {REMINDER_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeRow, selectedType === t.key && { backgroundColor: t.color + '10' }]}
                  onPress={() => setSelectedType(t.key)}
                >
                  <View style={[styles.radio, { borderColor: selectedType === t.key ? t.color : colors.border }]}>
                    {selectedType === t.key && <View style={[styles.radioDot, { backgroundColor: t.color }]} />}
                  </View>
                  <View style={[styles.typeIconBox, { backgroundColor: t.color + '20' }]}>
                    <Ionicons name={t.icon as any} size={16} color={t.color} />
                  </View>
                  <Text style={[styles.typeLabel, { color: colors.text }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Property Selector */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Property</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {DUMMY_PROPERTIES.filter(p => p.status !== 'vacant').map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.propRow, selectedProperty === p.id && { backgroundColor: p.color + '10' }]}
                  onPress={() => setSelectedProperty(p.id)}
                >
                  <View style={[styles.radio, { borderColor: selectedProperty === p.id ? p.color : colors.border }]}>
                    {selectedProperty === p.id && <View style={[styles.radioDot, { backgroundColor: p.color }]} />}
                  </View>
                  <View style={[styles.propIcon, { backgroundColor: p.color + '20' }]}>
                    <Ionicons name={p.icon as any} size={14} color={p.color} />
                  </View>
                  <View>
                    <Text style={[styles.propName, { color: colors.text }]}>{p.name}</Text>
                    <Text style={[styles.propCity, { color: colors.textSecondary }]}>{p.city}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Schedule */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date</Text>
              <TouchableOpacity style={[styles.fieldRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.fieldValue, { color: colors.text }]}>{reminderDate}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Time</Text>
              <TouchableOpacity style={[styles.fieldRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.fieldValue, { color: colors.text }]}>{reminderTime}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Repeat */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Repeat</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.repeatRow}>
                {REPEAT_OPTIONS.map((o) => (
                  <TouchableOpacity
                    key={o.key}
                    style={[styles.repeatChipBtn, { borderColor: colors.border }, repeat === o.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setRepeat(o.key)}
                  >
                    <Text style={[styles.repeatBtnText, { color: repeat === o.key ? '#FFF' : colors.textSecondary }]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Ionicons name="notifications-outline" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Reminder</Text>
            </TouchableOpacity>
          </>
        )}

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

  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  reminderCard: { borderRadius: 18, padding: 16, marginBottom: 10 },
  reminderTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  reminderIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  reminderProp: { fontSize: 11 },
  daysBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  daysText: { fontSize: 12, fontWeight: '700' },
  reminderMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  repeatChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  repeatLabel: { fontSize: 11, fontWeight: '500' },
  reminderActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 52, gap: 8, marginTop: 4,
  },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  sectionCard: { borderRadius: 18, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 6 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  typeIconBox: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 14, fontWeight: '600' },

  propRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, marginBottom: 6 },
  propIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  propName: { fontSize: 13, fontWeight: '600' },
  propCity: { fontSize: 11 },

  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6, marginTop: 4 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12,
    padding: 14, marginBottom: 4,
  },
  fieldValue: { flex: 1, fontSize: 14, fontWeight: '500' },

  repeatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  repeatChipBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  repeatBtnText: { fontSize: 13, fontWeight: '600' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 54, gap: 8, marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
