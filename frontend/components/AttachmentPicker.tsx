/**
 * AttachmentPicker
 *
 * Lets the user pick an image from gallery or camera, uploads it to the
 * backend, and shows a thumbnail preview with a remove button.
 *
 * Parent owns the resulting `attachment_url` string. We expose:
 *   - value: current URL (relative or absolute) — null/empty when not set
 *   - onChange(next: string | null): called with the URL after a successful
 *     upload, or null after the user removes the attachment.
 *
 * UX:
 *   [ Camera ] [ Gallery ]   ← when nothing is attached
 *   [ thumb 64×64 ] receipt.jpg    [×]   ← after upload
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  pickImageFromGallery,
  pickImageFromCamera,
  uploadAttachment,
  absolutizeUrl,
} from '../utils/uploadAttachment';

type Colors = {
  text: string;
  textSecondary: string;
  card: string;
  border: string;
  primary: string;
};

interface Props {
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  colors: Colors;
}

export default function AttachmentPicker({ value, onChange, colors }: Props) {
  const [busy, setBusy] = useState(false);

  const handlePick = async (source: 'camera' | 'gallery') => {
    if (busy) return;
    try {
      setBusy(true);
      const asset =
        source === 'camera' ? await pickImageFromCamera() : await pickImageFromGallery();
      if (!asset) return;
      const result = await uploadAttachment(asset);
      onChange(result.attachment_url);
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not upload attachment');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => onChange(null);

  if (value) {
    return (
      <View
        style={[
          styles.attachedRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        testID="attachment-attached"
      >
        <Image source={{ uri: absolutizeUrl(value) }} style={styles.thumb} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.attachedTitle, { color: colors.text }]} numberOfLines={1}>
            Receipt attached
          </Text>
          <Text
            style={[styles.attachedSub, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            Tap × to remove
          </Text>
        </View>
        <TouchableOpacity
          onPress={remove}
          testID="attachment-remove"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.btnRow}>
      <TouchableOpacity
        testID="attachment-camera"
        style={[
          styles.pickerBtn,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => handlePick('camera')}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <>
            <Ionicons name="camera-outline" size={20} color={colors.primary} />
            <Text style={[styles.pickerLabel, { color: colors.text }]}>Camera</Text>
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        testID="attachment-gallery"
        style={[
          styles.pickerBtn,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => handlePick('gallery')}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <>
            <Ionicons name="image-outline" size={20} color={colors.primary} />
            <Text style={[styles.pickerLabel, { color: colors.text }]}>Gallery</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  attachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#00000022',
  },
  attachedTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  attachedSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
