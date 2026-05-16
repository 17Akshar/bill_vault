/**
 * Reusable Family Member Selector Component
 * Used for filtering and assigning data to family members
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

interface FamilyMember {
  family_member_id: string;
  name: string;
  role: string;
}

const ROLE_ICONS: Record<string, string> = {
  self: 'person',
  spouse: 'heart',
  child: 'happy',
  parent: 'people',
  other: 'person-outline',
};

const ROLE_COLORS: Record<string, string> = {
  self: '#5B2FBF',
  spouse: '#EC4899',
  child: '#22C55E',
  parent: '#3B82F6',
  other: '#8E8EA0',
};

interface FilterProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showAll?: boolean;
  colors: any;
  label?: string;
}

export function FamilyMemberFilter({ selectedId, onSelect, showAll = true, colors, label }: FilterProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/family-members');
        if (!cancelled) setMembers(res.data || []);
      } catch (e) { console.error(e); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (members.length === 0) return null;

  return (
    <View style={st.container}>
      {label && <Text style={[st.label, { color: colors.text }]}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.scrollContent}>
        {showAll && (
          <TouchableOpacity
            style={[st.chip, { borderColor: colors.border }, !selectedId && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => onSelect(null)}
          >
            <Ionicons name="people" size={14} color={!selectedId ? '#FFF' : colors.textSecondary} />
            <Text style={[st.chipText, { color: !selectedId ? '#FFF' : colors.textSecondary }]}>All</Text>
          </TouchableOpacity>
        )}
        {members.map((m) => {
          const isActive = selectedId === m.family_member_id;
          const color = ROLE_COLORS[m.role] || '#5B2FBF';
          return (
            <TouchableOpacity
              key={m.family_member_id}
              style={[st.chip, { borderColor: colors.border }, isActive && { backgroundColor: color, borderColor: color }]}
              onPress={() => onSelect(isActive && showAll ? null : m.family_member_id)}
            >
              <Ionicons name={(ROLE_ICONS[m.role] || 'person-outline') as any} size={14} color={isActive ? '#FFF' : color} />
              <Text style={[st.chipText, { color: isActive ? '#FFF' : colors.text }]}>{m.name}</Text>
              <Text style={[st.chipRole, { color: isActive ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface PickerProps {
  selectedId: string | null | undefined;
  onSelect: (id: string | null) => void;
  colors: any;
  label?: string;
}

export function FamilyMemberPicker({ selectedId, onSelect, colors, label }: PickerProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/family-members');
        if (!cancelled) setMembers(res.data || []);
      } catch (e) { console.error(e); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (members.length === 0) return null;

  return (
    <View style={st.pickerContainer}>
      <Text style={[st.label, { color: colors.text }]}>{label || 'For whom?'}</Text>
      <View style={st.pickerGrid}>
        <TouchableOpacity
          style={[st.pickerChip, { borderColor: colors.border, backgroundColor: colors.card }, !selectedId && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
          onPress={() => onSelect(null)}
        >
          <Ionicons name="person-outline" size={16} color={!selectedId ? colors.primary : colors.textSecondary} />
          <Text style={[st.pickerText, { color: !selectedId ? colors.primary : colors.textSecondary }]}>General</Text>
        </TouchableOpacity>
        {members.map((m) => {
          const isActive = selectedId === m.family_member_id;
          const color = ROLE_COLORS[m.role] || '#5B2FBF';
          return (
            <TouchableOpacity
              key={m.family_member_id}
              style={[st.pickerChip, { borderColor: colors.border, backgroundColor: colors.card }, isActive && { borderColor: color, backgroundColor: color + '15' }]}
              onPress={() => onSelect(m.family_member_id)}
            >
              <Ionicons name={(ROLE_ICONS[m.role] || 'person-outline') as any} size={16} color={isActive ? color : colors.textSecondary} />
              <Text style={[st.pickerText, { color: isActive ? color : colors.text }]}>{m.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, marginBottom: 8 },
  scrollContent: { paddingHorizontal: 20, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipRole: { fontSize: 10, fontWeight: '500' },
  pickerContainer: { marginBottom: 12 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  pickerText: { fontSize: 13, fontWeight: '600' },
});
