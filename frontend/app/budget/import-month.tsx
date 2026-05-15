import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import { PREVIOUS_MONTH, CAT_COLORS } from './_data';

export default function ImportPreviousMonthScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [importCategories, setImportCategories] = useState(true);
  const [importTotal, setImportTotal] = useState(true);
  const [importSavings, setImportSavings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const pm = PREVIOUS_MONTH;

  const handleImport = () => {
    setShowConfirm(false);
    Alert.alert(
      'Import Successful',
      `Budget data from ${pm.label} has been imported successfully.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  const importCount = [importCategories, importTotal, importSavings].filter(Boolean).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Import Previous Month</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Month badge */}
        <View style={[styles.monthBadge, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <View>
            <Text style={[styles.monthBadgeLabel, { color: colors.textSecondary }]}>Importing from</Text>
            <Text style={[styles.monthBadgeValue, { color: colors.primary }]}>{pm.label}</Text>
          </View>
        </View>

        {/* What to import */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select What to Import</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="pie-chart-outline" size={20} color="#7C4DFF" />
              <View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Category Budgets</Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>{pm.categories.length} categories</Text>
              </View>
            </View>
            <Switch value={importCategories} onValueChange={setImportCategories} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="wallet-outline" size={20} color="#00C48C" />
              <View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Total Budget</Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>{formatINR(pm.total_budget)}/month</Text>
              </View>
            </View>
            <Switch value={importTotal} onValueChange={setImportTotal} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="flag-outline" size={20} color="#FF9100" />
              <View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Savings Goal</Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>{pm.savings_goal.name}</Text>
              </View>
            </View>
            <Switch value={importSavings} onValueChange={setImportSavings} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
          </View>
        </View>

        {/* Preview */}
        {importCategories && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Budget Preview</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {pm.categories.slice(0, 6).map((cat) => (
              <View key={cat.key} style={styles.previewRow}>
                <View style={[styles.previewIcon, { backgroundColor: (CAT_COLORS[cat.key] || '#607D8B') + '22' }]}>
                  <Ionicons name={cat.icon as any} size={14} color={CAT_COLORS[cat.key] || '#607D8B'} />
                </View>
                <Text style={[styles.previewLabel, { color: colors.text }]}>{cat.label}</Text>
                <Text style={[styles.previewAmt, { color: colors.textSecondary }]}>{formatINR(cat.budget)}/mo</Text>
              </View>
            ))}
            {pm.categories.length > 6 && (
              <Text style={[styles.moreText, { color: colors.textSecondary }]}>+ {pm.categories.length - 6} more categories</Text>
            )}
          </View>
        )}

        {importTotal && (
          <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
            <Ionicons name="wallet-outline" size={18} color="#00C48C" />
            <Text style={[styles.infoBoxText, { color: colors.text }]}>
              Total budget: <Text style={{ fontWeight: '700', color: '#00C48C' }}>{formatINR(pm.total_budget)}/month</Text> will be imported
            </Text>
          </View>
        )}

        {importSavings && (
          <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
            <Ionicons name="flag-outline" size={18} color="#FF9100" />
            <Text style={[styles.infoBoxText, { color: colors.text }]}>
              Goal "{pm.savings_goal.name}" ({formatINR(pm.savings_goal.target_amount)}) will be imported
            </Text>
          </View>
        )}

        {/* Warning */}
        <View style={[styles.warningBox, { backgroundColor: '#FFB30015' }]}>
          <Ionicons name="alert-circle-outline" size={18} color="#FFB300" />
          <Text style={[styles.warningText, { color: colors.text }]}>
            Importing will overwrite your current budget settings for selected items.
          </Text>
        </View>

        {/* Import Button */}
        <TouchableOpacity
          style={[styles.importBtn, { backgroundColor: importCount > 0 ? colors.primary : colors.border }]}
          onPress={() => importCount > 0 && setShowConfirm(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={20} color="#FFF" />
          <Text style={styles.importBtnText}>
            Import {importCount > 0 ? `(${importCount} item${importCount > 1 ? 's' : ''})` : ''}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: colors.card }]}>
            <View style={[styles.confirmIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="download-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Confirm Import</Text>
            <Text style={[styles.confirmDesc, { color: colors.textSecondary }]}>
              You are about to import budget data from {pm.label}. This will overwrite your current settings.
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleImport}
              >
                <Text style={styles.confirmBtnText}>Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  monthBadge: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 18, marginBottom: 12 },
  monthBadgeLabel: { fontSize: 11, marginBottom: 2 },
  monthBadgeValue: { fontSize: 20, fontWeight: '800' },

  sectionCard: { borderRadius: 18, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleSub: { fontSize: 12, marginTop: 2 },

  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  previewIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  previewLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  previewAmt: { fontSize: 13, fontWeight: '600' },
  moreText: { fontSize: 12, textAlign: 'center', marginTop: 6 },

  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, marginBottom: 8 },
  infoBoxText: { flex: 1, fontSize: 13 },

  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 14, marginBottom: 16 },
  warningText: { flex: 1, fontSize: 13 },

  importBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 54, gap: 8,
  },
  importBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  confirmCard: { borderRadius: 24, padding: 28, alignItems: 'center', width: '100%' },
  confirmIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  confirmDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  confirmBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
