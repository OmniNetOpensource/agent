"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Terminal } from "lucide-react";
import type { Tool, ToolProgress } from "@/src/features/chat/types/chat";
import { getToolLifecycle } from "../utils";

// ============================================================================
// Types & Utilities
// ============================================================================

type FetchStatus = "pending" | "complete" | "error";

type LogTone = "info" | "success" | "warning" | "error";

const formatKilobytes = (bytes?: number) => {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) {
    return "";
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const deriveTone = (stage: string): LogTone => {
  if (stage === "error") return "error";
  if (stage === "complete") return "success";
  if (stage === "start") return "warning";
  return "info";
};

const formatLogText = (entry: ToolProgress) => {
  const text = entry.message?.trim() || entry.stage;
  if (entry.receivedBytes === undefined) {
    return text;
  }

  const received = formatKilobytes(entry.receivedBytes);
  const total = formatKilobytes(entry.totalBytes);
  const suffix =
    received && total
      ? ` (${received} / ${total})`
      : received
      ? ` (${received})`
      : "";

  return `${text}${suffix}`;
};

function tryGetHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ============================================================================
// FetchTerminal Component (Internal)
// ============================================================================

interface FetchTerminalProps {
  url: string;
  status: FetchStatus;
  progress?: ToolProgress[];
}

const FetchTerminal: React.FC<FetchTerminalProps> = ({
  url,
  status = "pending",
  progress = [],
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const onToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [progress.length, status]);

  const logs =
    progress.length > 0
      ? progress.map((entry, index) => ({
          id: `${entry.stage}-${index}-${entry.receivedBytes ?? "na"}`,
          text: formatLogText(entry),
          tone: deriveTone(entry.stage),
        }))
      : [
          {
            id: "waiting",
            text: "等待真实进度事件...",
            tone: "info" as LogTone,
          },
        ];

  const finalStatusTone =
    status === "error" ? "error" : status === "complete" ? "success" : "info";

  const getColor = (tone: LogTone) => {
    switch (tone) {
      case "success":
        return "text-(--color-success) font-bold";
      case "warning":
        return "text-(--color-warning)";
      case "error":
        return "text-(--color-destructive) font-bold";
      default:
        return "text-(--color-info)";
    }
  };

  return (
    <div className="w-full font-mono text-xs sm:text-sm my-2 relative group">
      <div className="bg-(--surface-muted) rounded-lg overflow-hidden border border-(--border-subtle) shadow-soft relative z-[var(--z-card-inner)] transition-colors duration-300">
        <div
          onClick={onToggle}
          className="bg-(--surface-card) px-4 py-2 flex items-center justify-between border-b border-(--border-subtle) cursor-pointer hover:bg-(--surface-hover) transition-colors"
        >
          <div className="flex items-center gap-3 text-(--text-secondary)">
            <Terminal className="w-3 h-3 text-(--color-brand)" />
            <span className="opacity-80 font-medium tracking-tight text-(--text-tertiary)">
              fetch {tryGetHostname(url)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-(--text-tertiary) text-[11px] font-semibold uppercase tracking-widest">
            {status}
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e]/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-[#d89e24]/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840] border border-[#1aab29]/50"></div>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className={`relative p-4 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-(--border-hover) scrollbar-track-transparent transition-all duration-300 ease-in-out font-mono ${
            isExpanded ? "h-56 opacity-100" : "h-0 p-0 opacity-0 hidden"
          }`}
        >
          <div className="relative z-[var(--z-card-inner)] space-y-1">
            <AnimatePresence mode="popLayout">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-start gap-2 ${getColor(log.tone)}`}
                >
                  <span className="text-(--text-tertiary) shrink-0 select-none font-bold">
                    &gt;
                  </span>
                  <span className="break-all font-medium tracking-tight">
                    {log.text}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {status === "pending" && (
              <motion.div
                className="flex items-center gap-2 text-(--text-tertiary) mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-(--text-tertiary) shrink-0">&gt;</span>
                <span className="animate-pulse">数据流等待中...</span>
              </motion.div>
            )}

            {status !== "pending" && (
              <div
                className={`mt-3 flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold ${getColor(
                  finalStatusTone
                )}`}
              >
                <div className="w-2 h-2 rounded-full bg-current" />
                {status === "complete"
                  ? "数据获取完成"
                  : status === "error"
                  ? "获取失败"
                  : "状态更新"}
              </div>
            )}


            {status === "error" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 pt-2 text-(--color-destructive) text-xs uppercase tracking-wider font-bold flex items-center gap-2"
              >
                <div className="w-2 h-2 bg-(--color-destructive) rounded-full animate-pulse" />
                Connection Terminated
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FetchUrl Component (Main Export)
// ============================================================================

type FetchUrlProps = {
  tool: Tool;
};

export function FetchUrl({ tool }: FetchUrlProps) {
  const { progress, result } = getToolLifecycle(tool);
  const url =
    typeof tool.call.args.url === "string" ? tool.call.args.url : "Unknown URL";
  const latestProgress = progress[progress.length - 1];

  const status: FetchStatus = result
    ? result.result.startsWith("Error")
      ? "error"
      : "complete"
    : latestProgress?.stage === "error"
    ? "error"
    : "pending";

  return (
    <div className="px-4">
      <FetchTerminal url={url} status={status} progress={progress} />
    </div>
  );
}
