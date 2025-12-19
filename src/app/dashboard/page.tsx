"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { LocalDashboardStats } from "@/src/features/dashboard/types";
import { localDB } from "@/src/shared/lib/indexed-db";
import { SyncSection } from "@/src/features/dashboard/components/SyncSection";

export default function DashboardPage() {
  const [localStats, setLocalStats] = useState<LocalDashboardStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const stats = await localDB.getStats();

        if (!isMounted) return;
        setLocalStats({
          conversationCount: stats.conversationCount,
          messageCount: stats.messageCount,
        });
      } catch {
        if (!isMounted) return;
        setError("加载统计数据失败");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col px-6 py-6">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">
            Dashboard / 数据面板
          </h1>
          <p className="text-sm text-(--text-secondary)">
            查看你在云端和本地保存的会话与消息数量。
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-sm px-6 py-5 flex items-center gap-3 text-sm text-(--text-secondary)">
            <Loader2 className="h-4 w-4 animate-spin text-(--text-tertiary)" />
            <span>加载中...</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && localStats && (
          <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-sm px-6 py-6 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium tracking-wide uppercase text-(--text-tertiary)">
                本地会话
              </div>
              <div className="mt-2 flex items-baseline gap-6">
                <div>
                  <div className="text-xs text-(--text-tertiary)">对话</div>
                  <div className="text-2xl font-bold text-foreground">
                    {localStats.conversationCount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-(--text-tertiary)">用户消息</div>
                  <div className="text-2xl font-bold text-foreground">
                    {localStats.messageCount.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-1 text-xs text-(--text-secondary)">
                统计范围：当前浏览器本地保存的会话与消息。
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <SyncSection
            localStats={localStats}
            onSynced={async () => {
              try {
                const localRes = await localDB.getStats();
                setLocalStats({
                  conversationCount: localRes.conversationCount,
                  messageCount: localRes.messageCount,
                });
              } catch {
                // ignore refresh error after sync
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
