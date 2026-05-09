import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  SHADOWS,
} from '../constants/theme';
import { CategoryIcon } from '../components/CategoryIcon';
import { ProgressBar } from '../components/ProgressBar';
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';

interface TemplateCategory {
  category_name: string;
  category_icon: string;
  budget_amount: number;
  alert_limit: number;
}

interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  total_budget: number;
  categories: TemplateCategory[];
}

interface BudgetTemplatesScreenProps {
  navigation: any;
}

export const BudgetTemplatesScreen: React.FC<BudgetTemplatesScreenProps> = ({
  navigation,
}) => {
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('USD');

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    (async () => {
      try {
        const [tpls, b] = await Promise.all([
          api.getBudgetTemplates(),
          api.getBudget().catch(() => null),
        ]);
        setTemplates(tpls);
        if (b?.currency) setCurrency(b.currency);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const confirmApply = (template: BudgetTemplate) => {
    Alert.alert(
      `Apply "${template.name}"?`,
      `This will set total budget to ${formatCurrency(
        template.total_budget,
        currency
      )} and create ${template.categories.length} category budgets for ${new Date(
        year,
        month - 1
      ).toLocaleString('default', { month: 'long', year: 'numeric' })}.\n\nExisting categories with budgets for this month will be skipped (use Replace All to overwrite).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => applyTemplate(template, false),
        },
        {
          text: 'Replace All',
          style: 'destructive',
          onPress: () => applyTemplate(template, true),
        },
      ]
    );
  };

  const applyTemplate = async (template: BudgetTemplate, overwrite: boolean) => {
    setApplyingId(template.id);
    try {
      const result = await api.applyBudgetTemplate(template.id, month, year, overwrite);
      Alert.alert(
        'Template Applied! 🎉',
        `${result.created_count} category budgets created${
          result.skipped_count > 0 ? `, ${result.skipped_count} skipped (already existed)` : ''
        }.`,
        [
          {
            text: 'View Dashboard',
            onPress: () => navigation?.navigate?.('BudgetDashboard'),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to apply template');
    } finally {
      setApplyingId(null);
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
        <Text style={styles.headerTitle}>Budget Templates</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subHeader}>
        <Feather name="zap" size={18} color={COLORS.warning} />
        <Text style={styles.subHeaderText}>
          One-tap setup. Pick a template that matches your lifestyle.
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {templates.map((tpl) => {
          const isExpanded = expandedId === tpl.id;
          const isApplying = applyingId === tpl.id;
          return (
            <View
              key={tpl.id}
              style={[styles.card, isExpanded && styles.cardExpanded]}
            >
              <TouchableOpacity
                onPress={() => toggleExpand(tpl.id)}
                activeOpacity={0.7}
                style={styles.cardHeader}
              >
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: (tpl.color || COLORS.primary) + '22' },
                  ]}
                >
                  <Feather
                    name={tpl.icon as any}
                    size={24}
                    color={tpl.color || COLORS.primary}
                  />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>{tpl.name}</Text>
                  <Text style={styles.cardDesc}>{tpl.description}</Text>
                </View>
                <Feather
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <View style={styles.cardStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={[styles.statValue, { color: tpl.color || COLORS.primary }]}>
                    {formatCurrency(tpl.total_budget, currency)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Categories</Text>
                  <Text style={styles.statValue}>{tpl.categories.length}</Text>
                </View>
              </View>

              {isExpanded && (
                <View style={styles.breakdown}>
                  <Text style={styles.breakdownTitle}>Budget Breakdown</Text>
                  {tpl.categories.map((cat) => {
                    const pct = (cat.budget_amount / tpl.total_budget) * 100;
                    return (
                      <View key={cat.category_name} style={styles.breakdownRow}>
                        <View style={styles.breakdownLeft}>
                          <View style={styles.catIconWrap}>
                            <CategoryIcon
                              name={cat.category_icon}
                              size={18}
                              color={tpl.color || COLORS.primary}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.catName}>{cat.category_name}</Text>
                            <View style={styles.barWrap}>
                              <ProgressBar
                                progress={pct}
                                height={4}
                                color={tpl.color || COLORS.primary}
                              />
                            </View>
                          </View>
                        </View>
                        <View style={styles.breakdownRight}>
                          <Text style={styles.breakdownAmount}>
                            {formatCurrency(cat.budget_amount, currency)}
                          </Text>
                          <Text style={styles.breakdownPct}>
                            {Math.round(pct)}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.applyBtn,
                  { backgroundColor: tpl.color || COLORS.primary },
                  isApplying && { opacity: 0.6 },
                ]}
                onPress={() => confirmApply(tpl)}
                disabled={isApplying}
                activeOpacity={0.85}
              >
                {isApplying ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Feather name="check" size={18} color={COLORS.white} />
                    <Text style={styles.applyBtnText}>Apply Template</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  subHeaderText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardExpanded: {
    ...SHADOWS.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  breakdown: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  breakdownTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  breakdownLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
  },
  barWrap: {
    marginTop: 4,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  breakdownPct: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  applyBtnText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.white,
  },
});
