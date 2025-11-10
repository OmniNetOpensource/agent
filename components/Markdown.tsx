"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";

type Props = {
  content: string;
};

const cx = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

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
          pre: ({ className, ...props }) => (
            <pre
              {...props}
              className={cx(
                "not-prose overflow-x-auto rounded-md border border-(--code-block-border) bg-(--code-block-bg) p-4 text-sm text-(--code-block-text)",
                className
              )}
            />
          ),
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
