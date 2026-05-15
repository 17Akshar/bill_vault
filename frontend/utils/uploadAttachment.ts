/**
 * Helpers for picking + uploading transaction attachments.
 *
 * Uses expo-image-picker for camera/gallery, then POSTs the file as
 * multipart/form-data to /api/uploads/attachment. Returns the URL the
 * backend gives back (Firebase Storage public URL or local-fallback path).
 */
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL;

export type PickedAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export type UploadResult = {
  attachment_url: string;        // raw URL/path returned by backend
  display_url: string;           // absolute URL safe to render in <Image>
  size: number;
  content_type: string;
  storage: 'firebase' | 'local';
};

export async function pickImageFromGallery(): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Please allow photo library access.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.85,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    fileName: a.fileName || `image_${Date.now()}.jpg`,
    mimeType: a.mimeType || 'image/jpeg',
  };
}

export async function pickImageFromCamera(): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Please allow camera access.');
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    fileName: a.fileName || `camera_${Date.now()}.jpg`,
    mimeType: a.mimeType || 'image/jpeg',
  };
}

/** Convert a relative `/api/...` URL to an absolute display URL. */
export function absolutizeUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BACKEND_URL}${url}`;
}

export async function uploadAttachment(asset: PickedAsset): Promise<UploadResult> {
  const token = await AsyncStorage.getItem('auth_token');

  const form = new FormData();
  if (Platform.OS === 'web') {
    // On web, fetch the local URI to a Blob so FormData handles it correctly.
    const blob = await (await fetch(asset.uri)).blob();
    form.append('file', new File([blob], asset.fileName, { type: asset.mimeType }));
  } else {
    // React Native: pass the URI object directly (expo's standard pattern)
    // @ts-expect-error — RN-specific FormData file shape, not in web types
    form.append('file', { uri: asset.uri, name: asset.fileName, type: asset.mimeType });
  }

  const res = await fetch(`${BACKEND_URL}/api/uploads/attachment`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return {
    attachment_url: data.attachment_url,
    display_url: absolutizeUrl(data.attachment_url),
    size: data.size,
    content_type: data.content_type,
    storage: data.storage,
  };
}
