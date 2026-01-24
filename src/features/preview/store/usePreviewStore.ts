"use client";

import { create } from "zustand";
import type { HtmlPreview } from "@/src/shared/lib/indexed-db/conversations";

type PreviewState = {
  isOpen: boolean;
  currentPreview: HtmlPreview | null;
  isListOpen: boolean;
  hasPreview: boolean;
};

type PreviewActions = {
  openPreview: (preview: HtmlPreview) => void;
  closePreview: () => void;
  openList: () => void;
  closeList: () => void;
  setHasPreview: (value: boolean) => void;
  reset: () => void;
};

export const usePreviewStore = create<PreviewState & PreviewActions>((set) => ({
  isOpen: false,
  currentPreview: null,
  isListOpen: false,
  hasPreview: false,

  openPreview: (preview) =>
    set({
      isOpen: true,
      currentPreview: preview,
      isListOpen: false,
    }),

  closePreview: () =>
    set({
      isOpen: false,
      currentPreview: null,
    }),

  openList: () =>
    set({
      isListOpen: true,
    }),

  closeList: () =>
    set({
      isListOpen: false,
    }),

  setHasPreview: (value) =>
    set({
      hasPreview: value,
    }),

  reset: () =>
    set({
      isOpen: false,
      currentPreview: null,
      isListOpen: false,
      hasPreview: false,
    }),
}));
