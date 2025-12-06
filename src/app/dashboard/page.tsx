"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { DashboardStatsResponse } from "@/src/features/dashboard/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        setUnauthorized(false);

        const response = await fetch("/api/dashboard/stats", {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 401) {
          if (!isMounted) return;
          setUnauthorized(true);
          setStats(null);
          return;
        }

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          if (!isMounted) return;
          setError(data?.error ?? "加载统计数据失败");
          setStats(null);
          return;
        }

        const data = (await response.json()) as DashboardStatsResponse;
        if (!isMounted) return;
        setStats(data);
      } catch {
        if (!isMounted) return;
        setError("加载统计数据失败");
        setStats(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();

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
            查看你在所有会话中发送的用户消息总数。
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-sm px-6 py-5 flex items-center gap-3 text-sm text-(--text-secondary)">
            <Loader2 className="h-4 w-4 animate-spin text-(--text-tertiary)" />
            <span>加载中...</span>
          </div>
        )}

        {!loading && unauthorized && (
          <div className="rounded-2xl border border-dashed border-(--border-subtle) bg-(--surface-base)/70 px-6 py-5 text-sm text-(--text-secondary)">
            <div className="text-base font-medium text-foreground mb-1.5">
              请先登录以查看统计数据
            </div>
            <div className="text-xs text-(--text-tertiary)">
              登录后，我们会统计你在所有会话中发送的用户消息数量，并在此处展示。
            </div>
          </div>
        )}

        {!loading && !unauthorized && error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !unauthorized && !error && stats && (
          <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-sm px-6 py-6 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium tracking-wide uppercase text-(--text-tertiary)">
                总共发送的用户消息
              </div>
              <div className="mt-2 text-4xl font-bold text-foreground">
                {stats.userMessageCount.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-(--text-secondary)">
                统计范围：当前账号下所有会话中的用户角色消息。
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
