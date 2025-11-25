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
    <div className="markdown-body space-y-3 text-sm leading-relaxed text-(--text-secondary)">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          h1: ({ className, ...props }) => (
            <h1
              {...props}
              className={cx(
                "mt-6 mb-3 text-lg font-semibold leading-tight text-(--text-primary)",
                className
              )}
            />
          ),
          h2: ({ className, ...props }) => (
            <h2
              {...props}
              className={cx(
                "mt-5 mb-3 text-base font-semibold leading-tight text-(--text-primary)",
                className
              )}
            />
          ),
          h3: ({ className, ...props }) => (
            <h3
              {...props}
              className={cx(
                "mt-4 mb-2 text-sm font-semibold text-(--text-primary)",
                className
              )}
            />
          ),
          h4: ({ className, ...props }) => (
            <h4
              {...props}
              className={cx(
                "mt-3 mb-2 text-sm font-medium text-(--text-primary)",
                className
              )}
            />
          ),
          p: ({ className, ...props }) => (
            <p
              {...props}
              className={cx(
                "mb-3 leading-relaxed text-(--text-secondary)",
                className
              )}
            />
          ),
          ul: ({ className, ...props }) => (
            <ul
              {...props}
              className={cx(
                "mb-3 ml-4 list-disc space-y-2 text-(--text-secondary)",
                className
              )}
            />
          ),
          ol: ({ className, ...props }) => (
            <ol
              {...props}
              className={cx(
                "mb-3 ml-4 list-decimal space-y-2 text-(--text-secondary)",
                className
              )}
            />
          ),
          li: ({ className, ...props }) => (
            <li
              {...props}
              className={cx("leading-relaxed text-current", className)}
            />
          ),
          blockquote: ({ className, ...props }) => (
            <blockquote
              {...props}
              className={cx(
                "my-3 border-l-2 border-(--border-subtle) pl-3 text-(--text-secondary) italic",
                className
              )}
            />
          ),
          hr: ({ className, ...props }) => (
            <hr
              {...props}
              className={cx("my-4 border-(--border-subtle)", className)}
            />
          ),
          strong: ({ className, ...props }) => (
            <strong
              {...props}
              className={cx(
                "font-semibold text-(--text-primary)",
                className
              )}
            />
          ),
          em: ({ className, ...props }) => (
            <em
              {...props}
              className={cx("text-(--text-primary) italic", className)}
            />
          ),
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
