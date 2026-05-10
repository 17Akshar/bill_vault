// Per user request: this screen now uses the reusable InvestmentDetailForm
// framework (`/components/investments/InvestmentDetailForm.tsx`) which renders
// category-specific fields + reusable sections (Header, Summary, Gain/Loss,
// Sale/Maturity Details, Notes, Save button).
//
// The previous tab-based layout (Overview / Transactions / Notes) is preserved
// in git history; this new layout matches the reference designs supplied by
// the user (Mutual Funds, ETF, REIT, Fixed Deposit, Corporate Deposit screens).

import React, { useCallback, useState } from 'react';
import { Alert, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { InvestmentDetailForm } from '../../components/investments/InvestmentDetailForm';

export default function InvestmentDetailsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();

  const [investment, setInvestment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/investments/${id}`);
      setInvestment(res.data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to load investment');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleSave = async (next: any) => {
    setSaving(true);
    try {
      // Send only the editable subset accepted by InvestmentUpdate.
      const payload: any = {
        name: next.name,
        invested_amount: Number(next.invested_amount) || 0,
        current_value: Number(next.current_value) || 0,
        purchase_date: next.purchase_date,
        maturity_date: next.maturity_date,
        notes: next.notes,
        type_specific_data: next.type_specific_data || {},
        sale_details: next.sale_details || null,
        maturity_details: next.maturity_details || null,
      };
      const res = await api.put(`/investments/${id}`, payload);
      setInvestment(res.data);
      Alert.alert('Saved', 'Investment details updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !investment) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <View>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <InvestmentDetailForm
      investment={investment}
      onBack={() => router.back()}
      onSave={handleSave}
      saving={saving}
      colors={colors}
    />
  );
}
