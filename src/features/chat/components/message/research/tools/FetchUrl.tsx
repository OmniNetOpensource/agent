import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, Terminal } from "lucide-react";
import type { ResearchItem } from "@/src/features/chat/types/chat";

// ============================================================================
// Types & Utilities
// ============================================================================

type FetchStatus = "pending" | "complete" | "error";

type FetchProgress = {
  stage: string;
  message: string;
  receivedBytes?: number;
  totalBytes?: number;
};

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

const formatLogText = (entry: FetchProgress) => {
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
  result?: string;
  progress?: FetchProgress[];
  isExpanded?: boolean;
  onToggle?: () => void;
}

const FetchTerminal: React.FC<FetchTerminalProps> = ({
  url,
  status = "pending",
  result,
  progress = [],
  isExpanded = true,
  onToggle,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

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
      <div className="bg-(--surface-muted) rounded-lg overflow-hidden border border-(--border-subtle) shadow-soft relative z-10 transition-colors duration-300">
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
          <div className="relative z-10 space-y-1">
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

            {status === "complete" && result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-4 pt-3 border-t border-dashed border-(--border-subtle)"
              >
                <div className="text-(--color-success) mb-2 flex items-center gap-2 text-xs uppercase tracking-wider font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>内容预览</span>
                  <div className="h-px flex-1 bg-linear-to-r from-(--color-success) to-transparent opacity-30" />
                </div>
                <div className="bg-background rounded p-3 border-l-2 border-(--color-success) text-(--text-secondary) font-mono text-[11px] leading-relaxed break-all">
                  <div className="opacity-50 mb-1 text-[10px]">
                    DATA_STREAM:
                  </div>
                  {result.slice(0, 300)}
                  {result.length > 300 ? "..." : ""}
                </div>
              </motion.div>
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
  item: Extract<ResearchItem, { kind: "tool_call" }>;
  items: ResearchItem[];
  itemIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
};

export function FetchUrl({
  item,
  items,
  itemIndex,
  isExpanded,
  onToggle,
}: FetchUrlProps) {
  // Find subsequent items until we hit the result
  const subsequentItems = items.slice(itemIndex + 1);
  const resultIndex = subsequentItems.findIndex(
    (candidate) =>
      candidate.kind === "tool_result" && candidate.tool === "fetch_url"
  );

  const itemsUntilResult =
    resultIndex >= 0
      ? subsequentItems.slice(0, resultIndex + 1)
      : subsequentItems;

  const resultItem = itemsUntilResult.find(
    (candidate): candidate is Extract<ResearchItem, { kind: "tool_result" }> =>
      candidate.kind === "tool_result" && candidate.tool === "fetch_url"
  );

  const progressItems = itemsUntilResult.filter(
    (candidate): candidate is Extract<ResearchItem, { kind: "tool_progress" }> =>
      candidate.kind === "tool_progress" && candidate.tool === "fetch_url"
  );

  const url = typeof item.args.url === "string" ? item.args.url : "Unknown URL";
  const latestProgress = progressItems[progressItems.length - 1];

  const status: "pending" | "complete" | "error" = resultItem
    ? resultItem.result.startsWith("Error")
      ? "error"
      : "complete"
    : latestProgress?.stage === "error"
    ? "error"
    : "pending";

  return (
    <div className="animate-enter-down px-4">
      <FetchTerminal
        url={url}
        status={status}
        result={resultItem?.result}
        progress={progressItems.map((progress) => ({
          stage: progress.stage,
          message: progress.message,
          receivedBytes: progress.receivedBytes,
          totalBytes: progress.totalBytes,
        }))}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />
    </div>
  );
}
