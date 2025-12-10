"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSync } from "@/src/features/dashboard/hooks/useSync";
import type {
  DashboardStatsResponse,
  LocalDashboardStats,
} from "@/src/features/dashboard/types";
import { toast } from "@/src/shared/toast";

type SyncSectionProps = {
  localStats: LocalDashboardStats | null;
  remoteStats: DashboardStatsResponse | null;
  unauthorized: boolean;
  onSynced: () => Promise<void> | void;
};

export function SyncSection({
  localStats,
  remoteStats,
  unauthorized,
  onSynced,
}: SyncSectionProps) {
  const { sync, syncing, error, result } = useSync();

  const localConversationCount = localStats?.conversationCount ?? 0;
  const localMessageCount = localStats?.messageCount ?? 0;

  if (!localConversationCount && !localMessageCount) {
    return null;
  }

  const handleSync = async () => {
    const confirmed = window.confirm(
      "确定将本地会话同步到云端吗？同步成功后本地数据会被清除。"
    );
    if (!confirmed) return;

    const res = await sync();
    if (!res) return;

    if (res.success) {
      toast.success("同步完成，本地会话已迁移到云端。");
      await onSynced();
    } else {
      toast.error("部分会话同步失败，请稍后重试。");
    }
  };

  return (
    <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-sm px-6 py-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium tracking-wide uppercase text-(--text-tertiary)">
            本地会话
          </div>
          <div className="mt-1 text-sm text-(--text-secondary)">
            当前浏览器中保存的未登录会话数据。
          </div>
        </div>
        <div className="flex items-baseline gap-4">
          <div className="text-right">
            <div className="text-xs text-(--text-tertiary)">对话</div>
            <div className="text-lg font-semibold text-foreground">
              {localConversationCount.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-(--text-tertiary)">消息</div>
            <div className="text-lg font-semibold text-foreground">
              {localMessageCount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-(--text-tertiary)">
          {unauthorized
            ? "登录后才能将本地会话同步到云端账户。"
            : remoteStats
            ? "将本地会话同步到当前登录账号的云端会话列表中。"
            : "将本地会话同步到云端账号中。"}
        </div>
        {!unauthorized && (
          <Button
            type="button"
            size="sm"
            disabled={syncing}
            onClick={handleSync}
          >
            {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            同步到云端
          </Button>
        )}
      </div>

      {error && (
        <div className="text-xs text-destructive">
          {error}
        </div>
      )}
      {result && !result.success && result.errors && (
        <div className="text-xs text-destructive">
          {result.errors[0]}
        </div>
      )}
    </div>
  );
}
