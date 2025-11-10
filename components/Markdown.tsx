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
    <div className="prose prose-neutral prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          a: ({ className, ...props }) => (
            <a
              {...props}
              className={cx(
                "text-blue-600 underline underline-offset-2 hover:text-blue-700",
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
                "not-prose overflow-x-auto rounded-md border border-neutral-200 bg-[#f6f8fa] p-4 text-sm text-neutral-900",
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
                  className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-neutral-900"
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
                "border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-[var(--text-secondary)]",
                className
              )}
            />
          ),
          td: ({ className, ...props }) => (
            <td
              {...props}
              className={cx(
                "border border-neutral-200 px-3 py-2 align-top text-neutral-700",
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
