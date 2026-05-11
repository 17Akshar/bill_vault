// Section 6: Save Button — full-width primary CTA at the bottom of the form.
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface SaveButtonProps {
  onPress: () => void;
  loading?: boolean;
  label?: string;
  disabled?: boolean;
  colors: any;
}

export const SaveButton = ({
  onPress,
  loading,
  label = 'Save Changes',
  disabled,
  colors,
}: SaveButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={loading || disabled}
    activeOpacity={0.85}
    style={[styles.btn, { backgroundColor: colors.primary, opacity: disabled || loading ? 0.7 : 1 }]}
    testID="invdetail-save-btn"
  >
    {loading ? (
      <ActivityIndicator color="#FFF" />
    ) : (
      <Text style={styles.label}>{label}</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    height: 52,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
