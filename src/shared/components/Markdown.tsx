"use client";

import { isValidElement, type ReactElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import CodeBlock from "@/src/shared/components/CodeBlock";
import { cx } from "@/src/shared/utils/cx";

type Props = {
  content: string;
};

const extractLanguage = (className?: string) => {
  if (!className) return "";
  const match = className.match(/language-([\w-]+)/);
  if (match) return match[1];
  return className.trim().split(/\s+/)[0];
};

const extractCodeFromNode = (node: ReactNode): string => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) {
    return node.map(extractCodeFromNode).join("");
  }
  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>;
    return extractCodeFromNode(element.props.children);
  }
  return "";
};

export default function Markdown({ content }: Props) {
  return (
    <div className="prose prose-md max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          a: ({ className, ...props }) => (
            <a
              {...props}
              className={cx(
                "text-(--color-primary) underline underline-offset-2 hover:text-(--color-primary-hover)",
                className
              )}
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          pre: ({ className, children }) => {
            const childArray = Array.isArray(children) ? children : [children];
            const codeElement = childArray.find(
              (child): child is ReactElement<{
                className?: string;
                children?: ReactNode;
              }> => isValidElement(child)
            );

            const language = extractLanguage(
              codeElement?.props.className || className
            );
            const rawCode = extractCodeFromNode(
              codeElement?.props.children ?? children
            );

            return (
              <CodeBlock
                language={language}
                code={rawCode}
                className={className}
              >
                {children}
              </CodeBlock>
            );
          },
          code: ({ className, ...props }) => {
            const isInline = !className || !className.includes("language-");
            if (isInline) {
              return (
                <code
                  {...props}
                  className="rounded-md bg-(--code-inline-bg) px-1.5 py-0.5 font-mono text-[0.85em] text-(--text-code)"
                />
              );
            }
            return <code {...props} className={className} />;
          },
          table: ({ className, ...props }) => (
            <div className="overflow-x-auto">
              <table
                {...props}
                className={cx(
                  "w-full border-collapse text-left text-sm",
                  className
                )}
              />
            </div>
          ),
          th: ({ className, ...props }) => (
            <th
              {...props}
              className={cx(
                "border border-(--border-subtle) bg-(--surface-muted) px-3 py-2 text-left text-(--text-secondary)",
                className
              )}
            />
          ),
          td: ({ className, ...props }) => (
            <td
              {...props}
              className={cx(
                "border border-(--border-subtle) px-3 py-2 align-top text-(--text-secondary)",
                className
              )}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
