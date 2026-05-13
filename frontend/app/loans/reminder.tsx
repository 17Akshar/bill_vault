/**
 * EMIReminderScreen
 * --------------------------------
 * Set / edit / delete an EMI reminder for a loan.
 * Matches the provided reference design exactly.
 *
 * Reuses (does NOT modify):
 *  - Existing /api/reminders module (POST / PUT / DELETE)
 *  - CrossPlatformPicker for date + time
 *  - scheduleReminderNotifications / cancelReminderNotifications
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';
import {
  scheduleReminderNotifications,
  cancelReminderNotifications,
} from '../../utils/reminderNotifications';

// ─── Types ────────────────────────────────────────────────────────────────────
type ReminderType = 'payment' | 'custom';
type RepeatType   = 'one_time' | 'daily' | 'weekly' | 'monthly';

const REMINDER_TYPES: { key: ReminderType; label: string }[] = [
  { key: 'payment', label: 'Payment Reminder' },
  { key: 'custom',  label: 'Custom Reminder' },
];

const REPEAT_OPTIONS: { key: RepeatType; label: string }[] = [
  { key: 'one_time', label: 'One Time' },
  { key: 'daily',    label: 'Daily' },
  { key: 'weekly',   label: 'Weekly' },
  { key: 'monthly',  label: 'Monthly' },
];

// ─── Radio row (matches the reference exactly) ───────────────────────────────
function RadioRow({
  label, selected, onPress, colors, testID,
}: { label: string; selected: boolean; onPress: () => void; colors: any; testID?: string }) {
  return (
    <TouchableOpacity
      testID={testID}
      style={rr.row}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[rr.outer, { borderColor: selected ? '#5B4FFF' : '#9CA3AF' }]}>
        {selected && <View style={rr.inner} />}
      </View>
      <Text style={[rr.label, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const rr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  outer: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#5B4FFF' },
  label: { fontSize: 15, fontWeight: '500' },
});

// ─── Custom delete-confirm modal ──────────────────────────────────────────────
function DeleteConfirm({
  visible, colors, deleting, onCancel, onConfirm,
}: { visible: boolean; colors: any; deleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !deleting && onCancel()}>
      <View style={dc.overlay}>
        <View style={[dc.box, { backgroundColor: colors.card }]}>
          <View style={dc.iconCircle}>
            <Ionicons name="trash" size={26} color="#EF4444" />
          </View>
          <Text style={[dc.title, { color: colors.text }]}>Delete Reminder?</Text>
          <Text style={[dc.body, { color: colors.textSecondary }]}>
            This reminder will be permanently removed. You can always set a new one later.
          </Text>
          <View style={dc.actions}>
            <TouchableOpacity
              testID="reminder-delete-cancel"
              style={[dc.btn, { borderColor: colors.border, borderWidth: 1 }]}
              onPress={onCancel}
              disabled={deleting}
            >
              <Text style={[dc.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="reminder-delete-confirm"
              style={[dc.btn, dc.confirmBtn, deleting && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={[dc.btnText, { color: '#FFF' }]}>Delete</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const dc = StyleSheet.create({
  overlay:    { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center', padding:24 },
  box:        { width:'100%', maxWidth:340, borderRadius:20, padding:24, alignItems:'center' },
  iconCircle: { width:60, height:60, borderRadius:30, backgroundColor:'#FEE2E2', alignItems:'center', justifyContent:'center', marginBottom:14 },
  title:      { fontSize:18, fontWeight:'800', marginBottom:6 },
  body:       { fontSize:13, textAlign:'center', lineHeight:19, marginBottom:18 },
  actions:    { flexDirection:'row', gap:10, width:'100%' },
  btn:        { flex:1, paddingVertical:13, borderRadius:11, alignItems:'center' },
  confirmBtn: { backgroundColor:'#EF4444' },
  btnText:    { fontSize:14, fontWeight:'700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EMIReminderScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { loan_id, loan_name, reminder_id } = useLocalSearchParams<{
    loan_id?: string; loan_name?: string; reminder_id?: string;
  }>();
  const isEdit = !!reminder_id;

  // ── form state ──
  const [reminderType,  setReminderType]  = useState<ReminderType>('payment');
  const [reminderDate,  setReminderDate]  = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() + 3); return d;
  });
  const [reminderTime,  setReminderTime]  = useState<Date>(() => {
    const d = new Date(); d.setHours(9, 0, 0, 0); return d;
  });
  const [repeat,    setRepeat]    = useState<RepeatType>('one_time');
  const [endDate,   setEndDate]   = useState<Date | null>(null);

  // ── ui state ──
  const [loading,   setLoading]   = useState(isEdit);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Load existing reminder in edit mode ──
  useEffect(() => {
    if (!isEdit) return;
    api.get('/reminders')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.reminders || []);
        const r = list.find((x: any) => x.reminder_id === reminder_id || x.id === reminder_id);
        if (r) {
          const d = new Date(r.reminder_date);
          setReminderDate(d);
          setReminderTime(d);
          setReminderType(r.title?.startsWith('Reminder —') ? 'custom' : 'payment');
          if (r.is_recurring && r.recurrence && r.recurrence !== 'none') {
            setRepeat(r.recurrence as RepeatType);
          } else {
            setRepeat('one_time');
          }
          if (r.end_date) setEndDate(new Date(r.end_date));
        }
      })
      .catch(() => Alert.alert('Error', 'Failed to load reminder'))
      .finally(() => setLoading(false));
  }, [reminder_id]);

  // ── Derived ──
  const combinedDateTime = (() => {
    const d = new Date(reminderDate);
    d.setHours(reminderTime.getHours(), reminderTime.getMinutes(), 0, 0);
    return d;
  })();

  const reminderLabel = reminderType === 'payment'
    ? `EMI Due — ${loan_name || 'Loan'}`
    : `Reminder — ${loan_name || 'Loan'}`;

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const recurrence = repeat === 'one_time' ? 'none' : repeat;
      const payload = {
        title: reminderLabel,
        description: `EMI reminder for ${loan_name || 'your loan'}`,
        reminder_date: combinedDateTime.toISOString(),
        reminder_type: 'loan_emi',
        related_id: loan_id || null,
        is_recurring: repeat !== 'one_time',
        recurrence,
        end_type: endDate ? 'on' : 'never',
        end_date: endDate ? endDate.toISOString() : null,
      };

      let saved: any;
      if (isEdit) {
        const res = await api.put(`/reminders/${reminder_id}`, payload);
        saved = res?.data;
      } else {
        const res = await api.post('/reminders', payload);
        saved = res?.data;
      }
      scheduleReminderNotifications(saved).catch(() => {});

      if (router.canGoBack()) router.back();
      else router.replace('/loans' as any);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!isEdit) return;
    setDeleting(true);
    try {
      await api.delete(`/reminders/${reminder_id}`);
      cancelReminderNotifications(reminder_id as string).catch(() => {});
      setShowDeleteConfirm(false);
      if (router.canGoBack()) router.back();
      else router.replace('/loans' as any);
    } catch (e: any) {
      setShowDeleteConfirm(false);
      Alert.alert('Error', e.response?.data?.detail || 'Failed to delete reminder');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#5B4FFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          testID="reminder-back"
          onPress={() => router.back()}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>
          {isEdit ? 'Edit Reminder' : 'Set Reminder'}
        </Text>
        {isEdit ? (
          <TouchableOpacity
            testID="reminder-delete-btn"
            onPress={() => setShowDeleteConfirm(true)}
            hitSlop={{ top:10, bottom:10, left:10, right:10 }}
          >
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        ) : <View style={{ width: 24 }} />}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* Optional loan badge if launched from a loan */}
        {!!loan_name && (
          <View style={[s.loanBadge, { backgroundColor: '#5B4FFF12', borderColor: '#5B4FFF26' }]}>
            <Ionicons name="card-outline" size={16} color="#5B4FFF" />
            <Text style={s.loanBadgeText} numberOfLines={1}>{loan_name}</Text>
          </View>
        )}

        {/* ─── Reminder Type ───────────────────────────────────── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Reminder Type</Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {REMINDER_TYPES.map(t => (
            <RadioRow
              key={t.key}
              testID={`reminder-type-${t.key}`}
              label={t.label}
              selected={reminderType === t.key}
              onPress={() => setReminderType(t.key)}
              colors={colors}
            />
          ))}
        </View>

        {/* ─── Reminder Date ───────────────────────────────────── */}
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Reminder Date</Text>
        <View style={s.pickerWrap} testID="reminder-date-field">
          <CrossPlatformPicker
            value={reminderDate}
            onChange={setReminderDate}
            mode="date"
            label="Reminder Date"
            colors={colors}
          />
        </View>

        {/* ─── Reminder Time ───────────────────────────────────── */}
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Reminder Time</Text>
        <View style={s.pickerWrap} testID="reminder-time-field">
          <CrossPlatformPicker
            value={reminderTime}
            onChange={setReminderTime}
            mode="time"
            label="Reminder Time"
            colors={colors}
          />
        </View>

        {/* ─── Repeat ──────────────────────────────────────────── */}
        <Text style={[s.sectionTitle, { color: colors.text, marginTop: 6 }]}>Repeat</Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {REPEAT_OPTIONS.map(opt => (
            <RadioRow
              key={opt.key}
              testID={`reminder-repeat-${opt.key}`}
              label={opt.label}
              selected={repeat === opt.key}
              onPress={() => setRepeat(opt.key)}
              colors={colors}
            />
          ))}
        </View>

        {/* ─── Recurring End (Optional) ────────────────────────── */}
        {repeat !== 'one_time' && (
          <>
            <View style={s.endRow}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Recurring End</Text>
              <Text style={[s.optionalTag, { color: colors.textSecondary }]}>(Optional)</Text>
            </View>
            {endDate ? (
              <View style={s.endDateRow}>
                <View style={{ flex: 1 }} testID="reminder-end-date-field">
                  <CrossPlatformPicker
                    value={endDate}
                    onChange={setEndDate}
                    mode="date"
                    label="End Date"
                    colors={colors}
                  />
                </View>
                <TouchableOpacity
                  testID="reminder-end-clear"
                  onPress={() => setEndDate(null)}
                  style={[s.clearBtn, { borderColor: colors.border }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                testID="reminder-end-add"
                style={[s.selectEndDateBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => {
                  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
                  setEndDate(d);
                }}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={[s.selectEndDateText, { color: colors.textSecondary }]}>Select Date</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Preview */}
        <View style={[s.previewCard, { backgroundColor: '#5B4FFF0E', borderColor: '#5B4FFF26' }]}>
          <View style={s.previewIconWrap}>
            <Ionicons name="notifications-outline" size={18} color="#5B4FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.previewTitle} numberOfLines={1}>{reminderLabel}</Text>
            <Text style={s.previewSub} numberOfLines={2}>
              {combinedDateTime.toLocaleDateString('en-IN', {
                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
              })}
              {' · '}
              {combinedDateTime.toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', hour12: true,
              })}
              {repeat !== 'one_time' && ` · Repeats ${repeat}`}
            </Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ─── Footer / Save button ────────────────────────────────── */}
      <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          testID="save-reminder-btn"
          style={[s.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : (
              <>
                <Ionicons name="notifications" size={18} color="#FFF" />
                <Text style={s.saveBtnText}>{isEdit ? 'Update Reminder' : 'Save Reminder'}</Text>
              </>
            )}
        </TouchableOpacity>
      </View>

      <DeleteConfirm
        visible={showDeleteConfirm}
        colors={colors}
        deleting={deleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  backBtn:     { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800' },

  /* Scroll */
  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  /* Loan badge */
  loanBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, marginBottom: 18,
  },
  loanBadgeText: { color: '#5B4FFF', fontWeight: '700', fontSize: 13, flex: 1 },

  /* Section title */
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },

  /* Cards (radio groups) */
  card: {
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 1, marginBottom: 18,
  },

  /* Field labels (for date / time pickers) */
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 7 },
  pickerWrap: { marginBottom: 14 },

  /* Recurring End */
  endRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  optionalTag: { fontSize: 12, fontWeight: '500' },
  endDateRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  clearBtn:    {
    width: 38, height: 44, borderRadius: 11, borderWidth: 1.2,
    alignItems: 'center', justifyContent: 'center',
  },
  selectEndDateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 18,
  },
  selectEndDateText: { fontSize: 14 },

  /* Preview */
  previewCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 4,
  },
  previewIconWrap: {
    width: 32, height: 32, borderRadius: 11, backgroundColor: '#5B4FFF1A',
    alignItems: 'center', justifyContent: 'center',
  },
  previewTitle: { color: '#5B4FFF', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  previewSub:   { color: '#5B4FFFB3', fontSize: 12, lineHeight: 17 },

  /* Footer */
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 24, borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#5B4FFF', borderRadius: 14, paddingVertical: 16,
    shadowColor: '#5B4FFF', shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
