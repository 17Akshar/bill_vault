/**
 * Shared "auth ready" gate.
 *
 * AuthContext bootstrap runs asynchronously on app start (reads token from
 * AsyncStorage, optionally calls /api/auth/single-user to mint one).
 *
 * Any axios request made BEFORE bootstrap finishes would read a null token
 * and hit the backend unauthenticated. The 401 response interceptor then
 * wipes the (in-flight) token — masking the race and leaving users stuck
 * on empty states for deep-linked routes (e.g. /loans).
 *
 * Usage:
 *  - `utils/api.ts` request interceptor `await waitForAuthReady()` before
 *    reading the token from AsyncStorage.
 *  - `AuthContext` calls `markAuthReady()` once bootstrap completes
 *    (success OR failure — we just need the gate to open).
 */

let _resolve: (() => void) | null = null;
let _ready = false;

const _promise: Promise<void> = new Promise<void>((res) => {
  _resolve = () => {
    _ready = true;
    res();
  };
});

// Safety net: if bootstrap somehow never finishes within 5s, open the gate
// so the app remains usable (requests will go out unauthenticated but UI
// won't hang forever).
setTimeout(() => { if (!_ready) markAuthReady(); }, 5000);

export function waitForAuthReady(): Promise<void> {
  if (_ready) return Promise.resolve();
  return _promise;
}

export function markAuthReady(): void {
  if (_ready) return;
  _resolve?.();
}

export function isAuthReady(): boolean {
  return _ready;
}
