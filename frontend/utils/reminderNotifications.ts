/**
 * Local Reminder Notifications
 * ============================
 *
 * Wires expo-notifications so reminders fire OS-level banner notifications
 * at their `reminder_date` — and re-fire on each occurrence for recurring
 * reminders (Daily / Weekly / Monthly / Quarterly / Yearly).
 *
 * iOS triggers monthly via Notifications.SchedulableTriggerInputTypes.CALENDAR
 * with day-of-month repeats; quarterly is not directly supported so we
 * schedule the next 4 occurrences ahead at boot.
 *
 * Android scheduling rules are looser; SecondsTrigger with `repeats: true`
 * works for daily/weekly. For monthly we emulate by scheduling individual
 * dates 12 months ahead.
 *
 * Public API:
 *   await ensureNotificationPermissions()
 *   await syncRemindersToNotifications(reminders: any[])
 *   await scheduleReminderNotifications(reminder: any)
 *   await cancelReminderNotifications(reminderId: string)
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'fintracker_notif_prefs';

// Foreground display config — show banner + sound even when app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const TAG = 'fintracker-reminder';
const NEXT_N_OCCURRENCES = 12;

type Prefs = {
  master_enabled: boolean;
  by_type: Record<string, boolean>;
  lead_time_hours: number;
};

const DEFAULT_PREFS: Prefs = {
  master_enabled: true,
  by_type: {},          // empty = treat all types as enabled (back-compat)
  lead_time_hours: 0,
};

async function loadPrefs(): Promise<Prefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      master_enabled: parsed.master_enabled ?? true,
      by_type: parsed.by_type || {},
      lead_time_hours: parsed.lead_time_hours ?? 0,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelReminderNotifications(reminderId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => (n.content?.data as any)?.reminderId === reminderId)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Compute the next N occurrence Dates after `now` for the given recurrence rule.
 * Used because iOS/Android calendar triggers don't natively support every
 * cadence we offer (e.g., quarterly).
 */
function computeNextOccurrences(
  startDate: Date,
  recurrence: string | null | undefined,
  count: number,
  endDate?: Date | null,
  maxOccurrences?: number | null,
): Date[] {
  const out: Date[] = [];
  let next = new Date(startDate);
  // Move past dates forward to next valid one
  while (next.getTime() < Date.now()) {
    next = stepRecurrence(next, recurrence);
    if (!next) return out;
  }
  for (let i = 0; i < count; i++) {
    if (endDate && next > endDate) break;
    if (maxOccurrences && i >= maxOccurrences) break;
    out.push(new Date(next));
    if (!recurrence || recurrence === 'none') break;
    const stepped = stepRecurrence(next, recurrence);
    if (!stepped) break;
    next = stepped;
  }
  return out;
}

function stepRecurrence(d: Date, rec: string | null | undefined): Date {
  const next = new Date(d);
  switch (rec) {
    case 'daily':     next.setDate(next.getDate() + 1); return next;
    case 'weekly':    next.setDate(next.getDate() + 7); return next;
    case 'monthly':   next.setMonth(next.getMonth() + 1); return next;
    case 'quarterly': next.setMonth(next.getMonth() + 3); return next;
    case 'yearly':    next.setFullYear(next.getFullYear() + 1); return next;
    default: return next; // one-time
  }
}

/**
 * Schedule local notifications for a single reminder according to its rule.
 * Cancels any prior schedule for this reminder first to avoid duplicates.
 */
export async function scheduleReminderNotifications(reminder: any): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!reminder?.reminder_id || !reminder?.reminder_date || reminder.is_completed) return;

  // Honor user preferences
  const prefs = await loadPrefs();
  if (!prefs.master_enabled) return;
  const rtype = String(reminder.reminder_type || 'custom');
  // Empty by_type = back-compat (everything on). Otherwise only schedule
  // when the type's toggle is true.
  if (Object.keys(prefs.by_type).length > 0 && prefs.by_type[rtype] === false) return;

  await cancelReminderNotifications(reminder.reminder_id);

  const startDate = new Date(reminder.reminder_date);
  if (isNaN(startDate.getTime())) return;
  const endDate = reminder.end_date ? new Date(reminder.end_date) : null;
  const maxOcc = reminder.max_occurrences || null;
  const occurrences = computeNextOccurrences(
    startDate,
    reminder.is_recurring ? reminder.recurrence : null,
    NEXT_N_OCCURRENCES,
    endDate,
    maxOcc,
  );

  const body = reminder.description
    ? String(reminder.description).split('\n')[0].slice(0, 120)
    : 'Tap to view details';

  const leadMs = (prefs.lead_time_hours || 0) * 60 * 60 * 1000;

  for (const when of occurrences) {
    // Apply lead-time offset; skip if it lands in the past
    const fireAt = new Date(when.getTime() - leadMs);
    if (fireAt.getTime() <= Date.now() + 1000) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${TAG}-${reminder.reminder_id}-${fireAt.getTime()}`,
        content: {
          title: reminder.title || 'Reminder',
          body,
          sound: 'default',
          data: {
            reminderId: reminder.reminder_id,
            tag: TAG,
            url: reminder.url || null,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
      });
    } catch (err) {
      // Per-occurrence failures shouldn't block remaining occurrences
      // eslint-disable-next-line no-console
      console.warn('[notifications] schedule failed:', err);
    }
  }
}

/**
 * Sync the entire reminder list — cancels any tag-managed schedules that
 * no longer match a live reminder, then re-schedules the live ones.
 * Run on app boot + after create/update/complete/snooze.
 */
export async function syncRemindersToNotifications(reminders: any[]): Promise<void> {
  if (Platform.OS === 'web') return;
  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  const prefs = await loadPrefs();

  // Cancel all tag-managed schedules first (we re-create them below). Cheaper
  // than diffing because schedule limits aren't a concern at typical usage.
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => (n.content?.data as any)?.tag === TAG)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  // Master switch off → leave everything cancelled
  if (!prefs.master_enabled) return;

  for (const r of reminders || []) {
    if (r?.is_completed) continue;
    await scheduleReminderNotifications(r);
  }
}
