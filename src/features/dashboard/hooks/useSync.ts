"use client";

import { useCallback } from "react";
import type { SyncResponse } from "@/src/features/dashboard/types";

type UseSyncReturn = {
  sync: () => Promise<SyncResponse | null>;
  syncing: boolean;
  error: string | null;
  result: SyncResponse | null;
  disabled: boolean;
};

export function useSync(): UseSyncReturn {
  const sync = useCallback(async () => null, []);

  return {
    sync,
    syncing: false,
    error: null,
    result: null,
    disabled: true,
  };
}
