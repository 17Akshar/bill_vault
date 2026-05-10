// Section 1: Investment Header — back button + category title + top-right Save link.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InvestmentHeaderProps {
  title: string;
  onBack: () => void;
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  colors: any;
}

export const InvestmentHeader = ({
  title,
  onBack,
  onSave,
  saving,
  saveLabel = 'Save',
  colors,
}: InvestmentHeaderProps) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.backBtn} testID="invdetail-back-btn">
      <Ionicons name="arrow-back" size={24} color={colors.text} />
    </TouchableOpacity>
    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
      {title}
    </Text>
    {onSave ? (
      <TouchableOpacity
        onPress={onSave}
        disabled={saving}
        style={styles.saveLink}
        testID="invdetail-header-save-btn"
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.saveText, { color: colors.primary }]}>{saveLabel}</Text>
        )}
      </TouchableOpacity>
    ) : (
      <View style={styles.saveLink} />
    )}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginHorizontal: 12 },
  saveLink: { width: 56, alignItems: 'flex-end', padding: 4 },
  saveText: { fontSize: 15, fontWeight: '600' },
});
