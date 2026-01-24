"use client";

import { FolderOpen } from "lucide-react";
import { usePreviewStore } from "../store/usePreviewStore";

export function PreviewButton() {
  const openList = usePreviewStore((state) => state.openList);
  const hasPreview = usePreviewStore((state) => state.hasPreview);

  if (!hasPreview) {
    return null;
  }

  return (
    <button
      onClick={openList}
      className="p-2 rounded-lg hover:bg-(--surface-hover) transition-colors"
      title="View HTML Previews"
    >
      <FolderOpen className="h-5 w-5 text-(--text-secondary)" />
    </button>
  );
}
