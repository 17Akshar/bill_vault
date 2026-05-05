/**
 * LabelsInput
 *
 * Chip-style multi-tag input for transaction labels.
 * - Type a label and press space/comma/Enter (or tap Add) to commit it as a chip
 * - Tap the X on a chip to remove
 * - Tap a suggestion (pulled from the user's previously-used labels via /api/labels)
 *   to add it instantly
 * - Free-text comma-separated paste also works ("groceries, work, urgent")
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

type Colors = {
  text: string;
  textSecondary: string;
  card: string;
  border: string;
  primary: string;
  background: string;
};

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  colors: Colors;
  placeholder?: string;
  /** If false, the suggestions row is hidden. Defaults to true. */
  showSuggestions?: boolean;
}

const MAX_LABEL_LEN = 24;
const MAX_LABELS = 12;

const dedupe = (arr: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const k = x.trim();
    if (!k) continue;
    const lk = k.toLowerCase();
    if (seen.has(lk)) continue;
    seen.add(lk);
    out.push(k.slice(0, MAX_LABEL_LEN));
  }
  return out.slice(0, MAX_LABELS);
};

export default function LabelsInput({
  value,
  onChange,
  colors,
  placeholder = 'Type a label and press Enter…',
  showSuggestions = true,
}: Props) {
  const [draft, setDraft] = useState('');
  const [allLabels, setAllLabels] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    if (!showSuggestions) return;
    api
      .get('/labels')
      .then((res) => {
        if (alive) setAllLabels(res.data?.labels || []);
      })
      .catch(() => {
        /* non-fatal */
      });
    return () => {
      alive = false;
    };
  }, [showSuggestions]);

  const commitDraft = (raw?: string) => {
    const text = (raw ?? draft).trim();
    if (!text) {
      setDraft('');
      return;
    }
    // Allow comma-separated paste
    const parts = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    onChange(dedupe([...value, ...parts]));
    setDraft('');
  };

  const removeAt = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const handleKeyPress = (e: any) => {
    // On web, capture comma + space + Enter
    const key = e?.nativeEvent?.key;
    if (key === ' ' || key === ',') {
      e.preventDefault?.();
      commitDraft();
    }
  };

  const suggestions = allLabels.filter(
    (l) => !value.some((v) => v.toLowerCase() === l.toLowerCase()),
  );

  return (
    <View>
      {/* Chip row + input */}
      <View
        style={[
          styles.chipBox,
          { borderColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        {value.map((lab, idx) => (
          <View
            key={`${lab}-${idx}`}
            testID={`label-chip-${idx}`}
            style={[styles.chip, { backgroundColor: colors.primary + '22' }]}
          >
            <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>
              {lab}
            </Text>
            <TouchableOpacity
              onPress={() => removeAt(idx)}
              testID={`label-chip-remove-${idx}`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="close-circle" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ))}
        <TextInput
          testID="label-input"
          style={[styles.input, { color: colors.text }]}
          placeholder={value.length === 0 ? placeholder : ''}
          placeholderTextColor={colors.textSecondary}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => commitDraft()}
          onKeyPress={handleKeyPress}
          onBlur={() => commitDraft()}
          blurOnSubmit={false}
          returnKeyType="done"
          maxLength={MAX_LABEL_LEN}
        />
      </View>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsWrap}>
          <Text style={[styles.suggestLabel, { color: colors.textSecondary }]}>
            Recently used
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {suggestions.slice(0, 20).map((s) => (
              <TouchableOpacity
                key={s}
                testID={`label-suggest-${s}`}
                onPress={() => commitDraft(s)}
                style={[
                  styles.suggestChip,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.text, fontSize: 12 }}>+ {s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 52,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 160,
  },
  input: {
    flexGrow: 1,
    minWidth: 100,
    fontSize: 15,
    paddingVertical: 6,
  },
  suggestionsWrap: {
    marginTop: 8,
  },
  suggestLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  suggestChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
});
