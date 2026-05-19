/**
 * /reminders/all — redirects to the canonical Reminders screen (/reminders).
 * All navigation that previously targeted this route continues to work.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function RemindersAllRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/reminders' as any);
  }, []);
  return null;
}
