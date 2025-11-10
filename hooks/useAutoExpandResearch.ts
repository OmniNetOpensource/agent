import { useEffect, useRef } from "react";
import type { Message } from "@/types/chat";

type AutoExpandResult = {
  expandedResearch: Set<number>;
  expandedItems: Set<string>;
  containerRef: React.RefObject<HTMLDivElement>;
  setExpandedResearch: React.Dispatch<React.SetStateAction<Set<number>>>;
  setExpandedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export function useAutoExpandResearch(
  messages: Message[],
  expandedResearch: Set<number>,
  expandedItems: Set<string>,
  setExpandedResearch: React.Dispatch<React.SetStateAction<Set<number>>>,
  setExpandedItems: React.Dispatch<React.SetStateAction<Set<string>>>
): React.RefObject<HTMLDivElement> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastSnapshotRef = useRef({
    assistantIndex: -1,
    researchCount: 0,
  });

  useEffect(() => {
    if (messages.length === 0) {
      queueMicrotask(() => {
        setExpandedResearch((prev) => (prev.size === 0 ? prev : new Set()));
        setExpandedItems((prev) => (prev.size === 0 ? prev : new Set()));
      });
      lastSnapshotRef.current = { assistantIndex: -1, researchCount: 0 };
      return;
    }

    let lastAssistantIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantIndex = i;
        break;
      }
    }

    if (lastAssistantIndex < 0) {
      return;
    }

    const blocks = messages[lastAssistantIndex].blocks;
    let lastResearchBlockIndex = -1;
    let researchCount = 0;

    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].type === "research") {
        researchCount++;
        lastResearchBlockIndex = i;
      }
    }

    const prev = lastSnapshotRef.current;

    if (lastResearchBlockIndex < 0) {
      if (lastAssistantIndex !== prev.assistantIndex) {
        queueMicrotask(() => {
          setExpandedResearch((prev) => (prev.size === 0 ? prev : new Set()));
          setExpandedItems((prev) => (prev.size === 0 ? prev : new Set()));
        });
        lastSnapshotRef.current = {
          assistantIndex: lastAssistantIndex,
          researchCount: 0,
        };
      }
      return;
    }

    if (
      lastAssistantIndex !== prev.assistantIndex ||
      researchCount > prev.researchCount
    ) {
      const researchKey = Number(
        `${lastAssistantIndex}${lastResearchBlockIndex}`
      );
      const researchBlock = blocks[lastResearchBlockIndex];
      if (researchBlock.type !== "research") {
        return;
      }
      const lastItemIndex = researchBlock.items.length - 1;
      const itemKey = `${lastAssistantIndex}-${lastResearchBlockIndex}-${lastItemIndex}`;

      queueMicrotask(() => {
        setExpandedResearch(new Set([researchKey]));
        setExpandedItems(new Set([itemKey]));
      });

      lastSnapshotRef.current = {
        assistantIndex: lastAssistantIndex,
        researchCount,
      };

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (el) {
          el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        }
      });
    }
  }, [messages, setExpandedResearch, setExpandedItems]);

  return containerRef;
}
