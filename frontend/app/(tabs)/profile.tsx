import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../utils/api';
import { requestNotificationPermissions } from '../../utils/notifications';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const response = await api.put('/settings', { [key]: value });
      setSettings(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permission Denied', 'Please enable notifications in settings');
        return;
      }
    }
    updateSetting('notifications_enabled', value);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const exportData = async () => {
    try {
      const response = await api.get('/export');
      Alert.alert(
        'Export Successful',
        'Your data has been exported. Check the response for download options.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const userName = user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LinearGradient
          colors={['#5B2FBF', '#7C5CE7', '#9B7AFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{userInitial}</Text>
          </View>
          <Text style={styles.profileName}>{userName}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'Local Account'}</Text>
        </LinearGradient>

        {/* Preferences */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: '#5B2FBF15' }]}>
                <Ionicons name="moon-outline" size={20} color="#5B2FBF" />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {settings && (
            <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#F59E0B15' }]}>
                  <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Notifications</Text>
              </View>
              <Switch
                value={settings.notifications_enabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          )}
        </View>

        {/* PRODUCTIVITY */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>PRODUCTIVITY</Text>

          {[
            { icon: 'document-outline', label: 'Notes', subtitle: 'Write and manage notes', color: '#F59E0B', route: '/notes' },
            { icon: 'notifications-outline', label: 'Reminders', subtitle: 'Never miss a due date', color: '#EF4444', route: '/reminders' },
            { icon: 'calendar-outline', label: 'Calendar', subtitle: 'View all financial events', color: '#3B82F6', route: '/calendar' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionItem, index === 2 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.settingIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.labelWrap}>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FINANCIAL TOOLS */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>FINANCIAL TOOLS</Text>

          {[
            { icon: 'trending-up-outline', label: 'Investment', subtitle: 'Track and manage investments', color: '#22C55E', route: '/investments' },
            { icon: 'wallet-outline', label: 'Budget Limits', subtitle: 'Set budget and track limits', color: '#0EA5E9', route: '/budget' },
            { icon: 'calendar-number-outline', label: 'Planned Payments', subtitle: 'Upcoming bills and payments', color: '#F59E0B', route: '/planned-payments' },
            { icon: 'home-outline', label: 'Loans', subtitle: 'Track loans and EMIs', color: '#8B5CF6', route: '/loans' },
            { icon: 'home-outline', label: 'Rentals', subtitle: 'Manage rental properties', color: '#FF9100', route: '/rental-tracker' },
            { icon: 'people-outline', label: 'Lent and Borrowed', subtitle: 'Track money lent or borrowed', color: '#3B82F6', route: '/lend-borrow' },
            { icon: 'card-outline', label: 'Credit Cards', subtitle: 'Manage credit cards, bills & payments', color: '#EC4899', route: '/credit-cards' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionItem, index === 6 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.settingIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.labelWrap}>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ACCOUNTS & STRUCTURE */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>ACCOUNTS & STRUCTURE</Text>

          {[
            { icon: 'business-outline', label: 'Accounts', subtitle: 'View and manage your accounts', color: '#6366F1', route: '/accounts' },
            { icon: 'pricetag-outline', label: 'Categories', subtitle: 'Manage income & expense categories', color: '#EC4899', route: '/profile/categories' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionItem, index === 1 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.settingIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.labelWrap}>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* SETTINGS */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>SETTINGS</Text>

          {[
            { icon: 'settings-outline', label: 'Settings', subtitle: 'General app settings', color: '#6B7280', route: '/settings' },
            { icon: 'shield-outline', label: 'Security (MPIN)', subtitle: 'Change MPIN & security', color: '#22C55E', route: '/security' },
            { icon: 'cloud-upload-outline', label: 'Backup, Sync & Export Data', subtitle: 'Backup and sync your data', color: '#0EA5E9', route: '/backup-sync' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionItem, index === 2 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.settingIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.labelWrap}>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* SUPPORT */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>SUPPORT</Text>

          <TouchableOpacity style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/help' as any)}>
            <View style={[styles.settingIcon, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="help-circle-outline" size={20} color="#EF4444" />
            </View>
            <View style={styles.labelWrap}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Help & Support</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Get help and contact us</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: '#EF4444' }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={[styles.logoutText, { color: '#EF4444' }]}>Logout</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textSecondary }]}>
          Fintracker v2.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    marginBottom: 20,
    marginHorizontal: 20,
    borderRadius: 20,
    marginTop: 16,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  section: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  labelWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  storageRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
  },
  storageChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  storageLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  soonBadge: {
    fontSize: 9,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1.5,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
});