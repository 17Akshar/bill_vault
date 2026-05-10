// Investment detail screen — uses the shared InvestmentDetailForm framework
// (`/components/investments/InvestmentDetailForm.tsx`) which renders
// category-specific fields based on the `investment_type`.
//
// Behaviour:
//   • Loaded in view-mode (read-only) by default.
//   • Tap "Edit" in the header → fields become editable; "Save" replaces "Edit".
//   • Tap "Save" → PUT to the API; on success, return to view-mode.
//   • Tap "Delete Investment" at the bottom → confirmation dialog → DELETE.

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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      setEditing(false);  // always re-enter view-mode on focus
      load();
    }, [load])
  );

  const handleSave = async (next: any) => {
    setSaving(true);
    try {
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
      setEditing(false);  // back to view-mode after save
      Alert.alert('Saved', 'Investment details updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Investment',
      'Are you sure you want to delete this investment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/investments/${id}`);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.detail || 'Failed to delete');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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
      viewMode={!editing}
      onEnterEdit={() => setEditing(true)}
      onDelete={handleDelete}
      deleting={deleting}
      colors={colors}
    />
  );
}
