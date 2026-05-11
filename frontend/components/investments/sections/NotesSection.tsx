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
    <Text style={styles.heading}>Notes</Text>
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
  wrap: { marginTop: 0 },
  heading: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  box: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    minHeight: 90,
  },
  input: { fontSize: 14, lineHeight: 20, textAlignVertical: 'top', minHeight: 70 },
  text: { fontSize: 14, lineHeight: 20 },
});
