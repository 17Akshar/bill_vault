// InvestmentDetailForm — composer that wires all sections together using the
// per-category field schema (`/components/investments/categoryFields.ts`).
//
// Optional props (all backward compatible):
//   viewMode      — when true, fields render read-only and the header shows
//                   an "Edit" link instead of "Save"
//   onEnterEdit   — called when the user taps Edit in view-mode header
//   onDelete      — when provided, a Delete button is rendered next to Save
//
// Screens that don't pass these props keep the original always-editable
// behaviour, so other category forms are untouched.

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { InvestmentHeader } from './sections/InvestmentHeader';
import { InvestmentSummaryCard } from './sections/InvestmentSummaryCard';
import { GainLossDisplay } from './sections/GainLossDisplay';
import { DynamicFieldList } from './sections/DynamicFieldList';
import { SaleDetailsSection } from './sections/SaleDetailsSection';
import { MaturityDetailsSection } from './sections/MaturityDetailsSection';
import { NotesSection } from './sections/NotesSection';
import { SaveButton } from './sections/SaveButton';
import { getCategoryConfig, getByPath } from './categoryFields';

interface InvestmentDetailFormProps {
  investment: any;
  onBack: () => void;
  onSave: (next: any) => Promise<void> | void;
  saving?: boolean;
  initialEditable?: boolean;
  // ---- new optional props ----
  viewMode?: boolean;
  onEnterEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  // ---------------------------
  colors: any;
}

export const InvestmentDetailForm = ({
  investment,
  onBack,
  onSave,
  saving,
  initialEditable = true,
  viewMode,
  onEnterEdit,
  onDelete,
  deleting,
  accounts,
  colors,
}: InvestmentDetailFormProps) => {
  const [draft, setDraft] = useState<any>(investment);

  // If the parent re-fetches the investment (eg after save), re-sync the draft.
  useEffect(() => {
    setDraft(investment);
  }, [investment?.investment_id, investment?.updated_at]);

  if (!draft) return null;

  const config = getCategoryConfig(draft.investment_type || '');
  const subtitle = config.subtitleKey ? getByPath(draft, config.subtitleKey) : undefined;

  // editable state: explicit `viewMode` prop wins; otherwise fall back to
  // the legacy `initialEditable` flag (which defaults to true).
  const editable = viewMode === undefined ? initialEditable : !viewMode;

  const handleSave = () => {
    onSave(draft);
  };

  // Header right-link: shows "Edit" in view-mode, "Save" otherwise.
  const headerSaveHandler = editable ? handleSave : onEnterEdit;
  const headerSaveLabel = editable ? 'Save' : 'Edit';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* SECTION 1 — Investment Header */}
        <InvestmentHeader
          title={config.name}
          onBack={onBack}
          onSave={headerSaveHandler}
          saving={saving}
          saveLabel={headerSaveLabel}
          colors={colors}
        />

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION 2 — Investment Summary Card */}
          <InvestmentSummaryCard
            iconName={config.iconName}
            iconColor={config.iconColor}
            iconBg={config.iconBg}
            name={draft.name}
            subtitle={subtitle}
            colors={colors}
          />

          {/* Dynamic category-specific fields */}
          <DynamicFieldList
            fields={config.fields}
            values={draft}
            onChange={setDraft}
            editable={editable}
            colors={colors}
            accounts={accounts}
          />

          {/* SECTION 3 — Gain / Loss — inside its own card (card bg + radius via GainLossDisplay) */}
          <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
            <GainLossDisplay
              invested={Number(draft.invested_amount) || 0}
              current={Number(draft.current_value) || 0}
              colors={colors}
            />
          </View>

          {/* SECTION 4 — Sale or Maturity sub-section, depending on category */}
          {config.bottomSection === 'sale' && (
            <SaleDetailsSection
              values={draft}
              onChange={setDraft}
              editable={editable}
              colors={colors}
              fields={config.saleFields}
            />
          )}
          {config.bottomSection === 'maturity' && (
            <MaturityDetailsSection
              values={draft}
              onChange={setDraft}
              editable={editable}
              colors={colors}
              fields={config.maturityFields}
            />
          )}

          {/* SECTION 5 — Notes */}
          <NotesSection
            value={draft.notes || ''}
            onChange={(next) => setDraft({ ...draft, notes: next })}
            editable={editable}
            colors={colors}
          />

          {/* SECTION 6 — Save Button (full-width CTA, mirrors header link) */}
          {editable && (
            <SaveButton onPress={handleSave} loading={saving} colors={colors} />
          )}

          {/* OPTIONAL — Delete CTA (only rendered when caller passes onDelete) */}
          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              disabled={deleting || saving}
              style={[styles.deleteBtn, (deleting || saving) && { opacity: 0.6 }]}
              activeOpacity={0.8}
              testID="invdetail-delete-btn"
            >
              <Ionicons name="trash-outline" size={18} color="#FF5252" />
              <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete Investment'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 40,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FF5252',
    backgroundColor: 'transparent',
  },
  deleteText: { color: '#FF5252', fontSize: 15, fontWeight: '700' },
});
