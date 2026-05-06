/**
 * Notification Preferences (Manage Alerts)
 *
 * Reached from the Reminders → Upcoming "Manage Alerts" card.
 *
 * Settings shown:
 *   - Master "Reminders" toggle (controls whether ANY local notification
 *     is scheduled — wires straight into expo-notifications)
 *   - Per-type toggles (Bill / EMI / Investment / Insurance / Custom)
 *   - Lead-time picker (notify N hours before due) for advance warnings
 *   - "Test notification" button (fires a sample banner in 5 seconds)
 *
 * Persistence: AsyncStorage key `fintracker_notif_prefs`. Synced reminders
 * respect the per-type filters at scheduling time.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
  Alert, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import api from '../../utils/api';
import {
  ensureNotificationPermissions,
  syncRemindersToNotifications,
} from '../../utils/reminderNotifications';

type ReminderTypeKey = 'bill' | 'loan_emi' | 'investment' | 'insurance' | 'custom';

type Prefs = {
  master_enabled: boolean;
  by_type: Record<ReminderTypeKey, boolean>;
  lead_time_hours: number;
};

const STORAGE_KEY = 'fintracker_notif_prefs';

const DEFAULT_PREFS: Prefs = {
  master_enabled: true,
  by_type: { bill: true, loan_emi: true, investment: true, insurance: true, custom: true },
  lead_time_hours: 0,
};

const TYPE_META: { key: ReminderTypeKey; label: string; icon: string; color: string }[] = [
  { key: 'bill',       label: 'Bills',      icon: 'wifi',             color: '#3B82F6' },
  { key: 'loan_emi',   label: 'EMIs',       icon: 'home',             color: '#7C4DFF' },
  { key: 'investment', label: 'Investment', icon: 'trending-up',      color: '#FFB300' },
  { key: 'insurance',  label: 'Insurance',  icon: 'shield-checkmark', color: '#22C55E' },
  { key: 'custom',     label: 'Custom',     icon: 'notifications',    color: '#A0A3BD' },
];

const LEAD_TIME_OPTIONS = [
  { value: 0,   label: 'On time' },
  { value: 1,   label: '1 hour before' },
  { value: 6,   label: '6 hours before' },
  { value: 24,  label: '1 day before' },
  { value: 48,  label: '2 days before' },
  { value: 168, label: '1 week before' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [permGranted, setPermGranted] = useState<boolean | null>(null);
  const [resyncing, setResyncing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPrefs({ ...DEFAULT_PREFS, ...parsed,
            by_type: { ...DEFAULT_PREFS.by_type, ...(parsed.by_type || {}) } });
        }
      } catch { /* defaults */ }
      if (Platform.OS !== 'web') {
        const granted = await ensureNotificationPermissions();
        setPermGranted(granted);
      } else {
        setPermGranted(false);
      }
      setLoading(false);
    })();
  }, []);

  const persist = async (next: Prefs) => {
    setPrefs(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* non-fatal */ }
  };

  const onToggleMaster = async (val: boolean) => {
    if (val && Platform.OS !== 'web') {
      const ok = await ensureNotificationPermissions();
      if (!ok) {
        Alert.alert(
          'Permission needed',
          'Enable notifications in your phone Settings to receive reminders.',
        );
        return;
      }
      setPermGranted(true);
    }
    await persist({ ...prefs, master_enabled: val });
    if (!val) {
      // Cancel everything if user switched it off
      try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
    } else {
      // Re-sync open reminders
      try {
        const res = await api.get('/reminders');
        await syncRemindersToNotifications(res.data || []);
      } catch {}
    }
  };

  const onToggleType = (k: ReminderTypeKey, val: boolean) => {
    persist({ ...prefs, by_type: { ...prefs.by_type, [k]: val } });
  };

  const onPickLeadTime = (hours: number) => {
    persist({ ...prefs, lead_time_hours: hours });
  };

  const sendTestNotification = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Test notification',
        'Local notifications are mobile-only — install the Expo build to test.');
      return;
    }
    const ok = await ensureNotificationPermissions();
    if (!ok) {
      Alert.alert('Permission needed', 'Enable notifications in Settings.');
      return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Fintracker test reminder',
          body: 'If you see this, OS notifications are working correctly.',
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5, repeats: false,
        } as any,
      });
      Alert.alert('Sent!', 'You should see a banner in ~5 seconds. You can lock or background the app.');
    } catch (err: any) {
      Alert.alert('Test failed', err?.message || 'Could not schedule test notification');
    }
  };

  const resyncAll = async () => {
    setResyncing(true);
    try {
      const res = await api.get('/reminders');
      await syncRemindersToNotifications(res.data || []);
      Alert.alert('Resynced', `${(res.data || []).length} reminders rescheduled.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not resync reminders');
    } finally {
      setResyncing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container]}>
        <ActivityIndicator color="#7C4DFF" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          testID="notif-settings-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard' as any))}
          style={{ padding: 4 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Alerts</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Permission banner */}
        {permGranted === false && Platform.OS !== 'web' && (
          <View style={[styles.banner, { backgroundColor: '#FFB30022' }]}>
            <Ionicons name="warning-outline" size={20} color="#FFB300" />
            <Text style={[styles.bannerText, { color: '#FFB300' }]}>
              Notifications are disabled at the OS level. Enable them in Settings to receive reminders.
            </Text>
          </View>
        )}

        {/* Master toggle */}
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: '#7C4DFF22' }]}>
            <Ionicons name="notifications" size={20} color="#7C4DFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Reminders</Text>
            <Text style={styles.cardSub}>Master switch for all reminder notifications</Text>
          </View>
          <Switch
            testID="notif-master-toggle"
            value={prefs.master_enabled}
            onValueChange={onToggleMaster}
            trackColor={{ true: '#7C4DFF', false: '#1F1F4D' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Per-type toggles */}
        <Text style={styles.sectionLabel}>NOTIFY ME ABOUT</Text>
        <View style={styles.card}>
          {TYPE_META.map((t, i) => (
            <View
              key={t.key}
              style={[styles.cardRowInner, i < TYPE_META.length - 1 && styles.divider]}
            >
              <View style={[styles.iconCircle, { backgroundColor: t.color + '22' }]}>
                <Ionicons name={t.icon as any} size={18} color={t.color} />
              </View>
              <Text style={[styles.cardTitle, { flex: 1, marginLeft: 12 }]}>{t.label}</Text>
              <Switch
                testID={`notif-type-${t.key}`}
                value={prefs.by_type[t.key]}
                onValueChange={(v) => onToggleType(t.key, v)}
                disabled={!prefs.master_enabled}
                trackColor={{ true: t.color, false: '#1F1F4D' }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        {/* Lead time */}
        <Text style={styles.sectionLabel}>LEAD TIME</Text>
        <View style={styles.card}>
          {LEAD_TIME_OPTIONS.map((o, i) => (
            <TouchableOpacity
              key={o.value}
              testID={`notif-lead-${o.value}`}
              onPress={() => onPickLeadTime(o.value)}
              disabled={!prefs.master_enabled}
              style={[styles.cardRowInner, i < LEAD_TIME_OPTIONS.length - 1 && styles.divider]}
            >
              <View style={[styles.radio, prefs.lead_time_hours === o.value && { borderColor: '#7C4DFF' }]}>
                {prefs.lead_time_hours === o.value && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.cardTitle, { flex: 1, marginLeft: 12 }]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <Text style={styles.sectionLabel}>ACTIONS</Text>
        <TouchableOpacity
          testID="notif-test-btn"
          style={[styles.actionBtn, { backgroundColor: '#7C4DFF' }]}
          onPress={sendTestNotification}
        >
          <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>Send Test Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="notif-resync-btn"
          style={[styles.actionBtn, { backgroundColor: '#1B1845', marginTop: 10 }]}
          onPress={resyncAll}
          disabled={resyncing}
        >
          {resyncing ? (
            <ActivityIndicator color="#7C4DFF" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={18} color="#7C4DFF" />
              <Text style={[styles.actionBtnText, { color: '#7C4DFF' }]}>
                Resync Open Reminders
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Notifications are scheduled locally on your device using the recurrence rule of each
          reminder. Disabling a category here cancels its scheduled banners but keeps the reminder
          in your list — turn it back on anytime.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  bannerText: { fontSize: 13, flex: 1, lineHeight: 18 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12123A',
    borderRadius: 14,
    padding: 14,
  },
  card: {
    backgroundColor: '#12123A',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  divider: {
    borderBottomColor: '#1F1F4D',
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  cardSub: { color: '#A0A3BD', fontSize: 12, marginTop: 2 },
  sectionLabel: {
    color: '#A0A3BD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginTop: 22,
    marginBottom: 8,
  },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#A0A3BD',
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C4DFF',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footnote: {
    color: '#A0A3BD',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 22,
  },
});
