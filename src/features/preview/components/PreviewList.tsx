"use client";

import { useEffect, useState } from "react";
import { X, FileCode } from "lucide-react";
import { usePreviewStore } from "../store/usePreviewStore";
import { localDB, type HtmlPreview } from "@/src/shared/lib/indexed-db";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function PreviewList() {
  const { isListOpen, closeList, openPreview, setHasPreview } =
    usePreviewStore();
  const conversationId = useChatStore((state) => state.conversationId);
  const [previews, setPreviews] = useState<HtmlPreview[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPreviews = async () => {
      if (!isListOpen || !conversationId) return;

      setLoading(true);
      const result = await localDB.getHtmlPreviewsByConversation(conversationId);
      if (!cancelled) {
        setPreviews(result);
        setHasPreview(result.length > 0);
        setLoading(false);
      }
    };

    void loadPreviews();

    return () => {
      cancelled = true;
    };
  }, [isListOpen, conversationId, setHasPreview]);

  const handleSelect = (preview: HtmlPreview) => {
    openPreview(preview);
  };

  if (!isListOpen) {
    return null;
  }

  return (
    <div className="w-64 flex flex-col border border-(--border-subtle) rounded-xl bg-(--surface-base)">
      <div className="flex items-center h-12 px-4 border-b border-(--border-subtle) rounded-t-xl">
        <span className="flex-1 text-sm font-medium text-(--text-primary)">
          HTML Previews
        </span>
        <button
          onClick={closeList}
          className="p-1.5 rounded-md hover:bg-(--surface-hover) transition-colors"
        >
          <X className="h-4 w-4 text-(--text-secondary)" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-(--text-tertiary)">Loading...</div>
        ) : previews.length === 0 ? (
          <div className="p-4 text-sm text-(--text-tertiary)">
            No previews in this conversation
          </div>
        ) : (
          <div className="p-2">
            {previews.map((preview) => (
              <div
                key={preview.id}
                onClick={() => handleSelect(preview)}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-(--surface-hover) cursor-pointer group transition-colors"
              >
                <FileCode className="h-5 w-5 text-(--text-tertiary) mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-(--text-primary) truncate">
                    {preview.title}
                  </div>
                  <div className="text-xs text-(--text-tertiary) mt-0.5">
                    {formatDate(preview.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
