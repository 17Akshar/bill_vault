import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  FONT_WEIGHTS,
  CURRENCIES,
  SHADOWS,
} from '../constants/theme';
import { api } from '../services/api';
import { Budget } from '../types';

interface CurrencySettingsScreenProps {
  navigation: any;
}

export const CurrencySettingsScreen: React.FC<CurrencySettingsScreenProps> = ({
  navigation,
}) => {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [selected, setSelected] = useState<string>('USD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const b = await api.getBudget();
        if (b) {
          setBudget(b);
          setSelected(b.currency || 'USD');
        }
      } catch (e) {
        // No budget yet — use USD default
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (code: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        total_budget: budget?.total_budget ?? 0,
        period: (budget?.period as any) ?? 'monthly',
        start_date: budget?.start_date ?? new Date().toISOString(),
        currency: code,
      };
      await api.saveBudget(payload as any);
      setSelected(code);
      // Brief feedback then go back
      setTimeout(() => navigation?.goBack?.(), 250);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save currency');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Currency</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subHeader}>
        <Feather name="globe" size={18} color={COLORS.primary} />
        <Text style={styles.subHeaderText}>
          Pick the currency used across your Budget module.
        </Text>
      </View>

      <FlatList
        data={CURRENCIES}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          const isSelected = selected === item.code;
          return (
            <TouchableOpacity
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => handleSave(item.code)}
              disabled={saving}
              activeOpacity={0.7}
            >
              <View style={styles.symbolBadge}>
                <Text style={styles.symbolText}>{item.symbol}</Text>
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSubtitle}>{item.code}</Text>
              </View>
              {isSelected ? (
                saving ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Feather name="check-circle" size={22} color={COLORS.success} />
                )
              ) : (
                <Feather
                  name="circle"
                  size={22}
                  color={COLORS.borderDark}
                />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  subHeaderText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  rowSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  sep: {
    height: SPACING.sm,
  },
  symbolBadge: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  rowSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
