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

        {/* Management */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Management</Text>
          
          {[
            { icon: 'trending-up-outline', label: 'Investments', color: '#00E676', route: '/investments' },
            { icon: 'grid-outline', label: 'Dashboard Widgets', color: '#0EA5E9', route: '/profile/dashboard-settings' },
            { icon: 'lock-closed-outline', label: 'MPIN Security', color: '#EF4444', route: '/security/mpin' },
            { icon: 'calendar-outline', label: 'Calendar', color: '#0EA5E9', route: '/calendar' },
            { icon: 'people-outline', label: 'Family Members', color: '#3B82F6', route: '/profile/family' },
            { icon: 'stats-chart-outline', label: 'Analytics', color: '#22C55E', route: '/(tabs)/analytics' },
            { icon: 'pricetag-outline', label: 'Manage Categories', color: '#EC4899', route: '/profile/categories' },
            { icon: 'wallet-outline', label: 'Budget Limits', color: '#6366F1', route: '/profile/budgets' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionItem, index === 7 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.settingIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Data & Export */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data & Storage</Text>
          
          <TouchableOpacity style={styles.actionItem} onPress={exportData}>
            <View style={[styles.settingIcon, { backgroundColor: '#14B8A615' }]}>
              <Ionicons name="download-outline" size={20} color="#14B8A6" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Export Data</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.storageRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.storageChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="phone-portrait-outline" size={22} color="#22C55E" />
              <Text style={[styles.storageLabel, { color: colors.text }]}>Local</Text>
              <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
            </View>
            <View style={[styles.storageChip, { backgroundColor: colors.background, borderColor: colors.border, opacity: 0.5 }]}>
              <Ionicons name="logo-google" size={22} color={colors.textSecondary} />
              <Text style={[styles.storageLabel, { color: colors.textSecondary }]}>Drive</Text>
              <Text style={[styles.soonBadge, { color: colors.textSecondary }]}>Soon</Text>
            </View>
            <View style={[styles.storageChip, { backgroundColor: colors.background, borderColor: colors.border, opacity: 0.5 }]}>
              <Ionicons name="cloud-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.storageLabel, { color: colors.textSecondary }]}>OneDrive</Text>
              <Text style={[styles.soonBadge, { color: colors.textSecondary }]}>Soon</Text>
            </View>
          </View>
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
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
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