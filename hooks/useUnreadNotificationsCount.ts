// hooks/useUnreadNotificationsCount.ts
import { useCallback, useEffect, useState } from "react";
import { listUnreadNotifications } from "../lib/notifications";

type UnreadResult = {
  unreadCount: number;
  isLoading: boolean;
  reload: () => Promise<void>;
};

/**
 * Busca quantidade de notificações não lidas do usuário.
 * Hoje faz pooling simples; em fases futuras podemos usar onSnapshot ou FCM.
 */
export function useUnreadNotificationsCount(
  usuarioId: string | null | undefined
): UnreadResult {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!usuarioId) return;
    try {
      setIsLoading(true);
      const unread = await listUnreadNotifications(usuarioId);
      setUnreadCount(unread.length);
    } catch (err) {
      console.error("Erro ao carregar notificações não lidas:", err);
    } finally {
      setIsLoading(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { unreadCount, isLoading, reload };
}
