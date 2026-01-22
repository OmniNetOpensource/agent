'use client';

import { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';
import { insertQuote } from '../lib/active-input';

export function SelectionQuotePopup() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';

      if (!text || text.length === 0) {
        setPosition(null);
        setSelectedText('');
        return;
      }

      // 检查选中的内容是否在输入框内，如果是则不显示
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
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
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
      className="fixed z-50 flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded shadow-lg hover:bg-primary/90 transition-colors -translate-x-1/2 -translate-y-full"
      style={{ left: position.x, top: position.y }}
    >
      <Quote className="w-3 h-3" />
      引用
    </button>
  );
}
