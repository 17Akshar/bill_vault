/**
 * Post-login routing helper.
 *
 * Decides whether to show the MPIN setup prompt or jump straight to the
 * dashboard based on backend /api/mpin/status response.
 *
 *   is_enabled=true            -> /(tabs)/dashboard (MPIN already set)
 *   is_enabled=false
 *     & prompt_dismissed=true  -> /(tabs)/dashboard (user opted out)
 *     & prompt_dismissed=false -> /auth/mpin-setup-prompt
 *
 * Should be called immediately after a successful sign-in / register
 * instead of a naive `router.replace('/(tabs)/dashboard')`.
 *
 * Single-user-mode skips the prompt entirely (no real auth -> not meaningful).
 */
import api from './api';

export async function routeAfterLogin(
  replace: (href: any) => void,
  opts: { isSingleUser?: boolean } = {},
) {
  if (opts.isSingleUser) {
    replace('/(tabs)/dashboard');
    return;
  }
  try {
    const res = await api.get('/mpin/status');
    if (res.data?.is_enabled) {
      replace('/(tabs)/dashboard');
      return;
    }
    if (res.data?.prompt_dismissed) {
      replace('/(tabs)/dashboard');
      return;
    }
    replace('/auth/mpin-setup-prompt');
  } catch {
    // If /mpin/status fails we still want to get the user into the app
    replace('/(tabs)/dashboard');
  }
}
