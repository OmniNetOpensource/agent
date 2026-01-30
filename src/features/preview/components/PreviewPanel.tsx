"use client";

import { X, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";
import { usePreviewStore } from "../store/usePreviewStore";
import { useResponsive } from "@/src/shared/responsive/ResponsiveContext";

export function PreviewPanel() {
  const { isOpen, currentPreview, closePreview } = usePreviewStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const deviceType = useResponsive();
  const isDesktop = deviceType === "desktop";

  if (!isOpen || !currentPreview) {
    return null;
  }

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const toggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  const panelClasses = !isDesktop || isMaximized
    ? "fixed inset-0 z-50 bg-(--surface-primary) flex flex-col"
    : "w-[500px] flex flex-col border border-(--border-primary) rounded-xl bg-(--surface-primary)";

  return (
    <div className={panelClasses}>
      <div className="flex items-center h-12 px-3 border-b border-(--border-primary) rounded-t-xl">
        <span className="flex-1 text-sm font-medium truncate text-(--text-primary)">
          {currentPreview.title}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-md hover:bg-(--surface-hover) transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-(--text-secondary)" />
          </button>
          {isDesktop && (
            <button
              onClick={toggleMaximize}
              className="p-1.5 rounded-md hover:bg-(--surface-hover) transition-colors"
              title={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4 text-(--text-secondary)" />
              ) : (
                <Maximize2 className="h-4 w-4 text-(--text-secondary)" />
              )}
            </button>
          )}
          <button
            onClick={closePreview}
            className="p-1.5 rounded-md hover:bg-(--surface-hover) transition-colors"
            title="Close"
          >
            <X className="h-4 w-4 text-(--text-secondary)" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 rounded-b-xl overflow-hidden">
        <iframe
          key={refreshKey}
          srcDoc={currentPreview.html}
          sandbox="allow-scripts"
          className="w-full h-full border-0 bg-white"
          title={currentPreview.title}
        />
      </div>
    </div>
  );
}
