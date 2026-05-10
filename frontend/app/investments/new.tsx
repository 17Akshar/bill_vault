// New-investment screen — opens the category-specific empty form when a user
// taps a category from /investments/select-type.
//
// Route: /investments/new?type=mutual_funds (etf, reit, fd, bonds, ppf, nps, …)
//
// Reuses the same InvestmentDetailForm composer used by /investments/[id].tsx;
// only difference is the starting investment object is blank (with the chosen
// type pre-filled) and the save handler POSTs instead of PUTting.

import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { InvestmentDetailForm } from '../../components/investments/InvestmentDetailForm';
import { getCategoryConfig } from '../../components/investments/categoryFields';

export default function NewInvestmentScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { type } = useLocalSearchParams();
  const investmentType = (type as string) || 'others';

  const [saving, setSaving] = useState(false);

  // Build a blank investment shaped the same way the API returns one.
  // The form's `useEffect` that re-syncs draft only fires on
  // `investment_id` / `updated_at` changes, so this object stays stable
  // across keystrokes (memoized).
  const blankInvestment = useMemo(() => {
    const config = getCategoryConfig(investmentType);
    return {
      // Mark as new so InvestmentDetailForm's effect doesn't reset draft
      investment_id: 'new',
      updated_at: 'new',
      investment_type: investmentType,
      // Default the new investment's name to the category label so the user
      // sees a clean placeholder instead of an empty title bar
      name: `New ${config.name}`,
      invested_amount: 0,
      current_value: 0,
      purchase_date: new Date().toISOString(),
      maturity_date: null,
      status: 'active',
      notes: '',
      type_specific_data: {},
      sale_details: null,
      maturity_details: null,
    };
  }, [investmentType]);

  const handleSave = async (next: any) => {
    if (!next.name || next.name.trim().length === 0) {
      Alert.alert('Required', 'Please enter an investment name');
      return;
    }
    if (!next.invested_amount || Number(next.invested_amount) <= 0) {
      Alert.alert('Required', 'Please enter the invested amount');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: next.name.trim(),
        investment_type: investmentType,
        invested_amount: Number(next.invested_amount) || 0,
        current_value: Number(next.current_value) || Number(next.invested_amount) || 0,
        purchase_date: next.purchase_date || new Date().toISOString(),
        maturity_date: next.maturity_date || undefined,
        status: 'active',
        notes: next.notes || null,
        type_specific_data: next.type_specific_data || {},
        sale_details: next.sale_details || null,
        maturity_details: next.maturity_details || null,
      };
      const res = await api.post('/investments', payload);
      const newId = res.data?.investment_id;
      Alert.alert(
        'Saved',
        'Investment created.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Replace this screen with the detail screen for the new investment
              if (newId) {
                router.replace(`/investments/${newId}` as any);
              } else {
                router.back();
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to create investment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <InvestmentDetailForm
      investment={blankInvestment}
      onBack={() => router.back()}
      onSave={handleSave}
      saving={saving}
      colors={colors}
    />
  );
}
