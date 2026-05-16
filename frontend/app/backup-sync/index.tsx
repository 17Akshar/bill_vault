import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function BackupSyncScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncGoogleDrive, setSyncGoogleDrive] = useState(true);
  const [syncOneDrive, setSyncOneDrive] = useState(false);

  const handleBackup = () => Alert.alert('Backup', 'Creating backup of your data...', [{ text: 'OK' }]);
  const handleSync = () => Alert.alert('Sync', 'Syncing your data across devices...', [{ text: 'OK' }]);
  const handleExport = () => Alert.alert('Export', 'Exporting your financial data...', [{ text: 'OK' }]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Backup, Sync & Export Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* BACKUP */}
        <Text style={[styles.sectionNumber, { color: colors.primary }]}>1</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Backup</Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>Create a backup of your data and store it securely</Text>
          </View>

          {[
            { icon: 'phone-portrait-outline', label: 'Backup to Phone', desc: 'Save to your device storage' },
            { icon: 'logo-google', label: 'Backup to Google Drive', desc: 'Save backup to Google Drive' },
            { icon: 'cloud-outline', label: 'Backup to OneDrive', desc: 'Save backup to Microsoft OneDrive' },
          ].map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.backupItem, { borderBottomColor: colors.border, borderBottomWidth: idx < 2 ? 1 : 0 }]}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleBackup}>
            <Text style={styles.primaryBtnText}>Create Backup Now</Text>
          </TouchableOpacity>
        </View>

        {/* SYNC */}
        <Text style={[styles.sectionNumber, { color: colors.primary }]}>2</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sync-outline" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sync</Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>Sync your data across devices and cloud</Text>
          </View>

          <View style={[styles.syncToggle, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>Auto Sync</Text>
              <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>Automatically sync your data</Text>
            </View>
            <Switch
              value={autoSyncEnabled}
              onValueChange={setAutoSyncEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.syncToggle, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>Sync with Google Drive</Text>
              <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>Enable auto sync with Google Drive</Text>
            </View>
            <Switch
              value={syncGoogleDrive}
              onValueChange={setSyncGoogleDrive}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.syncToggle}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>Sync with OneDrive</Text>
              <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>Enable auto sync with OneDrive</Text>
            </View>
            <Switch
              value={syncOneDrive}
              onValueChange={setSyncOneDrive}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.syncInfo, { backgroundColor: colors.background }]}>
            <View>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Last Sync</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>28 May 2024, 09:30 AM</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#22C55E20' }]}>
              <Text style={[styles.statusText, { color: '#22C55E' }]}>Successful</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleSync}>
            <Text style={styles.primaryBtnText}>Sync Now</Text>
          </TouchableOpacity>
        </View>

        {/* EXPORT */}
        <Text style={[styles.sectionNumber, { color: colors.primary }]}>3</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Export Data</Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>Send financial data in different formats</Text>
          </View>

          {[
            { icon: 'document-outline', label: 'Export as PDF', desc: 'Download data as PDF file' },
            { icon: 'grid-outline', label: 'Export as Excel', desc: 'Download data as Excel file' },
            { icon: 'list-outline', label: 'Export as CSV', desc: 'Download data as CSV file' },
          ].map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.exportItem, { borderBottomColor: colors.border, borderBottomWidth: idx < 2 ? 1 : 0 }]}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}

          <View style={[styles.exportRange, { backgroundColor: colors.background }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>Export Range</Text>
              <Text style={[styles.rangeValue, { color: colors.text }]}>01 May 2024 - 28 May 2024</Text>
            </View>
            <TouchableOpacity style={[styles.rangeBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.rangeBadgeText, { color: colors.primary }]}>Custom Range</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleExport}>
            <Text style={styles.primaryBtnText}>Export Data</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },

  sectionNumber: { fontSize: 28, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  sectionCard: { borderRadius: 18, padding: 16, marginBottom: 20 },
  sectionHeader: { marginBottom: 14, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionDesc: { fontSize: 12, fontWeight: '400' },

  backupItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  exportItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  itemLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemDesc: { fontSize: 11, fontWeight: '400' },

  syncToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 12 },

  syncInfo: { borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 14 },
  infoLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },

  exportRange: { borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 14 },
  rangeLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  rangeValue: { fontSize: 14, fontWeight: '700' },
  rangeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  rangeBadgeText: { fontSize: 11, fontWeight: '600' },

  primaryBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
