import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import { DUMMY_SAVINGS_GOALS } from './_data';

const GOAL_ICONS = [
  { icon: 'home-outline', label: 'Home' },
  { icon: 'car-outline', label: 'Vehicle' },
  { icon: 'airplane-outline', label: 'Travel' },
  { icon: 'laptop-outline', label: 'Gadget' },
  { icon: 'school-outline', label: 'Education' },
  { icon: 'medkit-outline', label: 'Health' },
  { icon: 'shield-outline', label: 'Emergency' },
  { icon: 'diamond-outline', label: 'Other' },
];

export default function SetSavingsGoalScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [targetDate, setTargetDate] = useState('31 Dec 2024');
  const [selectedIcon, setSelectedIcon] = useState('diamond-outline');
  const [editGoalId, setEditGoalId] = useState<string | null>(null);

  const target = parseFloat(targetAmount) || 0;
  const saved = parseFloat(savedAmount) || 0;
  const pct = target > 0 ? Math.round((saved / target) * 100) : 0;
  const remaining = target - saved;

  const handleSave = () => {
    if (!goalName.trim()) { Alert.alert('Required', 'Please enter a goal name'); return; }
    if (!targetAmount || target <= 0) { Alert.alert('Required', 'Please enter a valid target amount'); return; }
    Alert.alert(
      'Goal Saved',
      `"${goalName.trim()}" savings goal set for ${formatINR(target)}.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  const openEdit = (g: typeof DUMMY_SAVINGS_GOALS[0]) => {
    setEditGoalId(g.goal_id);
    setGoalName(g.name);
    setTargetAmount(g.target_amount.toString());
    setSavedAmount(g.current_amount.toString());
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Savings Goals</Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Existing Goals */}
          {DUMMY_SAVINGS_GOALS.map((g) => {
            const gPct = Math.round((g.current_amount / g.target_amount) * 100);
            const gColor = gPct >= 100 ? '#00C48C' : gPct >= 70 ? '#FFB300' : '#448AFF';
            return (
              <View key={g.goal_id} style={[styles.goalCard, { backgroundColor: colors.card }]}>
                <View style={styles.goalTop}>
                  <View style={[styles.goalIcon, { backgroundColor: gColor + '20' }]}>
                    <Ionicons name="flag-outline" size={20} color={gColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalName, { color: colors.text }]}>{g.name}</Text>
                    <Text style={[styles.goalMeta, { color: colors.textSecondary }]}>
                      Target: {g.target_date} · {gPct}% complete
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => openEdit(g)} style={styles.editBtn}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.goalAmts}>
                  <Text style={[styles.goalSaved, { color: gColor }]}>{formatINR(g.current_amount)}</Text>
                  <Text style={[styles.goalSep, { color: colors.textSecondary }]}> / </Text>
                  <Text style={[styles.goalTarget, { color: colors.text }]}>{formatINR(g.target_amount)}</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.barFill, { width: `${Math.min(gPct, 100)}%`, backgroundColor: gColor }]} />
                </View>
              </View>
            );
          })}

          {/* New / Edit Goal Form */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {editGoalId ? 'Edit Goal' : 'New Savings Goal'}
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Icon picker */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Goal Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={styles.iconRow}>
                {GOAL_ICONS.map((gi) => (
                  <TouchableOpacity
                    key={gi.icon}
                    style={[styles.iconChip, { borderColor: colors.border }, selectedIcon === gi.icon && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                    onPress={() => setSelectedIcon(gi.icon)}
                  >
                    <Ionicons name={gi.icon as any} size={20} color={selectedIcon === gi.icon ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.iconChipLabel, { color: selectedIcon === gi.icon ? colors.primary : colors.textSecondary }]}>{gi.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Goal Name */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Goal Name</Text>
            <View style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                value={goalName}
                onChangeText={setGoalName}
                placeholder="e.g. Emergency Fund, Dream Vacation"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Target Amount */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Target Amount</Text>
            <View style={[styles.amountRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.rupee, { color: colors.primary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Amount Saved */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Amount Already Saved</Text>
            <View style={[styles.amountRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.rupee, { color: colors.primary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={savedAmount}
                onChangeText={setSavedAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Target Date */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Target Date</Text>
            <TouchableOpacity style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.fieldInput, { color: colors.text }]}>{targetDate}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Progress preview */}
            {target > 0 && (
              <View style={[styles.progressPreview, { backgroundColor: colors.background }]}>
                <View style={styles.progressPreviewTop}>
                  <Text style={[styles.progressPreviewLabel, { color: colors.textSecondary }]}>Progress Preview</Text>
                  <Text style={[styles.progressPreviewPct, { color: pct >= 100 ? '#00C48C' : '#448AFF' }]}>{pct}%</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 100 ? '#00C48C' : '#448AFF' }]} />
                </View>
                <Text style={[styles.progressRemaining, { color: colors.textSecondary }]}>
                  {remaining > 0 ? `${formatINR(remaining)} remaining` : 'Goal reached! 🎉'}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Ionicons name="flag-outline" size={20} color="#FFF" />
            <Text style={styles.saveBtnText}>{editGoalId ? 'Update Goal' : 'Save Goal'}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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

  goalCard: { borderRadius: 18, padding: 16, marginBottom: 10 },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  goalIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  goalName: { fontSize: 15, fontWeight: '700' },
  goalMeta: { fontSize: 11, marginTop: 2 },
  editBtn: { padding: 6 },
  goalAmts: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  goalSaved: { fontSize: 18, fontWeight: '800' },
  goalSep: { fontSize: 14 },
  goalTarget: { fontSize: 14, fontWeight: '600' },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  sectionCard: { borderRadius: 18, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },

  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 8, marginTop: 4 },
  iconRow: { flexDirection: 'row', gap: 8 },
  iconChip: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 4 },
  iconChipLabel: { fontSize: 10, fontWeight: '600' },

  fieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, height: 50, marginBottom: 4,
  },
  fieldInput: { flex: 1, fontSize: 14 },

  amountRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, height: 50, marginBottom: 4,
  },
  rupee: { fontSize: 20, fontWeight: '800', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 18, fontWeight: '600' },

  progressPreview: { borderRadius: 12, padding: 14, marginTop: 14, gap: 8 },
  progressPreviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressPreviewLabel: { fontSize: 12, fontWeight: '500' },
  progressPreviewPct: { fontSize: 14, fontWeight: '700' },
  progressRemaining: { fontSize: 11, marginTop: 4 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 54, gap: 8, marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
