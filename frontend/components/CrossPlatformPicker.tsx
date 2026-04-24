/**
 * Cross-Platform Date & Time Picker for Fintracker
 * Works on Web, iOS, and Android
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  label?: string;
  colors: any;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CrossPlatformPicker({ value, onChange, mode = 'date', label, colors }: DatePickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  const openPicker = () => {
    setTempDate(value);
    setShowModal(true);
  };

  const confirm = () => {
    onChange(tempDate);
    setShowModal(false);
  };

  const displayText = mode === 'time'
    ? format(value, 'hh:mm a')
    : mode === 'datetime'
    ? format(value, 'dd MMM yyyy, hh:mm a')
    : format(value, 'dd MMM yyyy');

  const iconName = mode === 'time' ? 'time-outline' : 'calendar-outline';

  // Helpers
  const setDay = (d: number) => { const n = new Date(tempDate); n.setDate(d); setTempDate(n); };
  const setMonth = (m: number) => { const n = new Date(tempDate); n.setMonth(m); setTempDate(n); };
  const setYear = (y: number) => { const n = new Date(tempDate); n.setFullYear(y); setTempDate(n); };
  const setHour = (h: number) => { const n = new Date(tempDate); n.setHours(h); setTempDate(n); };
  const setMinute = (m: number) => { const n = new Date(tempDate); n.setMinutes(m); setTempDate(n); };

  const daysInMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 2 + i);

  return (
    <>
      <TouchableOpacity style={[st.trigger, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={openPicker} activeOpacity={0.7}>
        <Ionicons name={iconName as any} size={20} color={colors.primary} />
        <Text style={[st.triggerText, { color: colors.text }]}>{displayText}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={st.overlay}>
          <View style={[st.modal, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={st.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={[st.cancelBtn, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[st.modalTitle, { color: colors.text }]}>
                {label || (mode === 'time' ? 'Select Time' : 'Select Date')}
              </Text>
              <TouchableOpacity onPress={confirm}>
                <Text style={[st.doneBtn, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Preview */}
            <View style={[st.preview, { backgroundColor: colors.primary + '12' }]}>
              <Text style={[st.previewText, { color: colors.primary }]}>
                {mode === 'time' ? format(tempDate, 'hh:mm a') : mode === 'datetime' ? format(tempDate, 'EEE, dd MMM yyyy · hh:mm a') : format(tempDate, 'EEEE, dd MMMM yyyy')}
              </Text>
            </View>

            {/* Date Section */}
            {(mode === 'date' || mode === 'datetime') && (
              <>
                {/* Month Selector */}
                <Text style={[st.sectionLabel, { color: colors.textSecondary }]}>Month</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.scrollRow} contentContainerStyle={st.scrollContent}>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity
                      key={m}
                      style={[st.chip, { borderColor: colors.border }, tempDate.getMonth() === i && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setMonth(i)}
                    >
                      <Text style={[st.chipText, { color: colors.text }, tempDate.getMonth() === i && { color: '#FFF' }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Day Selector */}
                <Text style={[st.sectionLabel, { color: colors.textSecondary }]}>Day</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.scrollRow} contentContainerStyle={st.scrollContent}>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[st.dayChip, { borderColor: colors.border }, tempDate.getDate() === d && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setDay(d)}
                    >
                      <Text style={[st.dayText, { color: colors.text }, tempDate.getDate() === d && { color: '#FFF' }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Year Selector */}
                <Text style={[st.sectionLabel, { color: colors.textSecondary }]}>Year</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.scrollRow} contentContainerStyle={st.scrollContent}>
                  {years.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[st.chip, { borderColor: colors.border }, tempDate.getFullYear() === y && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setYear(y)}
                    >
                      <Text style={[st.chipText, { color: colors.text }, tempDate.getFullYear() === y && { color: '#FFF' }]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Time Section */}
            {(mode === 'time' || mode === 'datetime') && (
              <>
                <Text style={[st.sectionLabel, { color: colors.textSecondary }]}>{mode === 'datetime' ? 'Time' : 'Hour'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.scrollRow} contentContainerStyle={st.scrollContent}>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[st.dayChip, { borderColor: colors.border }, tempDate.getHours() === h && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setHour(h)}
                    >
                      <Text style={[st.dayText, { color: colors.text }, tempDate.getHours() === h && { color: '#FFF' }]}>{String(h).padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[st.sectionLabel, { color: colors.textSecondary }]}>Minute</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.scrollRow} contentContainerStyle={st.scrollContent}>
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[st.dayChip, { borderColor: colors.border }, tempDate.getMinutes() === m && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setMinute(m)}
                    >
                      <Text style={[st.dayText, { color: colors.text }, tempDate.getMinutes() === m && { color: '#FFF' }]}>{String(m).padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Quick time presets */}
                <View style={st.presetsRow}>
                  {[
                    { label: '9:00 AM', h: 9, m: 0 },
                    { label: '12:00 PM', h: 12, m: 0 },
                    { label: '3:00 PM', h: 15, m: 0 },
                    { label: '6:00 PM', h: 18, m: 0 },
                    { label: '9:00 PM', h: 21, m: 0 },
                  ].map((p) => (
                    <TouchableOpacity
                      key={p.label}
                      style={[st.presetChip, { borderColor: colors.border }]}
                      onPress={() => { setHour(p.h); setMinute(p.m); }}
                    >
                      <Text style={[st.presetText, { color: colors.primary }]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12,
    borderWidth: 1, gap: 10,
  },
  triggerText: { flex: 1, fontSize: 15, fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36, maxHeight: '80%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  cancelBtn: { fontSize: 15, fontWeight: '500' },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  doneBtn: { fontSize: 15, fontWeight: '700' },
  preview: { marginHorizontal: 20, marginTop: 16, padding: 14, borderRadius: 12, alignItems: 'center' },
  previewText: { fontSize: 15, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginHorizontal: 20, marginTop: 16, marginBottom: 8 },
  scrollRow: { paddingLeft: 20 },
  scrollContent: { paddingRight: 20, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  chipText: { fontSize: 14, fontWeight: '600' },
  dayChip: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '600' },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginTop: 12 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  presetText: { fontSize: 12, fontWeight: '600' },
});
