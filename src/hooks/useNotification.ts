import { useState } from 'react';

type NotificationType = 'success' | 'error';

interface Notification {
  type: NotificationType;
  text: string;
}

export function useNotification(initial?: Notification | null) {
  const [notification, setNotification] = useState<Notification | null>(initial ?? null);

  const notify = (type: NotificationType, text: string) => setNotification({ type, text });
  const clear = () => setNotification(null);

  return { notification, notify, clear } as const;
}
