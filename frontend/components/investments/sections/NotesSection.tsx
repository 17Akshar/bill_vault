// Section 5: Notes Section — multi-line free-form notes.
import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';

interface NotesSectionProps {
  value: string;
  onChange: (next: string) => void;
  editable: boolean;
  colors: any;
}

export const NotesSection = ({ value, onChange, editable, colors }: NotesSectionProps) => (
  <View style={styles.wrap}>
    <Text style={[styles.heading, { color: colors.text }]}>Notes</Text>
    <View style={[styles.box, { backgroundColor: colors.card }]} testID="invdetail-notes-box">
      {editable ? (
        <TextInput
          multiline
          numberOfLines={4}
          value={value || ''}
          onChangeText={onChange}
          placeholder="Add any notes about this investment…"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text }]}
          testID="invdetail-notes-input"
        />
      ) : (
        <Text
          style={[
            styles.text,
            { color: value ? colors.text : colors.textSecondary, fontStyle: value ? 'normal' : 'italic' },
          ]}
        >
          {value || 'No notes yet.'}
        </Text>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  heading: {
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  box: {
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    minHeight: 90,
  },
  input: { fontSize: 14, lineHeight: 20, textAlignVertical: 'top', minHeight: 70 },
  text: { fontSize: 14, lineHeight: 20 },
});
