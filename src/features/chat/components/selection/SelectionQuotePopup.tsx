'use client';

import { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';
import { insertQuote } from '@/src/features/chat/lib/input';

export function SelectionQuotePopup() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const handleMouseUp = () => {
      // 延迟一帧确保 selection 已更新
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() || '';

        if (!text || text.length === 0) {
          setPosition(null);
          setSelectedText('');
          return;
        }

        // 检查选中内容是否在输入框内
        const anchorNode = selection?.anchorNode;
        if (anchorNode) {
          const element = anchorNode.nodeType === Node.TEXT_NODE
            ? anchorNode.parentElement
            : anchorNode as Element;
          if (element?.closest('textarea, input, [contenteditable="true"]')) {
            setPosition(null);
            setSelectedText('');
            return;
          }
        }

        try {
          const range = selection?.getRangeAt(0);
          if (range) {
            const rect = range.getBoundingClientRect();
            setPosition({
              x: rect.left + rect.width / 2,
              y: rect.top - 8,
            });
            setSelectedText(text);
          }
        } catch {
          setPosition(null);
          setSelectedText('');
        }
      });
    };

    const handleMouseDown = () => {
      setPosition(null);
      setSelectedText('');
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const handleClick = () => {
    if (selectedText) {
      insertQuote(selectedText);
      window.getSelection()?.removeAllRanges();
      setPosition(null);
      setSelectedText('');
    }
  };

  if (!position || !selectedText) return null;

  return (
    <button
      onClick={handleClick}
      className="fixed z-50 flex items-center gap-1 px-2 py-1 text-xs bg-[var(--interactive-primary)] text-[var(--text-primary)] rounded shadow-lg hover:bg-[var(--interactive-primary-hover)] transition-colors -translate-x-1/2 -translate-y-full"
      style={{ left: position.x, top: position.y }}
    >
      <Quote className="w-3 h-3" />
      引用
    </button>
  );
}
