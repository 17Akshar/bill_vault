/**
 * Firebase Phone Auth helper for Fintracker.
 *
 * Uses Firebase Web SDK's RecaptchaVerifier + signInWithPhoneNumber.
 * Phone OTP flow on web requires a reCAPTCHA v2 widget (invisible here).
 *
 * Usage:
 *   const confirmation = await sendPhoneOtp('+919876543210', 'recaptcha-container-id');
 *   // user enters code...
 *   const idToken = await verifyPhoneOtp(confirmation, '123456');
 *   // send idToken to backend /api/recovery/*
 */
import { Platform } from 'react-native';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

let _verifier: RecaptchaVerifier | null = null;

/**
 * Lazily create an invisible reCAPTCHA on the given DOM element id.
 * Must be called from a user-gesture (button click) for browsers that
 * require activation.
 */
export function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (Platform.OS !== 'web') {
    throw new Error('Phone Auth is only supported on web in this build');
  }
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase is not configured');

  if (_verifier) return _verifier;

  _verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => { /* reCAPTCHA solved - will be used in signInWithPhoneNumber */ },
    'expired-callback': () => {
      _verifier = null;
    },
  });
  return _verifier;
}

/**
 * Reset the reCAPTCHA so a new OTP flow can be started on the same screen.
 */
export function resetRecaptcha() {
  try {
    _verifier?.clear();
  } catch { /* ignore */ }
  _verifier = null;
}

/**
 * Send an SMS OTP to the given E.164 phone number.
 * Returns a ConfirmationResult which must be stored client-side and
 * then passed to verifyPhoneOtp() with the user-entered code.
 */
export async function sendPhoneOtp(
  phoneE164: string,
  recaptchaContainerId: string,
): Promise<ConfirmationResult> {
  if (Platform.OS !== 'web') {
    throw new Error(
      'Phone OTP recovery is only available on web in this build. Please open Fintracker in a browser.',
    );
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phoneE164)) {
    throw new Error('Invalid phone number. Use E.164 format (e.g., +919876543210)');
  }
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase is not configured');

  const verifier = getRecaptchaVerifier(recaptchaContainerId);
  try {
    return await signInWithPhoneNumber(auth, phoneE164, verifier);
  } catch (err: any) {
    // Common: auth/invalid-phone-number, auth/too-many-requests, auth/captcha-check-failed
    resetRecaptcha();
    const code = err?.code || '';
    if (code.includes('too-many-requests')) {
      throw new Error('Too many SMS requests. Please wait a few minutes and try again.');
    }
    if (code.includes('invalid-phone-number')) {
      throw new Error('The phone number format is invalid. Use +<country><number>.');
    }
    if (code.includes('captcha')) {
      throw new Error('reCAPTCHA failed. Please refresh and try again.');
    }
    throw new Error(err?.message || 'Failed to send OTP');
  }
}

/**
 * Verify the OTP code the user received via SMS.
 * Returns the Firebase ID token that can be forwarded to the backend.
 */
export async function verifyPhoneOtp(
  confirmation: ConfirmationResult,
  code: string,
): Promise<string> {
  if (!/^\d{4,8}$/.test(code.trim())) {
    throw new Error('OTP must be a 6-digit numeric code');
  }
  try {
    const credential = await confirmation.confirm(code.trim());
    return await credential.user.getIdToken();
  } catch (err: any) {
    const c = err?.code || '';
    if (c.includes('invalid-verification-code')) {
      throw new Error('Incorrect OTP. Please try again.');
    }
    if (c.includes('code-expired')) {
      throw new Error('OTP has expired. Please request a new one.');
    }
    throw new Error(err?.message || 'Failed to verify OTP');
  }
}
