import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

export type ScreenRefreshOptions = {
  enabled?: boolean;
  runOnFocus?: boolean;
  runOnMount?: boolean;
};

/**
 * Shared helper to handle pull-to-refresh and refetch on screen focus.
 * Pass a stable callback (useCallback) that performs your data loading.
 */
export function useScreenRefresh(refreshFn: () => Promise<void> | void, options: ScreenRefreshOptions = {}) {
  const { enabled = true, runOnFocus = true, runOnMount = true } = options;
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setRefreshing(true);
    try {
      await refreshFn();
    } catch (err) {
      console.error("[useScreenRefresh] refresh error", err);
    } finally {
      setRefreshing(false);
    }
  }, [enabled, refreshFn]);

  useFocusEffect(
    useCallback(() => {
      if (!runOnFocus || !enabled) return;
      void refresh();
    }, [enabled, refresh, runOnFocus])
  );

  useEffect(() => {
    if (!runOnMount || !enabled) return;
    void refresh();
  }, [enabled, refresh, runOnMount]);

  return { refreshing, refresh } as const;
}
