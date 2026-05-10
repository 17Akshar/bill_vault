// InvestmentDetailForm — composer that wires all 6 sections together using a
// per-category field schema. Drop this into any screen with an investment
// object and it produces the right form for the investment's category.

import React, { useEffect, useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  onSave: (next: any) => Promise<void>;
  saving?: boolean;
  initialEditable?: boolean;
  colors: any;
}

export const InvestmentDetailForm = ({
  investment,
  onBack,
  onSave,
  saving,
  initialEditable = true,
  colors,
}: InvestmentDetailFormProps) => {
  const [draft, setDraft] = useState<any>(investment);
  const [editable] = useState<boolean>(initialEditable);

  // If the parent re-fetches the investment (eg after save), re-sync the draft.
  useEffect(() => {
    setDraft(investment);
  }, [investment?.investment_id, investment?.updated_at]);

  if (!draft) return null;

  const config = getCategoryConfig(draft.investment_type || '');
  const subtitle = config.subtitleKey ? getByPath(draft, config.subtitleKey) : undefined;

  const handleSave = () => {
    onSave(draft);
  };

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
          onSave={editable ? handleSave : undefined}
          saving={saving}
          colors={colors}
        />

        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
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
          />

          {/* SECTION 3 — Gain / Loss row sits inside its own light wrapper */}
          <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
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
            />
          )}
          {config.bottomSection === 'maturity' && (
            <MaturityDetailsSection
              values={draft}
              onChange={setDraft}
              editable={editable}
              colors={colors}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
